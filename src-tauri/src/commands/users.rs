use crate::middleware::auth;
use crate::services::db;
use bcrypt::{hash, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub role: String,
    pub department_id: Option<String>,
    pub created_at: String,
    pub last_login_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: String,
    pub department_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserRequest {
    pub username: Option<String>,
    pub role: Option<String>,
    pub department_id: Option<String>,
}

/// 列出所有用户（admin/operator/dept_admin 可访问）
#[tauri::command]
pub fn list_users(token: String) -> Result<Vec<User>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;

    // 验证 token 并获取用户上下文
    let auth_ctx = auth::verify_token(&token, &conn)?;

    // 权限检查：admin/operator/dept_admin 可访问
    auth::check_permission(
        &auth_ctx.role,
        &["admin", "operator", "dept_admin"],
        "users",
        "list",
    )?;

    // 记录审计日志
    auth::log_audit_operation(&conn, &auth_ctx, "users", "list", "L", "success", None);

    let mut stmt = conn
        .prepare(
            "SELECT id, username, role, department_id, created_at, last_login_at FROM users ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let users = stmt
        .query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                role: row.get(2)?,
                department_id: row.get(3)?,
                created_at: row.get(4)?,
                last_login_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let result: Vec<User> = users.filter_map(|u| u.ok()).collect();

    Ok(result)
}

/// 创建用户（仅 admin）
#[tauri::command]
pub fn create_user(token: String, req: CreateUserRequest) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;

    // 验证 token
    let auth_ctx = auth::verify_token(&token, &conn)?;

    // 权限检查：仅 admin 可创建用户
    auth::check_permission(&auth_ctx.role, &["admin"], "users", "create")?;

    // 校验角色有效性
    if !auth::is_valid_role(&req.role) {
        return Err(format!("无效的角色：{}", req.role));
    }

    // 检查用户名是否已存在
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM users WHERE username = ?1")
        .map_err(|e| e.to_string())?;

    let count: i64 = stmt
        .query_row([&req.username], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count > 0 {
        return Err("用户名已存在".to_string());
    }

    // 使用 bcrypt 加密密码
    let password_hash = hash(&req.password, DEFAULT_COST).map_err(|e| e.to_string())?;

    let user_id = format!("user-{}", Uuid::new_v4().simple());

    conn.execute(
        r#"
        INSERT INTO users (id, username, password_hash, role, department_id, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        "#,
        [
            user_id.clone(),
            req.username.clone(),
            password_hash,
            req.role.clone(),
            req.department_id.clone().unwrap_or_default(),
        ],
    )
    .map_err(|e| e.to_string())?;

    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &auth_ctx,
        "users",
        "create_user",
        "M",
        "success",
        Some(&format!("created user: {}, role: {}", req.username, req.role)),
    );

    Ok(user_id)
}

/// 更新用户（仅 admin）
#[tauri::command]
pub fn update_user(token: String, user_id: String, req: UpdateUserRequest) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;

    // 验证 token
    let auth_ctx = auth::verify_token(&token, &conn)?;

    // 权限检查：仅 admin 可更新用户
    auth::check_permission(&auth_ctx.role, &["admin"], "users", "update")?;

    // 校验角色有效性（若有更新）
    if let Some(ref role) = req.role {
        if !auth::is_valid_role(role) {
            return Err(format!("无效的角色：{}", role));
        }
    }

    // 构建动态 SQL
    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(username) = req.username {
        updates.push("username = ?");
        params.push(username);
    }

    if let Some(role) = req.role {
        updates.push("role = ?");
        params.push(role);
    }

    if let Some(department_id) = req.department_id {
        updates.push("department_id = ?");
        params.push(department_id);
    }

    if updates.is_empty() {
        return Ok(());
    }

    params.push(user_id.clone());

    let sql = format!("UPDATE users SET {} WHERE id = ?", updates.join(", "));

    conn.execute(&sql, rusqlite::params_from_iter(params.iter()))
        .map_err(|e| e.to_string())?;

    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &auth_ctx,
        "users",
        "update_user",
        "M",
        "success",
        Some(&format!("updated user_id: {}", user_id)),
    );

    Ok(())
}

/// 删除用户（仅 admin，且不能删除自己）
#[tauri::command]
pub fn delete_user(token: String, user_id: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;

    // 验证 token
    let auth_ctx = auth::verify_token(&token, &conn)?;

    // 权限检查：仅 admin 可删除用户
    auth::check_permission(&auth_ctx.role, &["admin"], "users", "delete")?;

    // 不能删除自己
    if auth_ctx.user_id == user_id {
        auth::log_audit_operation(
            &conn,
            &auth_ctx,
            "users",
            "delete_user",
            "H",
            "failure",
            Some("attempted to delete self"),
        );
        return Err("不能删除当前登录的账号".to_string());
    }

    conn.execute("DELETE FROM users WHERE id = ?1", [user_id.clone()])
        .map_err(|e| e.to_string())?;

    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &auth_ctx,
        "users",
        "delete_user",
        "H",
        "success",
        Some(&format!("deleted user_id: {}", user_id)),
    );

    Ok(())
}
