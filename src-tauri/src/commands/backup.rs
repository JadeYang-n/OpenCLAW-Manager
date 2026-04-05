use crate::services::db;
use crate::middleware::auth;
use std::fs;
use std::path::PathBuf;
use chrono::Utc;

/// 备份数据库
#[tauri::command]
pub fn backup_database(token: String) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：管理员或运维管理员
    if user.role != "admin" && user.role != "operator" {
        return Err("权限不足：只有管理员和运维管理员可以备份数据库".to_string());
    }
    
    // 获取数据库路径
    let db_path = db::get_db_path();
    
    // 创建备份目录
    let backup_dir = get_backup_dir();
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("创建备份目录失败：{}", e))?;
    
    // 生成备份文件名（带时间戳）
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("ocm_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);
    
    // 复制数据库文件
    fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("备份数据库失败：{}", e))?;
    
    eprintln!("[备份] 数据库已备份到：{}", backup_path.display());
    
    Ok(backup_path.to_string_lossy().to_string())
}

/// 恢复数据库
#[tauri::command]
pub fn restore_database(token: String, backup_path: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：仅管理员
    if user.role != "admin" {
        return Err("权限不足：只有管理员可以恢复数据库".to_string());
    }
    
    // 验证备份文件存在
    let backup_file = PathBuf::from(&backup_path);
    if !backup_file.exists() {
        return Err(format!("备份文件不存在：{}", backup_path));
    }
    
    // 获取数据库路径
    let db_path = db::get_db_path();
    
    // 创建当前数据库的临时备份（用于回滚）
    let temp_backup = db_path.with_extension("db.backup_temp");
    fs::copy(&db_path, &temp_backup)
        .map_err(|e| format!("创建临时备份失败：{}", e))?;
    
    // 恢复数据库（先删除当前数据库，再复制备份）
    fs::remove_file(&db_path)
        .map_err(|e| format!("删除当前数据库失败：{}", e))?;
    
    fs::copy(&backup_file, &db_path)
        .map_err(|e| {
            // 恢复失败，回滚
            fs::copy(&temp_backup, &db_path).ok();
            format!("恢复数据库失败：{}", e)
        })?;
    
    // 清理临时备份
    fs::remove_file(&temp_backup).ok();
    
    eprintln!("[恢复] 数据库已从 {} 恢复", backup_path);
    
    Ok(())
}

/// 列出所有备份
#[tauri::command]
pub fn list_backups(token: String) -> Result<Vec<BackupInfo>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：管理员或运维管理员
    if user.role != "admin" && user.role != "operator" {
        return Err("权限不足：只有管理员和运维管理员可以查看备份".to_string());
    }
    
    let backup_dir = get_backup_dir();
    
    if !backup_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut backups = Vec::new();
    
    for entry in fs::read_dir(&backup_dir)
        .map_err(|e| format!("读取备份目录失败：{}", e))? 
    {
        let entry = entry.map_err(|e| format!("读取备份文件失败：{}", e))?;
        let path = entry.path();
        
        if path.extension().and_then(|s| s.to_str()) == Some("db") {
            let metadata = fs::metadata(&path)
                .map_err(|e| format!("读取备份文件信息失败：{}", e))?;
            
            let filename = path.file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            
            let size = metadata.len();
            let created = metadata.created()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0))
                .unwrap_or(0);
            
            backups.push(BackupInfo {
                filename,
                path: path.to_string_lossy().to_string(),
                size,
                created,
            });
        }
    }
    
    // 按创建时间倒序排序（最新的在前）
    backups.sort_by(|a, b| b.created.cmp(&a.created));
    
    Ok(backups)
}

/// 删除备份
#[tauri::command]
pub fn delete_backup(token: String, backup_path: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：管理员或运维管理员
    if user.role != "admin" && user.role != "operator" {
        return Err("权限不足：只有管理员和运维管理员可以删除备份".to_string());
    }
    
    let backup_file = PathBuf::from(&backup_path);
    
    if !backup_file.exists() {
        return Err(format!("备份文件不存在：{}", backup_path));
    }
    
    fs::remove_file(&backup_file)
        .map_err(|e| format!("删除备份失败：{}", e))?;
    
    eprintln!("[删除] 备份已删除：{}", backup_path);
    
    Ok(())
}

/// 备份信息
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created: u64,
}

/// 获取备份目录
fn get_backup_dir() -> PathBuf {
    let db_path = db::get_db_path();
    let mut backup_dir = db_path.parent().unwrap_or_else(|| std::path::Path::new(".")).to_path_buf();
    backup_dir.push("backups");
    backup_dir
}

/// 定时备份（每天凌晨 2 点）
pub fn start_scheduled_backup() {
    std::thread::spawn(|| {
        loop {
            let now = Utc::now();
            let tomorrow = now + chrono::Duration::days(1);
            let next_backup = tomorrow.date_naive().and_hms_opt(2, 0, 0).unwrap();
            let next_backup = next_backup.and_utc();
            
            let sleep_duration = (next_backup - now).num_seconds() as u64;
            
            eprintln!("[定时备份] 下次备份时间：{}", next_backup);
            std::thread::sleep(std::time::Duration::from_secs(sleep_duration));
            
            // 执行备份（使用系统账号，不需要 token）
            match backup_database_internal() {
                Ok(path) => eprintln!("[定时备份] 备份成功：{}", path),
                Err(e) => eprintln!("[定时备份] 备份失败：{}", e),
            }
        }
    });
}

/// 内部备份函数（不需要 token 验证）
fn backup_database_internal() -> Result<String, String> {
    let db_path = db::get_db_path();
    let backup_dir = get_backup_dir();
    
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("创建备份目录失败：{}", e))?;
    
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("ocm_backup_auto_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);
    
    fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("备份数据库失败：{}", e))?;
    
    Ok(backup_path.to_string_lossy().to_string())
}
