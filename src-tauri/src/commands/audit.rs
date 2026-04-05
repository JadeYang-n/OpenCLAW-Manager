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
    // 获取字段数量以确定是否包含hmac_signature
    let columns = conn.query_row(
        "PRAGMA table_info(audit_logs)",
        [],
        |row| row.get::<_, usize>(0)
    ).ok().map_or(8, |len| len); // 默认8个字段，如果有hmac_signature则为9个
    
    let rows: Result<Vec<_>, _> = if user.role == "admin" || user.role == "operator" || user.role == "auditor" {
        // 管理员、运维、审计员可以看到所有日志
        if columns >= 9 {
            // 包含hmac_signature字段
            let mut stmt = conn.prepare("SELECT id, timestamp, user_id, username, resource, operation, result, risk_level, hmac_signature FROM audit_logs ORDER BY timestamp DESC LIMIT ?1").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([limit], |row| {
                Ok((
                    row.get::<_, String>(0).unwrap_or_default(),
                    row.get::<_, String>(1).unwrap_or_default(),
                    row.get::<_, String>(2).unwrap_or_default(),
                    row.get::<_, String>(3).unwrap_or_default(),
                    row.get::<_, String>(4).unwrap_or_default(),
                    row.get::<_, String>(5).unwrap_or_default(),
                    row.get::<_, String>(6).unwrap_or_default(),
                    row.get::<_, String>(7).unwrap_or_default(),
                    row.get::<_, Option<String>>(8).ok(),
                ))
            }).map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
        } else {
            // 旧版本，不包含hmac_signature字段
            let mut stmt = conn.prepare("SELECT id, timestamp, user_id, username, resource, operation, result, risk_level FROM audit_logs ORDER BY timestamp DESC LIMIT ?1").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([limit], |row| {
                Ok((
                    row.get::<_, String>(0).unwrap_or_default(),
                    row.get::<_, String>(1).unwrap_or_default(),
                    row.get::<_, String>(2).unwrap_or_default(),
                    row.get::<_, String>(3).unwrap_or_default(),
                    row.get::<_, String>(4).unwrap_or_default(),
                    row.get::<_, String>(5).unwrap_or_default(),
                    row.get::<_, String>(6).unwrap_or_default(),
                    row.get::<_, String>(7).unwrap_or_default(),
                    None,
                ))
            }).map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
        }
    } else if user.role == "dept_admin" {
        // 部门管理员可以看到本部门和个人的日志
        if columns >= 9 {
            let mut stmt = conn.prepare("SELECT id, timestamp, user_id, username, resource, operation, result, risk_level, hmac_signature FROM audit_logs WHERE user_id IN (SELECT user_id FROM user_departments WHERE department_id IN (SELECT department_id FROM user_departments WHERE user_id = ?1)) ORDER BY timestamp DESC LIMIT ?2").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([&user.user_id, &limit.to_string()], |row| {
                Ok((
                    row.get::<_, String>(0).unwrap_or_default(),
                    row.get::<_, String>(1).unwrap_or_default(),
                    row.get::<_, String>(2).unwrap_or_default(),
                    row.get::<_, String>(3).unwrap_or_default(),
                    row.get::<_, String>(4).unwrap_or_default(),
                    row.get::<_, String>(5).unwrap_or_default(),
                    row.get::<_, String>(6).unwrap_or_default(),
                    row.get::<_, String>(7).unwrap_or_default(),
                    row.get::<_, Option<String>>(8).ok(),
                ))
            }).map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
        } else {
            let mut stmt = conn.prepare("SELECT id, timestamp, user_id, username, resource, operation, result, risk_level FROM audit_logs WHERE user_id = ?1 ORDER BY timestamp DESC LIMIT ?2").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([&user.user_id, &limit.to_string()], |row| {
                Ok((
                    row.get::<_, String>(0).unwrap_or_default(),
                    row.get::<_, String>(1).unwrap_or_default(),
                    row.get::<_, String>(2).unwrap_or_default(),
                    row.get::<_, String>(3).unwrap_or_default(),
                    row.get::<_, String>(4).unwrap_or_default(),
                    row.get::<_, String>(5).unwrap_or_default(),
                    row.get::<_, String>(6).unwrap_or_default(),
                    row.get::<_, String>(7).unwrap_or_default(),
                    None,
                ))
            }).map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
        }
    } else {
        // 普通员工只能看到自己的日志
        if columns >= 9 {
            let mut stmt = conn.prepare("SELECT id, timestamp, user_id, username, resource, operation, result, risk_level, hmac_signature FROM audit_logs WHERE user_id = ?1 ORDER BY timestamp DESC LIMIT ?2").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([&user.user_id, &limit.to_string()], |row| {
                Ok((
                    row.get::<_, String>(0).unwrap_or_default(),
                    row.get::<_, String>(1).unwrap_or_default(),
                    row.get::<_, String>(2).unwrap_or_default(),
                    row.get::<_, String>(3).unwrap_or_default(),
                    row.get::<_, String>(4).unwrap_or_default(),
                    row.get::<_, String>(5).unwrap_or_default(),
                    row.get::<_, String>(6).unwrap_or_default(),
                    row.get::<_, String>(7).unwrap_or_default(),
                    row.get::<_, Option<String>>(8).ok(),
                ))
            }).map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
        } else {
            let mut stmt = conn.prepare("SELECT id, timestamp, user_id, username, resource, operation, result, risk_level FROM audit_logs WHERE user_id = ?1 ORDER BY timestamp DESC LIMIT ?2").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([&user.user_id, &limit.to_string()], |row| {
                Ok((
                    row.get::<_, String>(0).unwrap_or_default(),
                    row.get::<_, String>(1).unwrap_or_default(),
                    row.get::<_, String>(2).unwrap_or_default(),
                    row.get::<_, String>(3).unwrap_or_default(),
                    row.get::<_, String>(4).unwrap_or_default(),
                    row.get::<_, String>(5).unwrap_or_default(),
                    row.get::<_, String>(6).unwrap_or_default(),
                    row.get::<_, String>(7).unwrap_or_default(),
                    None,
                ))
            }).map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
        }
    };
    
    let logs = rows.map(|rows| {
        rows.into_iter()
            .map(|(id, timestamp, user_id, username, resource, operation, result, risk_level, _signature)| {
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
            .collect()
    })?;
    
    Ok(logs)
}
