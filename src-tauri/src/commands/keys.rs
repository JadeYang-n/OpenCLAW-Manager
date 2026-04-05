use crate::services::db;
use crate::crypto::{encrypt, decrypt};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ApiKey {
    pub id: String,
    pub value: String, // 加密后的值
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKeyResponse {
    pub id: String,
    pub provider: String,
    pub masked_value: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// 掩码显示密钥（仅显示前 4 和后 4 位）
fn mask_key(key: &str) -> String {
    if key.len() <= 8 {
        "***".to_string()
    } else {
        format!("{}***{}", &key[..4], &key[key.len() - 4..])
    }
}

/// 提供商元数据（硬编码）
fn _get_provider_info(provider: &str) -> (&'static str, bool) {
    match provider {
        "aliyun" => ("阿里云百炼", true),
        "zhipu" => ("智谱 AI", true),
        "deepseek" => ("DeepSeek", true),
        "volcengine" => ("火山方舟", true),
        "baidu" => ("百度千帆", true),
        "tencent" => ("腾讯混元", true),
        "iflytek" => ("讯飞星火", true),
        "openai" => ("OpenAI", false),
        _ => ("未知提供商", false),
    }
}

/// 保存 API 密钥（需要 admin 或 operator 权限）
#[tauri::command]
pub fn save_api_key(token: String, key_id: String, key_value: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 并获取用户信息
    let auth_ctx = crate::middleware::auth::verify_token(&token, &conn)?;
    
    // 检查权限：仅 admin 和 operator 可以保存 API 密钥
    crate::middleware::auth::check_permission(
        &auth_ctx.role,
        &["admin", "operator"],
        "api_key",
        "save"
    )?;
    
    // 加密密钥值（使用crypto模块的encrypt）
    let encrypted_value = encrypt(&key_value).map_err(|e| format!("Encryption failed: {}", e))?;
    
    let now = chrono::Utc::now().to_rfc3339();
    
    // 检查是否已存在
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM api_keys WHERE key_id = ?1")
        .map_err(|e| e.to_string())?;
    
    let count: i64 = stmt
        .query_row([key_id.clone()], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    
    if count > 0 {
        // 更新现有密钥
        conn.execute(
            "UPDATE api_keys SET encrypted_value = ?1, updated_at = ?2 WHERE key_id = ?3",
            [encrypted_value, now.clone(), key_id.clone()],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // 插入新密钥（自动识别 provider）
        conn.execute(
            "INSERT INTO api_keys (key_id, provider, encrypted_value, enabled, created_at, updated_at) VALUES (?1, ?2, ?3, 1, ?4, ?4)",
            [key_id.clone(), key_id.clone(), encrypted_value, now.clone()],
        )
        .map_err(|e| e.to_string())?;
    }
    
    // 记录审计日志（高风险操作）
    let audit_id = format!("audit-{}", Uuid::new_v4().simple());
    let _ = db::log_audit(
        &conn,
        &audit_id,
        &auth_ctx.user_id,
        &auth_ctx.username,
        "security",
        "save_api_key",
        "H",
        "success",
        Some(&format!("key_id={}", key_id)),
        None,
    );
    
    Ok(())
}

/// 获取 API 密钥（解密后，需要 admin 或 operator 权限）
#[tauri::command]
pub fn get_api_key(token: String, key_id: String) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 并获取用户信息
    let auth_ctx = crate::middleware::auth::verify_token(&token, &conn)?;
    
    // 检查权限：仅 admin 和 operator 可以获取 API 密钥
    crate::middleware::auth::check_permission(
        &auth_ctx.role,
        &["admin", "operator"],
        "api_key",
        "get"
    )?;
    
    let mut stmt = conn
        .prepare("SELECT encrypted_value FROM api_keys WHERE key_id = ?1")
        .map_err(|e| e.to_string())?;
    
    let encrypted_value: String = stmt
        .query_row([key_id.clone()], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    
    // 解密密钥（使用crypto模块的decrypt）
    let decrypted = decrypt(&encrypted_value).map_err(|e| format!("Decryption failed: {}", e))?;
    
    // 记录审计日志
    let audit_id = format!("audit-{}", Uuid::new_v4().simple());
    let _ = db::log_audit(
        &conn,
        &audit_id,
        &auth_ctx.user_id,
        &auth_ctx.username,
        "security",
        "get_api_key",
        "H",
        "success",
        Some(&format!("key_id={}", key_id)),
        None,
    );
    
    Ok(decrypted)
}

/// 获取所有 API 密钥列表（掩码显示，需要 admin 或 operator 权限）
#[tauri::command]
pub fn list_api_keys(token: String) -> Result<Vec<ApiKeyResponse>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 并获取用户信息
    let auth_ctx = crate::middleware::auth::verify_token(&token, &conn)?;
    
    // 检查权限：仅 admin 和 operator 可以列出 API 密钥
    crate::middleware::auth::check_permission(
        &auth_ctx.role,
        &["admin", "operator"],
        "api_key",
        "list"
    )?;
    
    let mut stmt = conn
        .prepare("SELECT key_id, provider, encrypted_value, enabled, created_at, updated_at FROM api_keys ORDER BY key_id")
        .map_err(|e| e.to_string())?;
    
    let keys = stmt
        .query_map([], |row| {
            let key_id: String = row.get(0)?;
            let provider: String = row.get(1)?;
            let encrypted_value: String = row.get(2)?;
            let enabled: i32 = row.get(3)?;
            let created_at: String = row.get(4)?;
            let updated_at: String = row.get(5)?;
            
            // 解密并掩码显示（使用crypto模块的decrypt）
            let plain_value = decrypt(&encrypted_value).unwrap_or_default();
            let masked_value = mask_key(&plain_value);
            
            Ok(ApiKeyResponse {
                id: key_id,
                provider,
                masked_value,
                enabled: enabled == 1,
                created_at,
                updated_at,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for key in keys {
        result.push(key.map_err(|e| e.to_string())?);
    }
    
    // 记录审计日志
    let audit_id = format!("audit-{}", Uuid::new_v4().simple());
    let _ = db::log_audit(
        &conn,
        &audit_id,
        &auth_ctx.user_id,
        &auth_ctx.username,
        "security",
        "list_api_keys",
        "M",
        "success",
        None,
        None,
    );
    
    Ok(result)
}

/// 删除 API 密钥（需要 admin 权限）
#[tauri::command]
pub fn delete_api_key(token: String, key_id: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token 并获取用户信息
    let auth_ctx = crate::middleware::auth::verify_token(&token, &conn)?;
    
    // 检查权限：仅 admin 可以删除 API 密钥
    crate::middleware::auth::check_permission(
        &auth_ctx.role,
        &["admin"],
        "api_key",
        "delete"
    )?;
    
    conn.execute(
        "DELETE FROM api_keys WHERE key_id = ?1",
        [key_id.clone()],
    )
    .map_err(|e| e.to_string())?;
    
    // 记录审计日志（高风险操作）
    let audit_id = format!("audit-{}", Uuid::new_v4().simple());
    let _ = db::log_audit(
        &conn,
        &audit_id,
        &auth_ctx.user_id,
        &auth_ctx.username,
        "security",
        "delete_api_key",
        "H",
        "success",
        Some(&format!("key_id={}", key_id)),
        None,
    );
    
    Ok(())
}
