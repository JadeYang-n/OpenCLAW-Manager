use crate::services::db;
use crate::middleware::auth;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SAMLConfig {
    pub idp_entity_id: String,
    pub idp_sso_url: String,
    pub idp_certificate: String, // PEM 格式
    pub sp_entity_id: String,
    pub acs_url: String,
    pub name_id_format: String, // "email" | "persistent" | "transient"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SAMLUserInfo {
    pub email: String,
    pub name: String,
    pub groups: Vec<String>,
}

/// 获取 SAML 配置
#[tauri::command]
pub fn get_saml_config(token: String) -> Result<Option<SAMLConfig>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "saml", "view")?;
    
    get_saml_config_from_db(&conn)
}

/// 保存 SAML 配置
#[tauri::command]
pub fn save_saml_config(token: String, config: SAMLConfig) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin"], "saml", "config")?;
    
    save_saml_config_to_db(&conn, &config)?;
    
    auth::log_audit_operation(
        &conn,
        &user,
        "saml",
        "save_config",
        "H",
        "success",
        Some(&format!("{{\"idp_entity_id\": \"{}\"}}", config.idp_entity_id)),
    );
    
    Ok(())
}

/// 生成 SAML 授权请求
#[tauri::command]
pub fn generate_saml_auth_request() -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let config = get_saml_config_from_db(&conn)?
        .ok_or("SAML 配置未设置")?;
    
    // 生成 SAML AuthnRequest
    // 注意：实际实现需要 xml-rs 或 saml2 crate
    // 这里简化处理，返回重定向 URL
    
    let request_id = format!("_{}", Uuid::new_v4().simple());
    let now = chrono::Utc::now().to_rfc3339();
    
    // 简化：直接返回 IdP URL，实际应该生成 SAML XML
    let auth_url = format!(
        "{}?SAMLRequest=base64_encoded_request&SigAlg=signature_algorithm",
        config.idp_sso_url
    );
    
    // 存储 request ID 用于验证响应
    store_saml_request(&conn, &request_id, &now)?;
    
    Ok(auth_url)
}

/// 处理 SAML 响应
#[tauri::command]
pub fn handle_saml_response(saml_response: String, _relay_state: String) -> Result<auth::AuthContext, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let config = get_saml_config_from_db(&conn)?
        .ok_or("SAML 配置未设置")?;
    
    // 验证 SAML 响应签名
    // 注意：实际实现需要验证 XML 签名
    let saml_user = validate_saml_response(&saml_response, &config)?;
    
    // 检查用户是否已存在
    match get_user_by_email(&conn, &saml_user.email) {
        Some(user_id) => {
            // 用户已存在，直接登录
            let role = get_user_role(&conn, &user_id)?;
            Ok(auth::AuthContext {
                user_id,
                username: saml_user.email.clone(),
                role,
                department_id: None,
            })
        },
        None => {
            // 新用户，根据组分配角色
            let user_id = create_saml_user(&conn, &saml_user)?;
            let role = determine_role_from_groups(&saml_user.groups)?;
            Ok(auth::AuthContext {
                user_id,
                username: saml_user.email.clone(),
                role,
                department_id: None,
            })
        }
    }
}

/// 测试 SAML 连接
#[tauri::command]
pub fn test_saml_connection(token: String) -> Result<TestResult, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "saml", "test")?;
    
    let config = get_saml_config_from_db(&conn)?
        .ok_or("SAML 配置未设置")?;
    
    // 测试 IdP 连接
    let client = reqwest::blocking::Client::new();
    let response = client.get(&config.idp_sso_url).send();
    
    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok(TestResult {
                    success: true,
                    message: "IdP 连接成功".to_string(),
                })
            } else {
                Ok(TestResult {
                    success: false,
                    message: format!("IdP 返回错误状态：{}", resp.status()),
                })
            }
        },
        Err(e) => Ok(TestResult {
            success: false,
            message: format!("无法连接 IdP: {}", e),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestResult {
    pub success: bool,
    pub message: String,
}

// ==================== 辅助函数 ====================

use rusqlite::Connection;

fn get_saml_config_from_db(conn: &Connection) -> Result<Option<SAMLConfig>, String> {
    let mut stmt = conn
        .prepare("SELECT idp_entity_id, idp_sso_url, idp_certificate, sp_entity_id, acs_url, name_id_format FROM saml_configs WHERE id = 1")
        .map_err(|e| e.to_string())?;
    
    let result = stmt.query_row([], |row| {
        Ok(SAMLConfig {
            idp_entity_id: row.get(0)?,
            idp_sso_url: row.get(1)?,
            idp_certificate: row.get(2)?,
            sp_entity_id: row.get(3)?,
            acs_url: row.get(4)?,
            name_id_format: row.get(5)?,
        })
    });
    
    match result {
        Ok(config) => Ok(Some(config)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn save_saml_config_to_db(conn: &Connection, config: &SAMLConfig) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT OR REPLACE INTO saml_configs 
        (id, idp_entity_id, idp_sso_url, idp_certificate, sp_entity_id, acs_url, name_id_format)
        VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)
        "#,
        [
            &config.idp_entity_id,
            &config.idp_sso_url,
            &config.idp_certificate,
            &config.sp_entity_id,
            &config.acs_url,
            &config.name_id_format,
        ],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

fn store_saml_request(conn: &Connection, request_id: &str, timestamp: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO saml_requests (request_id, timestamp, expires_at) VALUES (?1, ?2, datetime(?3, '+5 minutes'))",
        [request_id, timestamp, timestamp],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

fn validate_saml_response(response: &str, _config: &SAMLConfig) -> Result<SAMLUserInfo, String> {
    // 注意：实际实现需要：
    // 1. 验证 XML 签名（使用 idp_certificate）
    // 2. 验证 Audience 限制
    // 3. 验证有效期
    // 4. 解析 NameID 和 Attributes
    //
    // 这里简化处理，假设验证通过
    // 实际应该使用 saml2 或 xmlsec crate
    
    // 简化：从响应中提取 email（实际需要解析 XML）
    let email = extract_email_from_saml(response)
        .ok_or("无法从 SAML 响应中提取邮箱")?;
    
    Ok(SAMLUserInfo {
        email,
        name: "SAML User".to_string(),
        groups: vec![],
    })
}

fn extract_email_from_saml(response: &str) -> Option<String> {
    // 简化实现：查找 email 属性
    // 实际需要正确解析 XML
    let start = response.find("email=\"")?;
    let rest = &response[start + 7..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn get_user_by_email(conn: &Connection, email: &str) -> Option<String> {
    let mut stmt = conn
        .prepare("SELECT id FROM users WHERE username = ?1")
        .ok()?;
    
    let user_id: String = stmt.query_row([email], |row| row.get(0)).ok()?;
    
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

fn create_saml_user(conn: &Connection, saml_user: &SAMLUserInfo) -> Result<String, String> {
    let user_id = format!("saml-{}", Uuid::new_v4().simple());
    let password_hash = bcrypt::hash(&Uuid::new_v4().to_string(), bcrypt::DEFAULT_COST)
        .map_err(|e| e.to_string())?;
    
    conn.execute(
        r#"
        INSERT INTO users (id, username, password_hash, role, created_at)
        VALUES (?1, ?2, ?3, 'employee', datetime('now'))
        "#,
        [user_id.clone(), saml_user.email.clone(), password_hash],
    ).map_err(|e| e.to_string())?;
    
    Ok(user_id)
}

fn determine_role_from_groups(groups: &[String]) -> Result<String, String> {
    // 根据 SAML 组属性分配角色
    // 简化实现：默认 employee
    // 实际应该根据组名映射
    
    if groups.iter().any(|g| g.contains("admin") || g.contains("administrator")) {
        Ok("admin".to_string())
    } else if groups.iter().any(|g| g.contains("operator") || g.contains("ops")) {
        Ok("operator".to_string())
    } else {
        Ok("employee".to_string())
    }
}
