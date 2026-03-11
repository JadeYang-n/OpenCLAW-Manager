use crate::services::db;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub role: String,
}

/// 用户登录
#[tauri::command]
pub fn login(username: String, password: String) -> Result<LoginResponse, String> {
    eprintln!("[LOGIN] 尝试登录：username={}", username);
    
    let conn = db::get_connection().map_err(|e| e.to_string())?;

    // 查询用户
    let mut stmt = conn
        .prepare("SELECT id, username, role, password_hash FROM users WHERE username = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query([username.clone()])
        .map_err(|e| e.to_string())?;

    let row = rows.next().map_err(|e| e.to_string())?;
    let user_row = match row {
        Some(r) => r,
        None => {
            eprintln!("[LOGIN] 用户不存在：{}", username);
            return Err("用户不存在".to_string());
        }
    };

    let user_id: String = user_row.get(0).map_err(|e| e.to_string())?;
    let db_username: String = user_row.get(1).map_err(|e| e.to_string())?;
    let role: String = user_row.get(2).map_err(|e| e.to_string())?;
    let password_hash: String = user_row.get(3).map_err(|e| e.to_string())?;

    eprintln!("[LOGIN] 找到用户：{} (role={})", db_username, role);
    eprintln!("[LOGIN] 密码验证：input={}, stored={}", password, password_hash);

    // 验证密码（暂时简单比较，实际应该用 bcrypt）
    // TODO: 实现 bcrypt 密码验证
    if password_hash != format!("hashed_{}", password) {
        eprintln!("[LOGIN] 密码错误");
        return Err("密码错误".to_string());
    }

    eprintln!("[LOGIN] 登录成功");

    // 更新最后登录时间
    conn.execute(
        "UPDATE users SET last_login_at = datetime('now') WHERE id = ?1",
        [user_id.clone()],
    )
    .map_err(|e| e.to_string())?;

    // 生成 JWT token（简化版本，实际应该用 jwt crate）
    let token = format!(
        "token_{}_{}_{}",
        user_id,
        Uuid::new_v4().simple(),
        Utc::now().timestamp()
    );

    // 记录审计日志
    let _ = db::log_audit(
        &conn,
        &format!("audit-{}", Uuid::new_v4().simple()),
        &user_id,
        &db_username,
        "auth",
        "login",
        "L",
        "success",
        None,
        None,
    );

    Ok(LoginResponse {
        token,
        user: UserInfo {
            id: user_id,
            username: db_username,
            role,
        },
    })
}

/// 用户登出
#[tauri::command]
pub fn logout() -> Result<(), String> {
    // JWT 是无状态的，客户端删除 token 即可
    // 这里可以记录登出日志
    Ok(())
}

/// 获取当前用户信息
#[tauri::command]
pub fn get_current_user(token: String) -> Result<UserInfo, String> {
    // TODO: 验证 token 有效性
    // 暂时返回模拟数据
    Ok(UserInfo {
        id: "admin-001".to_string(),
        username: "admin".to_string(),
        role: "admin".to_string(),
    })
}

/// 创建初始管理员账号（首次启动时调用）
#[tauri::command]
pub fn create_initial_admin() -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;

    // 检查是否已有管理员
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        .map_err(|e| e.to_string())?;
    
    let count: i64 = stmt
        .query_row([], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count > 0 {
        eprintln!("已有管理员账号，跳过创建");
        return Ok(()); // 已有管理员，不需要创建
    }

    // 创建默认管理员账号
    let admin_id = format!("admin-{}", Uuid::new_v4().simple());
    let password_hash = "hashed_admin123".to_string(); // TODO: 使用 bcrypt 加密

    eprintln!("创建初始管理员：admin / admin123");

    conn.execute(
        r#"
        INSERT INTO users (id, username, password_hash, role, created_at)
        VALUES (?1, ?2, ?3, 'admin', datetime('now'))
        "#,
        [admin_id, "admin".to_string(), password_hash],
    )
    .map_err(|e| e.to_string())?;

    // 记录审计日志
    let _ = db::log_audit(
        &conn,
        &format!("audit-{}", Uuid::new_v4().simple()),
        "system",
        "system",
        "auth",
        "create_initial_admin",
        "M",
        "success",
        None,
        None,
    );

    Ok(())
}


