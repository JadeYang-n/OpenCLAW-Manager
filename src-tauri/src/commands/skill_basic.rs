use rusqlite::{Connection, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::services::db;

// ==================== 请求/响应结构 ====================

#[derive(Debug, Deserialize)]
#[deprecated(since = "2.0.0", note = "请使用ListSkillsRequestReplica")]
#[allow(dead_code)]
pub struct ListSkillsRequest {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct InstallSkillRequest {
    pub skill_id: String,
    pub version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UninstallSkillRequest {
    pub skill_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ToggleSkillRequest {
    pub skill_id: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct BatchOperationRequest {
    pub skill_ids: Vec<String>,
    pub operation: String, // "enable", "disable", "delete"
}

// ==================== 数据结构 ====================

#[derive(Debug, Serialize)]
pub struct BasicSkill {
    pub id: String,
    pub skill_id: String,
    pub name: String,
    pub version: String,
    pub enabled: bool,
    pub installed_at: String,
    pub last_used_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SkillsStats {
    pub total: i64,
    pub enabled: i64,
    pub disabled: i64,
}

// ==================== 命令实现 ====================

/// 列出所有已安装的 Skills
#[tauri::command]
pub fn list_basic_skills() -> Result<Vec<BasicSkill>, String> {
    let conn = db::init_db().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    let mut stmt = conn.prepare(
        r#"
        SELECT skill_id, version, enabled, installed_at 
        FROM skills_installed 
        ORDER BY installed_at DESC
        "#,
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let rows = stmt.query_map([], |row| {
        // 使用 unwrap_or 避免类型推断问题
        let skill_id: String = row.get(0).unwrap_or_default();
        let version: String = row.get(1).unwrap_or_else(|_| "unknown".to_string());
        let enabled: i32 = row.get(2).unwrap_or(1);
        let installed_at: String = row.get(3).unwrap_or_default();
        
        Ok(BasicSkill {
            id: skill_id.clone(),
            skill_id: skill_id.clone(),
            name: skill_id.clone(),
            version,
            enabled: enabled != 0,
            installed_at,
            last_used_at: None,
        })
    }).map_err(|e| format!("Failed to query skills: {}", e))?;
    
    let mut skills = Vec::new();
    for row in rows {
        skills.push(row.map_err(|e| format!("Failed to process row: {}", e))?);
    }
    
    Ok(skills)
}

/// 安装 Skill
#[tauri::command]
pub fn install_basic_skill(request: InstallSkillRequest) -> Result<BasicSkill, String> {
    let conn = db::init_db().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    let skill_id = request.skill_id.clone();
    let version = request.version.unwrap_or_else(|| "1.0.0".to_string());
    
    // 检查是否已安装
    if let Some(existing) = get_skill_by_id(&conn, &skill_id) {
        return Ok(existing);
    }
    
    let id = format!("skill-{}", Uuid::new_v4().simple());
    let now = Utc::now().to_rfc3339();
    
    match conn.execute(
        r#"
        INSERT INTO skills_installed (skill_id, version, enabled, installed_at)
        VALUES (?1, ?2, 1, ?3)
        "#,
        rusqlite::params![skill_id, version, now],
    ) {
        Ok(_) => {},
        Err(e) => return Err(format!("Failed to install skill: {}", e)),
    };
    
    Ok(BasicSkill {
        id,
        skill_id: skill_id.clone(),
        name: skill_id.clone(),
        version,
        enabled: true,
        installed_at: now,
        last_used_at: None,
    })
}

/// 卸载 Skill
#[tauri::command]
pub fn uninstall_basic_skill(request: UninstallSkillRequest) -> Result<(), String> {
    let conn = db::init_db().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    match conn.execute(
        "DELETE FROM skills_installed WHERE skill_id = ?1",
        [request.skill_id],
    ) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to uninstall skill: {}", e)),
    }
}

/// 启用/禁用 Skill
#[tauri::command]
pub fn toggle_basic_skill(request: ToggleSkillRequest) -> Result<BasicSkill, String> {
    let conn = db::init_db().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    let skill_id = request.skill_id.clone();
    let enabled = request.enabled;
    
    let affected = match conn.execute(
        "UPDATE skills_installed SET enabled = ?1 WHERE skill_id = ?2",
        rusqlite::params![enabled as i32, skill_id],
    ) {
        Ok(a) => a,
        Err(e) => return Err(format!("Failed to toggle skill: {}", e)),
    };
    
    if affected == 0 {
        return Err("Skill not found".to_string());
    }
    
    get_skill_by_id(&conn, &skill_id).ok_or_else(|| "Skill not found after update".to_string())
}

/// 批量操作 Skills
#[tauri::command]
pub fn batch_basic_skills_operation(request: BatchOperationRequest) -> Result<usize, String> {
    let conn = db::init_db().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    match request.operation.as_str() {
        "enable" => {
            let placeholders = request.skill_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let query = format!(
                "UPDATE skills_installed SET enabled = 1 WHERE skill_id IN ({})",
                placeholders
            );
            
            let mut stmt = match conn.prepare(&query) {
                Ok(s) => s,
                Err(e) => return Err(format!("Failed to prepare statement: {}", e)),
            };
            
            match stmt.execute(rusqlite::params_from_iter(request.skill_ids.iter())) {
                Ok(result) => Ok(result),
                Err(e) => Err(format!("Failed to execute: {}", e)),
            }
        }
        "disable" => {
            let placeholders = request.skill_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let query = format!(
                "UPDATE skills_installed SET enabled = 0 WHERE skill_id IN ({})",
                placeholders
            );
            
            let mut stmt = match conn.prepare(&query) {
                Ok(s) => s,
                Err(e) => return Err(format!("Failed to prepare statement: {}", e)),
            };
            
            match stmt.execute(rusqlite::params_from_iter(request.skill_ids.iter())) {
                Ok(result) => Ok(result),
                Err(e) => Err(format!("Failed to execute: {}", e)),
            }
        }
        "delete" => {
            let placeholders = request.skill_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let query = format!(
                "DELETE FROM skills_installed WHERE skill_id IN ({})",
                placeholders
            );
            
            let mut stmt = match conn.prepare(&query) {
                Ok(s) => s,
                Err(e) => return Err(format!("Failed to prepare statement: {}", e)),
            };
            
            match stmt.execute(rusqlite::params_from_iter(request.skill_ids.iter())) {
                Ok(result) => Ok(result),
                Err(e) => Err(format!("Failed to execute: {}", e)),
            }
        }
        _ => Err("Invalid operation".to_string()),
    }
}

/// 获取 Skills 统计信息
#[tauri::command]
pub fn get_basic_skills_stats() -> Result<SkillsStats, String> {
    let conn = db::init_db().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    let total: i64 = match conn.query_row(
        "SELECT COUNT(*) FROM skills_installed",
        [],
        |row| row.get::<_, i64>(0),
    ) {
        Ok(v) => v,
        Err(e) => return Err(format!("Failed to get total: {}", e)),
    };
    
    let enabled: i64 = match conn.query_row(
        "SELECT COUNT(*) FROM skills_installed WHERE enabled = 1",
        [],
        |row| row.get::<_, i64>(0),
    ) {
        Ok(v) => v,
        Err(e) => return Err(format!("Failed to get enabled count: {}", e)),
    };
    
    let disabled = total - enabled;
    
    Ok(SkillsStats {
        total,
        enabled,
        disabled,
    })
}

// ==================== 辅助函数 ====================

fn get_skill_by_id(conn: &Connection, skill_id: &str) -> Option<BasicSkill> {
    let mut stmt = match conn.prepare(
        "SELECT skill_id, version, enabled, installed_at FROM skills_installed WHERE skill_id = ?1"
    ) {
        Ok(s) => s,
        Err(_) => return None,
    };
    
    let mut rows = match stmt.query([skill_id]) {
        Ok(r) => r,
        Err(_) => return None,
    };
    
    if let Some(row) = match rows.next() {
        Ok(Some(r)) => Some(r),
        _ => None,
    } {
        let skill_id: String = match row.get(0) {
            Ok(s) => s,
            Err(_) => return None,
        };
        let version: String = match row.get(1) {
            Ok(s) => s,
            Err(_) => return None,
        };
        let enabled: i32 = match row.get(2) {
            Ok(s) => s,
            Err(_) => return None,
        };
        let installed_at: String = match row.get(3) {
            Ok(s) => s,
            Err(_) => return None,
        };
        
        return Some(BasicSkill {
            id: skill_id.clone(),
            skill_id: skill_id.clone(),
            name: skill_id.clone(),
            version,
            enabled: enabled != 0,
            installed_at,
            last_used_at: None,
        });
    }
    
    None
}
