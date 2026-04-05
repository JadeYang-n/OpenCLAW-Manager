use crate::services::db;
use crate::middleware::auth;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 部门信息
#[derive(Debug, Serialize, Deserialize)]
pub struct DepartmentInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

/// 创建部门请求
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDepartmentRequest {
    pub name: String,
    pub description: Option<String>,
}

/// 更新部门请求
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDepartmentRequest {
    pub name: String,
    pub description: Option<String>,
}

/// 绑定实例到部门请求
#[derive(Debug, Serialize, Deserialize)]
pub struct BindInstanceRequest {
    pub instance_id: String,
    pub department_id: String,
}

/// 绑定用户到部门请求
#[derive(Debug, Serialize, Deserialize)]
pub struct BindUserRequest {
    pub user_id: String,
    pub department_id: String,
    pub is_primary: bool,
}

/// 列出所有部门
#[tauri::command]
pub fn list_departments(token: String) -> Result<Vec<DepartmentInfo>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：管理员、运维管理员、部门管理员可查看
    auth::check_permission(&user.role, &["admin", "operator", "dept_admin", "auditor"], "department", "list")?;
    
    let rows = db::list_departments(&conn).map_err(|e| e.to_string())?;
    
    let departments = rows
        .into_iter()
        .map(|(id, name, description, created_at)| DepartmentInfo {
            id,
            name,
            description,
            created_at,
        })
        .collect();
    
    Ok(departments)
}

/// 创建部门
#[tauri::command]
pub fn create_department(token: String, req: CreateDepartmentRequest) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：仅管理员可创建部门
    auth::check_permission(&user.role, &["admin"], "department", "create")?;
    
    // 生成部门 ID
    let id = format!("dept-{}", Uuid::new_v4().simple());
    
    // 创建部门
    db::create_department(&conn, &id, &req.name, req.description.as_deref().unwrap_or(""))
        .map_err(|e| format!("创建部门失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "department",
        "create",
        "M",
        "success",
        Some(&format!("{{\"name\": \"{}\", \"description\": \"{:?}\"}}", req.name, req.description)),
    );
    
    Ok(id)
}

/// 更新部门
#[tauri::command]
pub fn update_department(token: String, department_id: String, req: UpdateDepartmentRequest) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：仅管理员可更新部门
    auth::check_permission(&user.role, &["admin"], "department", "update")?;
    
    // 更新部门
    db::update_department(&conn, &department_id, &req.name, req.description.as_deref().unwrap_or(""))
        .map_err(|e| format!("更新部门失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "department",
        "update",
        "M",
        "success",
        Some(&format!("{{\"id\": \"{}\", \"name\": \"{}\"}}", department_id, req.name)),
    );
    
    Ok(())
}

/// 删除部门
#[tauri::command]
pub fn delete_department(token: String, department_id: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：仅管理员可删除部门
    auth::check_permission(&user.role, &["admin"], "department", "delete")?;
    
    // 检查是否是默认部门
    if department_id == "dept-001" {
        return Err("不能删除默认部门".to_string());
    }
    
    // 删除部门
    db::delete_department(&conn, &department_id)
        .map_err(|e| format!("删除部门失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "department",
        "delete",
        "H",
        "success",
        Some(&format!("{{\"id\": \"{}\"}}", department_id)),
    );
    
    Ok(())
}

/// 绑定实例到部门
#[tauri::command]
pub fn bind_instance_to_department(token: String, req: BindInstanceRequest) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：运维管理员及以上
    auth::check_permission(&user.role, &["admin", "operator"], "instance", "bind_department")?;
    
    // 绑定实例到部门
    db::bind_instance_to_department(&conn, &req.instance_id, &req.department_id)
        .map_err(|e| format!("绑定失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "instance",
        "bind_department",
        "M",
        "success",
        Some(&format!("{{\"instance_id\": \"{}\", \"department_id\": \"{}\"}}", req.instance_id, req.department_id)),
    );
    
    Ok(())
}

/// 从部门解绑实例
#[tauri::command]
pub fn unbind_instance_from_department(token: String, instance_id: String, department_id: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：运维管理员及以上
    auth::check_permission(&user.role, &["admin", "operator"], "instance", "unbind_department")?;
    
    // 解绑
    db::unbind_instance_from_department(&conn, &instance_id, &department_id)
        .map_err(|e| format!("解绑失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "instance",
        "unbind_department",
        "M",
        "success",
        Some(&format!("{{\"instance_id\": \"{}\", \"department_id\": \"{}\"}}", instance_id, department_id)),
    );
    
    Ok(())
}

/// 获取实例的部门列表
#[tauri::command]
pub fn get_instance_departments(token: String, instance_id: String) -> Result<Vec<DepartmentInfo>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查
    auth::check_permission(&user.role, &["admin", "operator", "dept_admin", "auditor"], "department", "list")?;
    
    let rows = db::get_instance_departments(&conn, &instance_id).map_err(|e| e.to_string())?;
    
    let departments = rows
        .into_iter()
        .map(|(id, name)| DepartmentInfo {
            id,
            name,
            description: None,
            created_at: String::new(),
        })
        .collect();
    
    Ok(departments)
}

/// 获取用户的部门列表
#[tauri::command]
pub fn get_user_departments(token: String, user_id: String) -> Result<Vec<DepartmentInfo>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：只能查看自己或本部门用户的部门
    if user.role != "admin" && user.role != "operator" && user.user_id != user_id {
        return Err("权限不足：只能查看自己的部门".to_string());
    }
    
    let rows = db::get_user_departments(&conn, &user_id).map_err(|e| e.to_string())?;
    
    let departments = rows
        .into_iter()
        .map(|(id, name, is_primary)| DepartmentInfo {
            id,
            name,
            description: None,
            created_at: if is_primary { "主部门".to_string() } else { String::new() },
        })
        .collect();
    
    Ok(departments)
}

/// 绑定用户到部门
#[tauri::command]
pub fn bind_user_to_department(token: String, req: BindUserRequest) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：管理员可绑定任何用户，部门管理员可绑定本部门用户
    if user.role != "admin" {
        return Err("权限不足：只有管理员可以管理部门成员".to_string());
    }
    
    // 绑定用户到部门
    db::add_user_to_department(&conn, &req.user_id, &req.department_id, req.is_primary)
        .map_err(|e| format!("绑定失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "user",
        "bind_department",
        "M",
        "success",
        Some(&format!("{{\"user_id\": \"{}\", \"department_id\": \"{}\", \"is_primary\": {}}}", req.user_id, req.department_id, req.is_primary)),
    );
    
    Ok(())
}

/// 从部门移除用户
#[tauri::command]
pub fn remove_user_from_department(token: String, user_id: String, department_id: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查
    if user.role != "admin" {
        return Err("权限不足：只有管理员可以管理部门成员".to_string());
    }
    
    // 解绑
    db::remove_user_from_department(&conn, &user_id, &department_id)
        .map_err(|e| format!("解绑失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "user",
        "unbind_department",
        "M",
        "success",
        Some(&format!("{{\"user_id\": \"{}\", \"department_id\": \"{}\"}}", user_id, department_id)),
    );
    
    Ok(())
}
