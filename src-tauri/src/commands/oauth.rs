use crate::services::db;
use crate::middleware::auth;
use oauth2::{
    AuthorizationCode, ClientId, ClientSecret, CsrfToken, RedirectUrl, Scope, TokenResponse,
    TokenUrl, AuthUrl,
    basic::BasicClient,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OAuthConfig {
    pub provider: String, // "github" | "google" | "azure" | "custom"
    pub client_id: String,
    pub client_secret: String,
    pub auth_url: String,
    pub token_url: String,
    pub userinfo_url: String,
    pub redirect_uri: String,
    pub scopes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthUserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
}

/// OAuth2 授权 URL 生成
#[tauri::command]
pub fn get_oauth_authorization_url(provider: String) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 从数据库获取 OAuth 配置
    let config = get_oauth_config(&conn, &provider)?;
    
    // 创建 OAuth2 客户端
    let client = BasicClient::new(
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
        AuthUrl::new(config.auth_url.clone()).map_err(|e| e.to_string())?,
        Some(TokenUrl::new(config.token_url.clone()).map_err(|e| e.to_string())?),
    )
    .set_redirect_uri(RedirectUrl::new(config.redirect_uri.clone()).map_err(|e| e.to_string())?);
    
    // 生成 CSRF token 和授权 URL
    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scopes(config.scopes.iter().map(|s| Scope::new(s.clone())).collect::<Vec<_>>())
        .url();
    
    // 存储 CSRF token 到会话（简化：存到数据库）
    store_csrf_token(&conn, &csrf_token.secret(), &provider)?;
    
    Ok(auth_url.to_string())
}

/// OAuth2 Callback 处理
#[tauri::command]
pub fn handle_oauth_callback(provider: String, code: String, state: String) -> Result<auth::AuthContext, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 CSRF token
    verify_csrf_token(&conn, &state, &provider)?;
    
    // 获取 OAuth 配置
    let config = get_oauth_config(&conn, &provider)?;
    
    // 创建 OAuth2 客户端
    let client = BasicClient::new(
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
        AuthUrl::new(config.auth_url.clone()).map_err(|e| e.to_string())?,
        Some(TokenUrl::new(config.token_url.clone()).map_err(|e| e.to_string())?),
    )
    .set_redirect_uri(RedirectUrl::new(config.redirect_uri.clone()).map_err(|e| e.to_string())?);
    
    // 交换授权码获取 access token
    let token_result = client
        .exchange_code(AuthorizationCode::new(code))
        .request_async(oauth2::reqwest::async_http_client);
    
    // 由于 tauri::command 是同步的，这里用阻塞方式
    let token = tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(token_result)
        .map_err(|e| format!("Token 交换失败：{}", e))?;
    
    // 获取用户信息
    let oauth_user = get_oauth_user_info(&config, token.access_token().secret())?;
    
    // 检查用户是否已存在
    match get_user_by_oauth_id(&conn, &provider, &oauth_user.id) {
        Some(uid) => {
            // 用户已存在，直接登录
            let role = get_user_role(&conn, &uid)?;
            let auth_user = auth::AuthContext {
                user_id: uid,
                username: oauth_user.email.clone(),
                role,
                department_id: None,
            };
            Ok(auth_user)
        },
        None => {
            // 新用户，自动创建
            let uid = create_oauth_user(&conn, &provider, &oauth_user)?;
            let auth_user = auth::AuthContext {
                user_id: uid,
                username: oauth_user.email.clone(),
                role: "employee".to_string(), // 默认角色
                department_id: None,
            };
            Ok(auth_user)
        }
    }
}

/// 保存 OAuth 配置
#[tauri::command]
pub fn save_oauth_config(token: String, config: OAuthConfig) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 和权限
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin"], "oauth", "config")?;
    
    // 保存配置到数据库
    save_oauth_config_to_db(&conn, &config)?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "oauth",
        "save_config",
        "H",
        "success",
        Some(&format!("{{\"provider\": \"{}\"}}", config.provider)),
    );
    
    Ok(())
}

/// 获取 OAuth 配置
#[tauri::command]
pub fn get_oauth_config_command(token: String, provider: String) -> Result<OAuthConfig, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 和权限
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "oauth", "view")?;
    
    get_oauth_config(&conn, &provider)
}

/// 列出所有 OAuth 配置
#[tauri::command]
pub fn list_oauth_configs(token: String) -> Result<Vec<OAuthConfig>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 和权限
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "oauth", "view")?;
    
    let mut stmt = conn
        .prepare("SELECT provider, client_id, client_secret, auth_url, token_url, userinfo_url, redirect_uri, scopes FROM oauth_configs")
        .map_err(|e| e.to_string())?;
    
    let configs = stmt
        .query_map([], |row| {
            let scopes_json: String = row.get(7)?;
            let scopes: Vec<String> = serde_json::from_str(&scopes_json).unwrap_or_default();
            
            Ok(OAuthConfig {
                provider: row.get(0)?,
                client_id: row.get(1)?,
                client_secret: row.get(2)?,
                auth_url: row.get(3)?,
                token_url: row.get(4)?,
                userinfo_url: row.get(5)?,
                redirect_uri: row.get(6)?,
                scopes,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let result: Vec<OAuthConfig> = configs
        .filter_map(|c| c.ok())
        .collect();
    
    Ok(result)
}

/// 删除 OAuth 配置
#[tauri::command]
pub fn delete_oauth_config(token: String, provider: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 和权限
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin"], "oauth", "delete")?;
    
    conn.execute(
        "DELETE FROM oauth_configs WHERE provider = ?1",
        [&provider],
    ).map_err(|e| e.to_string())?;
    
    auth::log_audit_operation(
        &conn,
        &user,
        "oauth",
        "delete_config",
        "H",
        "success",
        Some(&format!("{{\"provider\": \"{}\"}}", &provider)),
    );
    
    Ok(())
}

/// 测试 OAuth 连接
#[tauri::command]
pub fn test_oauth_connection(token: String, provider: String) -> Result<TestResult, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 和权限
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "oauth", "test")?;
    
    let config = get_oauth_config(&conn, &provider)?;
    
    // 测试连接（简化：只检查配置是否完整）
    if config.client_id.is_empty() || config.client_secret.is_empty() {
        return Ok(TestResult {
            success: false,
            message: "Client ID 或 Client Secret 未配置".to_string(),
        });
    }
    
    Ok(TestResult {
        success: true,
        message: "配置完整，可以正常使用".to_string(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestResult {
    pub success: bool,
    pub message: String,
}

// ==================== 辅助函数 ====================

fn get_oauth_config(conn: &Connection, provider: &str) -> Result<OAuthConfig, String> {
    let mut stmt = conn
        .prepare("SELECT client_id, client_secret, auth_url, token_url, userinfo_url, redirect_uri, scopes FROM oauth_configs WHERE provider = ?1")
        .map_err(|e| e.to_string())?;
    
    let row = stmt.query_row([provider], |row| {
        let scopes_json: String = row.get(6)?;
        let scopes: Vec<String> = serde_json::from_str(&scopes_json).unwrap_or_default();
        
        Ok(OAuthConfig {
            provider: provider.to_string(),
            client_id: row.get(0)?,
            client_secret: row.get(1)?,
            auth_url: row.get(2)?,
            token_url: row.get(3)?,
            userinfo_url: row.get(4)?,
            redirect_uri: row.get(5)?,
            scopes,
        })
    }).map_err(|e| {
        if e == rusqlite::Error::QueryReturnedNoRows {
            format!("OAuth 配置不存在：{}", provider)
        } else {
            e.to_string()
        }
    })?;
    
    Ok(row)
}

fn store_csrf_token(conn: &Connection, token: &str, provider: &str) -> Result<(), String> {
    let expires_at = Utc::now() + chrono::Duration::minutes(10);
    
    conn.execute(
        "INSERT INTO oauth_csrf_tokens (token, provider, expires_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![token, provider, expires_at.to_rfc3339()],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

fn verify_csrf_token(conn: &Connection, token: &str, provider: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT id FROM oauth_csrf_tokens WHERE token = ?1 AND provider = ?2 AND expires_at > datetime('now')")
        .map_err(|e| e.to_string())?;
    
    let exists = stmt.exists(rusqlite::params![token, provider]).map_err(|e| e.to_string())?;
    
    if !exists {
        return Err("CSRF token 无效或已过期".to_string());
    }
    
    // 删除已使用的 token
    conn.execute(
        "DELETE FROM oauth_csrf_tokens WHERE token = ?1",
        [token],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

fn get_oauth_user_info(config: &OAuthConfig, access_token: &str) -> Result<OAuthUserInfo, String> {
    let client = reqwest::blocking::Client::new();
    
    let response = client
        .get(&config.userinfo_url)
        .bearer_auth(access_token)
        .send()
        .map_err(|e| format!("获取用户信息失败：{}", e))?;
    
    let json: serde_json::Value = response
        .json()
        .map_err(|e| format!("解析用户信息失败：{}", e))?;
    
    Ok(OAuthUserInfo {
        id: json["id"].as_str().unwrap_or("").to_string(),
        email: json["email"].as_str().unwrap_or("").to_string(),
        name: json["name"].as_str().unwrap_or(json["login"].as_str().unwrap_or("")).to_string(),
        avatar_url: json["avatar_url"].as_str().map(|s| s.to_string()),
    })
}

fn get_user_by_oauth_id(conn: &Connection, provider: &str, oauth_id: &str) -> Option<String> {
    let mut stmt = conn
        .prepare("SELECT user_id FROM user_oauth_accounts WHERE provider = ?1 AND oauth_id = ?2")
        .ok()?;
    
    let user_id: String = stmt.query_row([provider, oauth_id], |row| row.get(0)).ok()?;
    
    Some(user_id)
}

fn get_user_role(conn: &Connection, user_id: &str) -> Result<String, String> {
    let role: String = conn
        .query_row(
            "SELECT role FROM users WHERE id = ?1",
            [user_id],
            |row| row.get(0)
        )
        .map_err(|e| e.to_string())?;
    
    Ok(role)
}

fn create_oauth_user(conn: &Connection, provider: &str, oauth_user: &OAuthUserInfo) -> Result<String, String> {
    let user_id = format!("oauth-{}", Uuid::new_v4().simple());
    let password_hash = bcrypt::hash(&Uuid::new_v4().to_string(), bcrypt::DEFAULT_COST)
        .map_err(|e| e.to_string())?;
    
    // 创建用户
    conn.execute(
        r#"
        INSERT INTO users (id, username, password_hash, role, created_at)
        VALUES (?1, ?2, ?3, 'employee', datetime('now'))
        "#,
        [user_id.clone(), oauth_user.email.clone(), password_hash],
    ).map_err(|e| e.to_string())?;
    
    // 关联 OAuth 账号
    conn.execute(
        "INSERT INTO user_oauth_accounts (user_id, provider, oauth_id, created_at) VALUES (?1, ?2, ?3, datetime('now'))",
        [user_id.clone(), provider.to_string(), oauth_user.id.clone()],
    ).map_err(|e| e.to_string())?;
    
    Ok(user_id)
}

fn save_oauth_config_to_db(conn: &Connection, config: &OAuthConfig) -> Result<(), String> {
    let scopes_json = serde_json::to_string(&config.scopes).map_err(|e| e.to_string())?;
    
    conn.execute(
        r#"
        INSERT OR REPLACE INTO oauth_configs 
        (provider, client_id, client_secret, auth_url, token_url, userinfo_url, redirect_uri, scopes)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#,
        [
            &config.provider,
            &config.client_id,
            &config.client_secret,
            &config.auth_url,
            &config.token_url,
            &config.userinfo_url,
            &config.redirect_uri,
            &scopes_json,
        ],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

use rusqlite::Connection;
