use crate::services::db;
use bcrypt::verify;
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT Claims 结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,             // user_id
    pub username: String,
    pub role: String,
    pub department_id: Option<String>,
    pub exp: usize,              // 过期时间（Unix timestamp）
    pub iat: usize,              // 签发时间
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
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
#[allow(dead_code)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub role: String,
}

/// 生成 JWT token
fn generate_jwt(
    user_id: &str,
    username: &str,
    role: &str,
    department_id: Option<&str>,
) -> Result<String, String> {
    let now = Utc::now().timestamp() as usize;
    let exp = now + 30 * 60; // 30 分钟过期

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        department_id: department_id.map(|s| s.to_string()),
        exp,
        iat: now,
    };

    let master_key = crate::crypto::get_master_key();
    let encoding_key = EncodingKey::from_secret(master_key);

    encode(&Header::default(), &claims, &encoding_key)
        .map_err(|e| format!("生成 JWT 失败：{}", e))
}

/// 解析并验证 JWT token
pub fn decode_jwt(token: &str) -> Result<Claims, String> {
    let master_key = crate::crypto::get_master_key();
    let decoding_key = DecodingKey::from_secret(master_key);

    let token_data = decode::<Claims>(token, &decoding_key, &Validation::default())
        .map_err(|e| format!("JWT 验证失败：{}", e))?;

    Ok(token_data.claims)
}

/// 用户登录
#[tauri::command]
pub fn login(username: String, password: String) -> Result<LoginResponse, String> {
    eprintln!("[LOGIN] 尝试登录：username={}", username);

    let conn = db::get_connection().map_err(|e| e.to_string())?;

    // 查询用户（包含 department_id）
    let mut stmt = conn
        .prepare(
            "SELECT id, username, role, password_hash, department_id FROM users WHERE username = ?1",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query([username.clone()])
        .map_err(|e| e.to_string())?;

    let row = rows.next().map_err(|e| e.to_string())?;
    let user_row = match row {
        Some(r) => r,
        None => {
            eprintln!("[LOGIN] 用户不存在：{}", username);
            return Err("用户名或密码错误".to_string());
        }
    };

    let user_id: String = user_row.get(0).map_err(|e| e.to_string())?;
    let db_username: String = user_row.get(1).map_err(|e| e.to_string())?;
    let role: String = user_row.get(2).map_err(|e| e.to_string())?;
    let password_hash: String = user_row.get(3).map_err(|e| e.to_string())?;
    let department_id: Option<String> = user_row.get(4).map_err(|e| e.to_string())?;

    eprintln!("[LOGIN] 找到用户：{} (role={})", db_username, role);

    // 使用 bcrypt 验证密码
    // 兼容旧的 hashed_{password} 格式（过渡期）
    let password_valid = if password_hash.starts_with("hashed_") {
        eprintln!("[LOGIN] 检测到旧格式密码，进行兼容验证");
        password_hash == format!("hashed_{}", password)
    } else {
        verify(&password, &password_hash).map_err(|e| {
            eprintln!("[LOGIN] bcrypt 验证出错：{}", e);
            "密码验证失败".to_string()
        })?
    };

    if !password_valid {
        eprintln!("[LOGIN] 密码错误");
        // 记录失败审计日志
        let _ = db::log_audit(
            &conn,
            &format!("audit-{}", Uuid::new_v4().simple()),
            &user_id,
            &db_username,
            "auth",
            "login_failed",
            "M",
            "failure",
            None,
            None,
        );
        return Err("用户名或密码错误".to_string());
    }

    eprintln!("[LOGIN] 登录成功，生成 JWT");

    // 更新最后登录时间
    conn.execute(
        "UPDATE users SET last_login_at = datetime('now') WHERE id = ?1",
        [user_id.clone()],
    )
    .map_err(|e| e.to_string())?;

    // 生成标准 JWT token
    let token = generate_jwt(
        &user_id,
        &db_username,
        &role,
        department_id.as_deref(),
    )?;

    // 记录成功审计日志
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
    Ok(())
}

/// 获取当前用户信息（从 JWT token 解析）
#[tauri::command]
pub fn get_current_user(token: String) -> Result<UserInfo, String> {
    // 解析 JWT 获取 user_id
    let claims = decode_jwt(&token)?;

    // 从数据库查询最新用户信息（确保用户仍存在且角色未变）
    let conn = db::get_connection().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, username, role FROM users WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row([&claims.sub], |row| {
            Ok(UserInfo {
                id: row.get(0)?,
                username: row.get(1)?,
                role: row.get(2)?,
            })
        })
        .map_err(|_| "用户不存在或 token 已失效".to_string())?;

    Ok(result)
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
        return Ok(());
    }

    // 创建默认管理员账号
    let admin_id = format!("admin-{}", Uuid::new_v4().simple());

    // 获取环境变量 OCM_ADMIN_PASSWORD，如果没有则生成随机密码
    let admin_password = std::env::var("OCM_ADMIN_PASSWORD").unwrap_or_else(|_| {
        eprintln!("⚠️ 警告：未设置 OCM_ADMIN_PASSWORD 环境变量，使用随机密码");
        let chars: Vec<char> =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                .chars()
                .collect();
        (0..16)
            .map(|_| chars[rand::random::<usize>() % chars.len()])
            .collect::<String>()
    });

    // 使用 bcrypt 加密密码
    let password_hash = bcrypt::hash(&admin_password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("密码加密失败：{}", e))?;

    eprintln!(
        "✅ 创建初始管理员账号：admin / {}（注意：生产环境，请通过 OCM_ADMIN_PASSWORD 设置强密码）",
        if std::env::var("OCM_ADMIN_PASSWORD").is_ok() {
            "****"
        } else {
            "random"
        }
    );

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
