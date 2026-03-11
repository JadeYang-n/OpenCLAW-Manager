use crate::services::db;
use crate::middleware::auth;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLogInfo {
    pub id: String,
    pub timestamp: String,
    pub user_id: String,
    pub username: String,
    pub resource: String,
    pub operation: String,
    pub result: String,
    pub risk_level: String,
}

/// 列出审计日志（支持部门数据隔离）
#[tauri::command]
pub fn list_audit_logs(token: String, limit: i32) -> Result<Vec<AuditLogInfo>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查
    auth::check_permission(&user.role, &["admin", "operator", "dept_admin", "auditor", "employee"], "audit_log", "list")?;
    
    // 数据隔离：根据角色过滤日志
    let rows = if user.role == "admin" || user.role == "operator" || user.role == "auditor" {
        // 管理员、运维、审计员可以看到所有日志
        db::list_audit_logs(&conn, limit).map_err(|e| e.to_string())?
    } else if user.role == "dept_admin" {
        // 部门管理员可以看到本部门和个人的日志
        db::list_audit_logs_by_user(&conn, &user.user_id, limit).map_err(|e| e.to_string())?
    } else {
        // 普通员工只能看到自己的日志
        db::list_audit_logs_by_user_id(&conn, &user.user_id, limit).map_err(|e| e.to_string())?
    };
    
    let logs = rows
        .into_iter()
        .map(|(id, timestamp, user_id, username, resource, operation, result, risk_level)| {
            AuditLogInfo {
                id,
                timestamp,
                user_id,
                username,
                resource,
                operation,
                result,
                risk_level,
            }
        })
        .collect();
    
    Ok(logs)
}
