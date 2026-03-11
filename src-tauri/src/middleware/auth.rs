use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthContext {
    pub user_id: String,
    pub username: String,
    pub role: String,
}

/// 验证 token 并获取用户信息
pub fn verify_token(token: &str, conn: &Connection) -> Result<AuthContext, String> {
    // 简化验证：token 格式为 "token_{user_id}_{uuid}_{timestamp}"
    if !token.starts_with("token_") {
        return Err("无效的 token 格式".to_string());
    }
    
    let parts: Vec<&str> = token.split('_').collect();
    if parts.len() < 4 {
        return Err("无效的 token 结构".to_string());
    }
    
    let user_id = parts[1];
    
    // 从数据库查询用户
    let mut stmt = conn
        .prepare("SELECT id, username, role FROM users WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let mut rows = stmt
        .query([user_id.to_string()])
        .map_err(|e| e.to_string())?;
    
    let row = rows.next().map_err(|e| e.to_string())?;
    let user_row = row.ok_or("用户不存在或 token 已失效")?;
    
    let id: String = user_row.get(0).map_err(|e| e.to_string())?;
    let username: String = user_row.get(1).map_err(|e| e.to_string())?;
    let role: String = user_row.get(2).map_err(|e| e.to_string())?;
    
    Ok(AuthContext {
        user_id: id,
        username,
        role,
    })
}

/// 检查用户是否有指定权限
pub fn has_permission(role: &str, required_roles: &[&str]) -> bool {
    // 超级管理员拥有所有权限
    if role == "admin" {
        return true;
    }
    
    required_roles.contains(&role)
}

/// 检查角色是否有效
pub fn is_valid_role(role: &str) -> bool {
    matches!(role, "admin" | "operator" | "dept_admin" | "employee" | "auditor")
}

/// 记录操作审计日志
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
    
    let _ = crate::services::db::log_audit(
        conn,
        &audit_id,
        &user.user_id,
        &user.username,
        resource,
        operation,
        risk_level,
        result,
        details,
        None,
    );
}

/// 权限检查辅助函数（用于命令内部）
pub fn check_permission(role: &str, required_roles: &[&str], resource: &str, operation: &str) -> Result<(), String> {
    if has_permission(role, required_roles) {
        Ok(())
    } else {
        Err(format!("权限不足：{} 无法执行 {} 操作", role, operation))
    }
}
