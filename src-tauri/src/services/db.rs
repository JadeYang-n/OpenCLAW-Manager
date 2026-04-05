use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::env;

pub fn get_db_path() -> PathBuf {
    // 使用项目根目录的 data 文件夹（不在 src-tauri 内，避免触发重建）
    let mut path = env::current_dir().unwrap();
    
    // 向后遍历找到项目根目录（寻找 Cargo.toml）
    while !path.join("Cargo.toml").exists() {
        if !path.pop() {
            // 如果找不到，使用当前目录
            path = env::current_dir().unwrap();
            break;
        }
    }
    
    // 退到项目根目录
    path.pop();
    
    // 创建 data 文件夹
    path.push("data");
    std::fs::create_dir_all(&path).unwrap();
    path.push("ocm.db");
    path
}

pub fn init_db() -> Result<Connection> {
    let db_path = get_db_path();
    let conn = Connection::open(db_path)?;
    
    // 创建实例表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS instances (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            endpoint TEXT NOT NULL,
            api_key_encrypted TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'offline',
            version TEXT,
            last_heartbeat INTEGER,
            metadata_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
        []
    )?;
    
    // 创建配置表（新 schema）
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS configs_new (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            config_json TEXT NOT NULL,
            openclaw_version_range TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        []
    )?;
    
    // 迁移旧数据（如果存在旧表）
    conn.execute(
        r#"
        INSERT OR IGNORE INTO configs_new (id, name, description, config_json, openclaw_version_range, created_at, updated_at)
        SELECT 
            CASE WHEN id IS NOT NULL THEN 'cfg-' || id ELSE 'cfg-' || hex(randomblob(16)) END,
            name,
            '' as description,
            config_json,
            openclaw_version_range,
            created_at,
            updated_at
        FROM configs
        "#,
        []
    ).ok(); // 忽略错误（如果旧表不存在）
    
    // 删除旧表
    conn.execute("DROP TABLE IF EXISTS configs", []).ok();
    
    // 重命名新表
    conn.execute("ALTER TABLE configs_new RENAME TO configs", []).ok();
    
    // 创建 token 记录表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS token_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            instance_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER NOT NULL,
            completion_tokens INTEGER NOT NULL,
            total_tokens INTEGER NOT NULL,
            cost REAL NOT NULL
        )
        "#,
        []
    )?;
    
    // 创建预算表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS budget (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            daily REAL NOT NULL,
            monthly REAL NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        []
    )?;
    
    // 创建用户表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'employee',
            two_factor_secret TEXT,
            two_factor_enabled INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_login_at TEXT
        )
        "#,
        []
    )?;
    
    // 创建审计日志表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            resource TEXT NOT NULL,
            resource_id TEXT,
            operation TEXT NOT NULL,
            risk_level TEXT NOT NULL DEFAULT 'M',
            details_json TEXT,
            result TEXT NOT NULL,
            error_message TEXT,
            hmac_signature TEXT
        )
        "#,
        []
    )?;
    
    // 初始化预算数据
    conn.execute(
        r#"
        INSERT OR IGNORE INTO budget (daily, monthly, updated_at) VALUES (10.0, 100.0, datetime('now'))
        "#,
        []
    )?;
    
    // 创建默认管理员账号（密码：admin123，实际应该首次启动时生成）
    conn.execute(
        r#"
        INSERT OR IGNORE INTO users (id, username, password_hash, role) 
        VALUES ('admin-001', 'admin', 'hashed_admin123', 'admin')
        "#,
        []
    )?;
    
    // ==================== Phase 2: 部门隔离 ====================
    
    // 创建部门表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
        []
    )?;
    
    // 创建用户 - 部门关联表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS user_departments (
            user_id TEXT NOT NULL,
            department_id TEXT NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0,  -- 是否为主部门
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (user_id, department_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (department_id) REFERENCES departments(id)
        )
        "#,
        []
    )?;
    
    // 创建实例 - 部门关联表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS instance_departments (
            instance_id TEXT NOT NULL,
            department_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (instance_id, department_id),
            FOREIGN KEY (instance_id) REFERENCES instances(id),
            FOREIGN KEY (department_id) REFERENCES departments(id)
        )
        "#,
        []
    )?;
    
    // 创建实例 - 配置关联表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS instance_configs (
            instance_id TEXT NOT NULL,
            config_id TEXT NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (instance_id, config_id),
            FOREIGN KEY (instance_id) REFERENCES instances(id),
            FOREIGN KEY (config_id) REFERENCES configs(id)
        )
        "#,
        []
    )?;
    
    // 创建实例 - Skills 关联表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS instance_skills (
            instance_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (instance_id, skill_id),
            FOREIGN KEY (instance_id) REFERENCES instances(id)
        )
        "#,
        []
    )?;
    
    // 创建全局 Skills 安装表
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS skills_installed (
            skill_id TEXT PRIMARY KEY,
            version TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            installed_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
        []
    )?;
    
    // 更新 users 表，添加 department_id 字段（主部门）
    // 注意：SQLite 添加列需要特殊处理
    conn.execute(
        r#"
        ALTER TABLE users ADD COLUMN department_id TEXT
        "#,
        []
    ).ok(); // 忽略错误（如果列已存在）
    
    // 创建默认部门
    conn.execute(
        r#"
        INSERT OR IGNORE INTO departments (id, name, description) 
        VALUES ('dept-001', '默认部门', '系统默认部门')
        "#,
        []
    )?;
    
    Ok(conn)
}

pub fn get_connection() -> Result<Connection> {
    let db_path = get_db_path();
    Connection::open(db_path)
}

/// 初始化数据库并执行迁移（用于 Tauri 端）
pub fn init_db_and_migrate() -> Result<()> {
    let conn = get_connection()?;
    
    // 创建所有必要的表
    conn.execute_batch(
        r#"
        -- 创建审计日志表（带HMAC签名）
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            resource TEXT NOT NULL,
            resource_id TEXT,
            operation TEXT NOT NULL,
            risk_level TEXT NOT NULL DEFAULT 'M',
            details_json TEXT,
            result TEXT NOT NULL,
            error_message TEXT,
            hmac_signature TEXT
        )
        "#,
    )?;
    
    Ok(())
}

/// 带HMAC签名的审计日志记录
pub fn log_audit_with_signature(
    conn: &Connection,
    id: &str,
    timestamp: &str,
    user_id: &str,
    username: &str,
    resource: &str,
    operation: &str,
    risk_level: &str,
    result: &str,
    details_json: Option<&str>,
    error_message: Option<&str>,
    signature: &str,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO audit_logs (id, timestamp, user_id, username, resource, operation, risk_level, details_json, result, error_message, hmac_signature)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        "#,
        [id, timestamp, user_id, username, resource, operation, risk_level, details_json.unwrap_or("{}"), result, error_message.unwrap_or(""), signature],
    )?;
    Ok(())
}

// ==================== 实例管理 ====================

pub fn create_instance(
    conn: &Connection,
    id: &str,
    name: &str,
    endpoint: &str,
    api_key_encrypted: &str,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO instances (id, name, endpoint, api_key_encrypted, status, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, 'offline', datetime('now'), datetime('now'))
        "#,
        [id, name, endpoint, api_key_encrypted],
    )?;
    Ok(())
}

pub fn list_instances(conn: &Connection) -> Result<Vec<(String, String, String, String, String, Option<i64>, String)>> {
    let mut stmt = conn.prepare("SELECT id, name, endpoint, status, COALESCE(version, ''), last_heartbeat, created_at FROM instances ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, Option<i64>>(5)?,
            row.get::<_, String>(6)?,
        ))
    })?;
    
    let mut instances = Vec::new();
    for row in rows {
        instances.push(row?);
    }
    Ok(instances)
}

/// 按部门过滤实例列表（数据隔离）
pub fn list_instances_by_departments(
    conn: &Connection,
    department_ids: &[String]
) -> Result<Vec<(String, String, String, String, String, Option<i64>, String)>> {
    if department_ids.is_empty() {
        return Ok(Vec::new());
    }
    
    // 构建 IN 子句的占位符
    let placeholders = department_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
        "SELECT i.id, i.name, i.endpoint, i.status, COALESCE(i.version, ''), i.last_heartbeat, i.created_at \
         FROM instances i \
         JOIN instance_departments id ON i.id = id.instance_id \
         WHERE id.department_id IN ({}) \
         ORDER BY i.created_at DESC",
        placeholders
    );
    
    let mut stmt = conn.prepare(&query)?;
    
    // 使用 rusqlite 的 params_from_iter 直接传递参数
    let params: Vec<&String> = department_ids.iter().collect();
    
    let rows = stmt.query_map(rusqlite::params_from_iter(params.iter()), |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, Option<i64>>(5)?,
            row.get::<_, String>(6)?,
        ))
    })?;
    
    let mut instances = Vec::new();
    for row in rows {
        instances.push(row?);
    }
    Ok(instances)
}

pub fn update_instance_status(conn: &Connection, id: &str, status: &str, version: Option<&str>) -> Result<()> {
    conn.execute(
        r#"
        UPDATE instances 
        SET status = ?1, version = ?2, last_heartbeat = strftime('%s', 'now'), updated_at = datetime('now')
        WHERE id = ?3
        "#,
        [status, version.unwrap_or(""), id],
    )?;
    Ok(())
}

pub fn get_instance(conn: &Connection, id: &str) -> Result<Option<(String, String, String, String, String, Option<String>, Option<i64>)>> {
    let mut stmt = conn.prepare("SELECT id, name, endpoint, api_key_encrypted, status, version, last_heartbeat FROM instances WHERE id = ?1")?;
    let mut rows = stmt.query([id])?;
    
    if let Some(row) = rows.next()? {
        Ok(Some((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<i64>>(6)?,
        )))
    } else {
        Ok(None)
    }
}

pub fn delete_instance(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM instances WHERE id = ?1", [id])?;
    Ok(())
}

// ==================== 审计日志 ====================

pub fn log_audit(
    conn: &Connection,
    id: &str,
    user_id: &str,
    username: &str,
    resource: &str,
    operation: &str,
    risk_level: &str,
    result: &str,
    details_json: Option<&str>,
    error_message: Option<&str>,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO audit_logs (id, user_id, username, resource, operation, risk_level, details_json, result, error_message, timestamp)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
        "#,
        [id, user_id, username, resource, operation, risk_level, details_json.unwrap_or("{}"), result, error_message.unwrap_or("")],
    )?;
    Ok(())
}

pub fn list_audit_logs(conn: &Connection, limit: i32) -> Result<Vec<(String, String, String, String, String, String, String, String)>> {
    let mut stmt = conn.prepare("SELECT id, timestamp, user_id, username, resource, operation, result, risk_level FROM audit_logs ORDER BY timestamp DESC LIMIT ?1")?;
    let rows = stmt.query_map([limit], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, String>(7)?,
        ))
    })?;
    
    let mut logs = Vec::new();
    for row in rows {
        logs.push(row?);
    }
    Ok(logs)
}

/// 按用户 ID 过滤审计日志（员工只能看自己的）
pub fn list_audit_logs_by_user_id(conn: &Connection, user_id: &str, limit: i32) -> Result<Vec<(String, String, String, String, String, String, String, String)>> {
    let limit_str = limit.to_string();
    let mut stmt = conn.prepare("SELECT id, timestamp, user_id, username, resource, operation, result, risk_level FROM audit_logs WHERE user_id = ?1 ORDER BY timestamp DESC LIMIT ?2")?;
    let rows = stmt.query_map([user_id, &limit_str], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, String>(7)?,
        ))
    })?;
    
    let mut logs = Vec::new();
    for row in rows {
        logs.push(row?);
    }
    Ok(logs)
}

/// 按部门过滤审计日志（部门管理员可以看本部门用户的）
pub fn list_audit_logs_by_user(conn: &Connection, user_id: &str, limit: i32) -> Result<Vec<(String, String, String, String, String, String, String, String)>> {
    // 获取用户的部门 ID 列表
    let dept_ids = get_user_accessible_departments(conn, user_id, "dept_admin")?;
    
    if dept_ids.is_empty() {
        // 如果没有部门，只看自己的
        return list_audit_logs_by_user_id(conn, user_id, limit);
    }
    
    // 获取部门的所有用户 ID
    let placeholders = dept_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
        "SELECT id, timestamp, user_id, username, resource, operation, result, risk_level \
         FROM audit_logs \
         WHERE user_id IN (SELECT user_id FROM user_departments WHERE department_id IN ({})) \
         OR user_id = ? \
         ORDER BY timestamp DESC LIMIT ?",
        placeholders
    );
    
    let mut stmt = conn.prepare(&query)?;
    let params: Vec<&String> = dept_ids.iter().collect();
    let mut all_params: Vec<&str> = params.iter().map(|s| s.as_str()).collect();
    all_params.push(user_id);
    let limit_str = limit.to_string();
    all_params.push(&limit_str);
    
    let rows = stmt.query_map(rusqlite::params_from_iter(all_params.iter()), |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, String>(7)?,
        ))
    })?;
    
    let mut logs = Vec::new();
    for row in rows {
        logs.push(row?);
    }
    Ok(logs)
}

// ==================== Phase 2: 部门管理 ====================

/// 创建部门
pub fn create_department(
    conn: &Connection,
    id: &str,
    name: &str,
    description: &str,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO departments (id, name, description, created_at, updated_at)
        VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))
        "#,
        [id, name, description],
    )?;
    Ok(())
}

/// 列出所有部门
pub fn list_departments(conn: &Connection) -> Result<Vec<(String, String, Option<String>, String)>> {
    let mut stmt = conn.prepare("SELECT id, name, description, created_at FROM departments ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, String>(3)?,
        ))
    })?;
    
    let mut departments = Vec::new();
    for row in rows {
        departments.push(row?);
    }
    Ok(departments)
}

/// 获取部门详情
pub fn get_department(conn: &Connection, id: &str) -> Result<Option<(String, String, Option<String>, String)>> {
    let mut stmt = conn.prepare("SELECT id, name, description, created_at FROM departments WHERE id = ?1")?;
    let mut rows = stmt.query([id])?;
    
    if let Some(row) = rows.next()? {
        Ok(Some((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, String>(3)?,
        )))
    } else {
        Ok(None)
    }
}

/// 更新部门
pub fn update_department(conn: &Connection, id: &str, name: &str, description: &str) -> Result<()> {
    conn.execute(
        r#"
        UPDATE departments 
        SET name = ?1, description = ?2, updated_at = datetime('now')
        WHERE id = ?3
        "#,
        [name, description, id],
    )?;
    Ok(())
}

/// 删除部门
pub fn delete_department(conn: &Connection, id: &str) -> Result<()> {
    // 先删除关联关系
    conn.execute("DELETE FROM instance_departments WHERE department_id = ?1", [id])?;
    conn.execute("DELETE FROM user_departments WHERE department_id = ?1", [id])?;
    // 删除部门
    conn.execute("DELETE FROM departments WHERE id = ?1", [id])?;
    Ok(())
}

/// 将用户添加到部门
pub fn add_user_to_department(
    conn: &Connection,
    user_id: &str,
    department_id: &str,
    is_primary: bool,
) -> Result<()> {
    // 如果是主部门，先取消该用户的其他主部门设置
    if is_primary {
        conn.execute(
            "UPDATE user_departments SET is_primary = 0 WHERE user_id = ?1",
        rusqlite::params![user_id],
        )?;
    }
    
    let is_primary_int: i32 = if is_primary { 1 } else { 0 };
    conn.execute(
        r#"
        INSERT OR REPLACE INTO user_departments (user_id, department_id, is_primary, created_at)
        VALUES (?1, ?2, ?3, datetime('now'))
        "#,
        rusqlite::params![user_id, department_id, is_primary_int],
    )?;
    Ok(())
}

/// 从部门移除用户
pub fn remove_user_from_department(conn: &Connection, user_id: &str, department_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM user_departments WHERE user_id = ?1 AND department_id = ?2",
        [user_id, department_id],
    )?;
    Ok(())
}

/// 获取用户的部门列表
pub fn get_user_departments(conn: &Connection, user_id: &str) -> Result<Vec<(String, String, bool)>> {
    let mut stmt = conn.prepare(
        "SELECT d.id, d.name, ud.is_primary FROM departments d 
         JOIN user_departments ud ON d.id = ud.department_id 
         WHERE ud.user_id = ?1"
    )?;
    let rows = stmt.query_map([user_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i32>(2)? != 0,
        ))
    })?;
    
    let mut departments = Vec::new();
    for row in rows {
        departments.push(row?);
    }
    Ok(departments)
}

/// 将实例绑定到部门
pub fn bind_instance_to_department(
    conn: &Connection,
    instance_id: &str,
    department_id: &str,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT OR REPLACE INTO instance_departments (instance_id, department_id, created_at)
        VALUES (?1, ?2, datetime('now'))
        "#,
        [instance_id, department_id],
    )?;
    Ok(())
}

/// 从部门解绑实例
pub fn unbind_instance_from_department(conn: &Connection, instance_id: &str, department_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM instance_departments WHERE instance_id = ?1 AND department_id = ?2",
        [instance_id, department_id],
    )?;
    Ok(())
}

/// 获取实例的部门列表
pub fn get_instance_departments(conn: &Connection, instance_id: &str) -> Result<Vec<(String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT d.id, d.name FROM departments d 
         JOIN instance_departments id ON d.id = id.department_id 
         WHERE id.instance_id = ?1"
    )?;
    let rows = stmt.query_map([instance_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
        ))
    })?;
    
    let mut departments = Vec::new();
    for row in rows {
        departments.push(row?);
    }
    Ok(departments)
}

/// 获取部门的实例列表
pub fn get_department_instances(conn: &Connection, department_id: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT instance_id FROM instance_departments WHERE department_id = ?1"
    )?;
    let rows = stmt.query_map([department_id], |row| {
        Ok(row.get::<_, String>(0)?)
    })?;
    
    let mut instances = Vec::new();
    for row in rows {
        instances.push(row?);
    }
    Ok(instances)
}

// ==================== 配置管理 ====================

/// 列出所有配置
pub fn list_configs(conn: &Connection) -> Result<Vec<(String, String, Option<String>, String, String, String, String)>> {
    let mut stmt = conn.prepare("SELECT id, name, description, config_json, openclaw_version_range, created_at, updated_at FROM configs ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
        ))
    })?;
    
    let mut configs = Vec::new();
    for row in rows {
        configs.push(row?);
    }
    Ok(configs)
}

/// 创建配置
pub fn create_config(
    conn: &Connection,
    id: &str,
    name: &str,
    description: &str,
    config_json: &str,
    version_range: &str,
    created_at: &str,
    updated_at: &str,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO configs (id, name, description, config_json, openclaw_version_range, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        [id, name, description, config_json, version_range, created_at, updated_at],
    )?;
    Ok(())
}

/// 更新配置
pub fn update_config(
    conn: &Connection,
    id: &str,
    name: &str,
    description: &str,
    config_json: &str,
    version_range: &str,
    updated_at: &str,
) -> Result<()> {
    conn.execute(
        r#"
        UPDATE configs 
        SET name = ?1, description = ?2, config_json = ?3, openclaw_version_range = ?4, updated_at = ?5
        WHERE id = ?6
        "#,
        [name, description, config_json, version_range, updated_at, id],
    )?;
    Ok(())
}

/// 删除配置
pub fn delete_config(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM configs WHERE id = ?1", [id])?;
    Ok(())
}

/// 获取已安装的 Skills 列表
pub fn get_installed_skills(conn: &Connection) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT skill_id FROM skills_installed")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    
    let mut skills = Vec::new();
    for row in rows {
        skills.push(row?);
    }
    Ok(skills)
}

/// 获取用户可见的 Skill Assets（基于权限）
pub fn get_visible_skills(conn: &Connection, user_id: &str, role: &str) -> Result<Vec<serde_json::Value>> {
    // 根据角色获取可见的 Skills
    let skills: Vec<serde_json::Value> = match role {
        "admin" | "operator" => {
            // 管理员和运维可以看到所有Skills
            let mut stmt = conn.prepare("SELECT * FROM skills")?;
            let rows = stmt.query_map([], |row| {
                Ok(serde_json::json!({
                    "skill_id": row.get::<_, String>(0).map_err(|e| e.to_string()).unwrap_or_default(),
                    "name": row.get::<_, String>(1).map_err(|e| e.to_string()).unwrap_or_default(),
                    "version": row.get::<_, String>(2).map_err(|e| e.to_string()).unwrap_or_default(),
                    "description": row.get::<_, String>(3).map_err(|e| e.to_string()).unwrap_or_default(),
                }))
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        },
        "dept_admin" | "employee" | "auditor" => {
            // 部门管理员、员工和审计员只能看到已安装的Skills
            let mut stmt = conn.prepare(
                "SELECT s.id, s.name, s.version, s.description 
                 FROM skills s 
                 INNER JOIN skills_installed si ON s.id = si.skill_id"
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(serde_json::json!({
                    "skill_id": row.get::<_, String>(0).map_err(|e| e.to_string()).unwrap_or_default(),
                    "name": row.get::<_, String>(1).map_err(|e| e.to_string()).unwrap_or_default(),
                    "version": row.get::<_, String>(2).map_err(|e| e.to_string()).unwrap_or_default(),
                    "description": row.get::<_, String>(3).map_err(|e| e.to_string()).unwrap_or_default(),
                }))
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        }
        _ => Vec::new(),
    };
    
    Ok(skills)
}

/// 安装 Skill（标记为已安装）
pub fn install_skill(
    conn: &Connection,
    skill_id: &str,
    version: &str,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT OR REPLACE INTO skills_installed (skill_id, version, enabled, installed_at)
        VALUES (?1, ?2, 1, datetime('now'))
        "#,
        [skill_id, version],
    )?;
    Ok(())
}

/// 卸载 Skill
pub fn uninstall_skill(conn: &Connection, skill_id: &str) -> Result<()> {
    conn.execute("DELETE FROM skills_installed WHERE skill_id = ?1", [skill_id])?;
    Ok(())
}

/// 绑定配置到实例
pub fn bind_config_to_instance(
    conn: &Connection,
    instance_id: &str,
    config_id: &str,
    is_primary: bool,
) -> Result<()> {
    if is_primary {
        conn.execute(
            "UPDATE instance_configs SET is_primary = 0 WHERE instance_id = ?1",
            [instance_id],
        )?;
    }
    let is_primary_int: i32 = if is_primary { 1 } else { 0 };
    conn.execute(
        r#"
        INSERT OR REPLACE INTO instance_configs (instance_id, config_id, is_primary, created_at)
        VALUES (?1, ?2, ?3, datetime('now'))
        "#,
        rusqlite::params![instance_id, config_id, is_primary_int],
    )?;
    Ok(())
}

/// 绑定 Skill 到实例
pub fn bind_skill_to_instance(
    conn: &Connection,
    instance_id: &str,
    skill_id: &str,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT OR REPLACE INTO instance_skills (instance_id, skill_id, enabled, created_at)
        VALUES (?1, ?2, 1, datetime('now'))
        "#,
        [instance_id, skill_id],
    )?;
    Ok(())
}

/// 获取用户可访问的部门 ID 列表（用于数据隔离）
pub fn get_user_accessible_departments(conn: &Connection, user_id: &str, user_role: &str) -> Result<Vec<String>> {
    // 管理员和运维管理员可以访问所有部门
    if user_role == "admin" || user_role == "operator" {
        let mut stmt = conn.prepare("SELECT id FROM departments")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        let mut dept_ids = Vec::new();
        for row in rows {
            dept_ids.push(row?);
        }
        return Ok(dept_ids);
    }
    
    // 部门管理员和普通员工只能访问自己的部门
    let mut stmt = conn.prepare(
        "SELECT department_id FROM user_departments WHERE user_id = ?1"
    )?;
    let rows = stmt.query_map([user_id], |row| {
        Ok(row.get::<_, String>(0)?)
    })?;
    
    let mut dept_ids = Vec::new();
    for row in rows {
        dept_ids.push(row?);
    }
    Ok(dept_ids)
}
