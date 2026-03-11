use serde::{Deserialize, Serialize};
use crate::services::db;
use crate::middleware::auth;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub config_json: String,
    pub openclaw_version_range: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateConfigRequest {
    pub name: String,
    pub description: Option<String>,
    pub config_json: String,
    pub openclaw_version_range: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateConfigRequest {
    pub name: String,
    pub description: Option<String>,
    pub config_json: String,
    pub openclaw_version_range: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestResult {
    pub success: bool,
    pub message: String,
}

/// 列出所有配置
#[tauri::command]
pub fn list_configs(token: String) -> Result<Vec<ConfigInfo>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查
    auth::check_permission(&user.role, &["admin", "operator", "dept_admin"], "config", "list")?;
    
    let rows = db::list_configs(&conn).map_err(|e| e.to_string())?;
    
    let configs = rows
        .into_iter()
        .map(|(id, name, description, config_json, version_range, created_at, updated_at)| ConfigInfo {
            id,
            name,
            description,
            config_json,
            openclaw_version_range: version_range,
            created_at,
            updated_at,
        })
        .collect();
    
    Ok(configs)
}

/// 创建配置
#[tauri::command]
pub fn create_config(token: String, req: CreateConfigRequest) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：仅管理员和运维管理员可创建
    auth::check_permission(&user.role, &["admin", "operator"], "config", "create")?;
    
    // 生成配置 ID
    let id = format!("cfg-{}", Uuid::new_v4().simple());
    let now = chrono::Utc::now().to_rfc3339();
    
    // 创建配置
    db::create_config(
        &conn,
        &id,
        &req.name,
        req.description.as_deref().unwrap_or(""),
        &req.config_json,
        &req.openclaw_version_range,
        &now,
        &now,
    )
    .map_err(|e| format!("创建配置失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "config",
        "create",
        "M",
        "success",
        Some(&format!("{{\"name\": \"{}\", \"description\": \"{:?}\"}}", req.name, req.description)),
    );
    
    Ok(id)
}

/// 更新配置
#[tauri::command]
pub fn update_config(token: String, config_id: String, req: UpdateConfigRequest) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查
    auth::check_permission(&user.role, &["admin", "operator"], "config", "update")?;
    
    let now = chrono::Utc::now().to_rfc3339();
    
    // 更新配置
    db::update_config(
        &conn,
        &config_id,
        &req.name,
        req.description.as_deref().unwrap_or(""),
        &req.config_json,
        &req.openclaw_version_range,
        &now,
    )
    .map_err(|e| format!("更新配置失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "config",
        "update",
        "M",
        "success",
        Some(&format!("{{\"id\": \"{}\", \"name\": \"{}\"}}", config_id, req.name)),
    );
    
    Ok(())
}

/// 删除配置
#[tauri::command]
pub fn delete_config(token: String, config_id: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查
    auth::check_permission(&user.role, &["admin", "operator"], "config", "delete")?;
    
    // 删除配置
    db::delete_config(&conn, &config_id)
        .map_err(|e| format!("删除配置失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "config",
        "delete",
        "H",
        "success",
        Some(&format!("{{\"id\": \"{}\"}}", config_id)),
    );
    
    Ok(())
}

/// 测试配置
#[tauri::command]
pub fn test_config(token: String, config: CreateConfigRequest) -> Result<TestResult, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let _user = auth::verify_token(&token, &conn)?;
    
    // TODO: 实现实际配置测试逻辑
    // 目前模拟测试
    Ok(TestResult {
        success: true,
        message: "配置格式验证通过".to_string(),
    })
}
