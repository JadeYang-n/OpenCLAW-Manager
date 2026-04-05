use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex::encode;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthContext {
    pub user_id: String,
    pub username: String,
    pub role: String,
    pub department_id: Option<String>,
}

/// 验证 JWT token 并获取用户信息
pub fn verify_token(token: &str, _conn: &Connection) -> Result<AuthContext, String> {
    // 使用 JWT 解析（兼容旧格式 token_ 前缀）
    if token.starts_with("token_") {
        // 兼容旧格式：从数据库查询（过渡期支持）
        let parts: Vec<&str> = token.splitn(4, '_').collect();
        if parts.len() < 2 {
            return Err("无效的 token 结构".to_string());
        }
        let user_id = parts[1];
        let mut stmt = _conn
            .prepare("SELECT id, username, role, department_id FROM users WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([user_id]).map_err(|e| e.to_string())?;
        let row = rows.next().map_err(|e| e.to_string())?;
        let user_row = row.ok_or("用户不存在或 token 已失效")?;
        let id: String = user_row.get(0).map_err(|e| e.to_string())?;
        let username: String = user_row.get(1).map_err(|e| e.to_string())?;
        let role: String = user_row.get(2).map_err(|e| e.to_string())?;
        let department_id: Option<String> = user_row.get(3).map_err(|e| e.to_string())?;
        return Ok(AuthContext {
            user_id: id,
            username,
            role,
            department_id,
        });
    }

    // 标准 JWT 验证
    let claims = crate::commands::auth::decode_jwt(token)?;

    // 验证 token 是否过期（decode_jwt 中 Validation::default() 已自动检查）
    Ok(AuthContext {
        user_id: claims.sub,
        username: claims.username,
        role: claims.role,
        department_id: claims.department_id,
    })
}

/// 检查用户是否有指定权限（RBAC）
/// 支持 4 参数格式（资源、操作参数仅用于日志）
pub fn check_permission(
    role: &str,
    required_roles: &[&str],
    _resource: &str,
    _operation: &str,
) -> Result<(), String> {
    // 无特定角色要求，直接放行
    if required_roles.is_empty() {
        return Ok(());
    }

    // admin 角色拥有所有权限
    if role == "admin" {
        return Ok(());
    }

    // 检查当前角色是否在允许列表中
    if required_roles.contains(&role) {
        return Ok(());
    }

    Err(format!(
        "权限不足：需要 {:?} 角色，当前角色为 {}",
        required_roles, role
    ))
}

/// 检查用户是否有指定权限（bool 版本）
pub fn _has_permission(role: &str, required_roles: &[&str]) -> bool {
    check_permission(role, required_roles, "", "").is_ok()
}

/// 检查角色是否有效
pub fn is_valid_role(role: &str) -> bool {
    matches!(
        role,
        "admin" | "operator" | "dept_admin" | "employee" | "auditor"
    )
}

/// 记录操作审计日志（带HMAC签名）
pub fn log_audit_operation(
    conn: &Connection,
    user: &AuthContext,
    resource: &str,
    operation: &str,
    risk_level: &str,
    result: &str,
    details: Option<&str>,
) {
    let audit_id = format!("audit-{}", uuid::Uuid::new_v4().simple());
    let timestamp = chrono::Utc::now().to_rfc3339();

    // 生成审计日志数据（不含签名）
    let log_data = format!(
        r#"{{"id":"{}","timestamp":"{}","user_id":"{}","username":"{}","resource":"{}","operation":"{}","risk_level":"{}","result":"{}"}}"#,
        audit_id,
        timestamp,
        user.user_id,
        user.username,
        resource,
        operation,
        risk_level,
        result
    );

    // 生成HMAC签名
    let signature = generate_audit_signature(&log_data).unwrap_or_default();

    let _ = crate::services::db::log_audit_with_signature(
        conn,
        &audit_id,
        &timestamp,
        &user.user_id,
        &user.username,
        resource,
        operation,
        risk_level,
        result,
        details,
        None,
        &signature,
    );
}

/// 生成审计日志HMAC签名
fn generate_audit_signature(log_data: &str) -> Result<String, String> {
    let master_key = crate::crypto::get_master_key();
    let mut mac = HmacSha256::new_from_slice(master_key).map_err(|_| "HMAC初始化失败")?;
    mac.update(log_data.as_bytes());
    Ok(encode(mac.finalize().into_bytes()))
}

/// 验证审计日志完整性
pub fn _verify_audit_signature(_log_data: &str, _signature: &str) -> Result<bool, String> {
    let expected_signature = generate_audit_signature(_log_data)?;
    Ok(expected_signature == _signature)
}
