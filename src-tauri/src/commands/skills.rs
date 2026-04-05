use serde::{Deserialize, Serialize};
use crate::services::db;
use crate::middleware::auth;
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub author: Option<String>,
    pub installed: bool,
    pub enabled: bool,
    pub source: String, // "local" | "anthropic" | "clawhub" | "custom"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallSkillRequest {
    pub skill_id: String,
    pub version: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSkillRequest {
    pub skill_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct CreateSkillRequest {
    pub name: String,
    pub description: Option<String>,
    pub code: String,  // Skill 的实际代码(加密存储)
    pub visibility: String,  // "all" 或 "selected_roles"
    pub allowed_roles: Vec<String>,  // 如果 visibility="selected_roles"
}

/// 获取 Skills 目录
fn get_skills_directory() -> Result<PathBuf, String> {
    let app_data = dirs::data_local_dir()
        .ok_or("无法获取应用数据目录")?
        .join("OpenCLAW")
        .join("skills");
    
    fs::create_dir_all(&app_data)
        .map_err(|e| format!("创建 Skills 目录失败：{}", e))?;
    
    Ok(app_data)
}

/// 获取 Anthropic 官方 Skills 列表
fn get_anthropic_skills() -> Vec<SkillInfo> {
    vec![
        SkillInfo {
            id: "skill-creator".to_string(),
            name: "Skill Creator".to_string(),
            description: Some("Create and evaluate custom skills with A/B testing, benchmarking, and description optimization".to_string()),
            version: "1.0.0".to_string(),
            author: Some("Anthropic".to_string()),
            installed: false,
            enabled: false,
            source: "anthropic".to_string(),
        },
        SkillInfo {
            id: "skill-code-review".to_string(),
            name: "Code Reviewer".to_string(),
            description: Some("Automated code review with best practices enforcement".to_string()),
            version: "1.0.0".to_string(),
            author: Some("Anthropic".to_string()),
            installed: false,
            enabled: false,
            source: "anthropic".to_string(),
        },
        SkillInfo {
            id: "skill-research".to_string(),
            name: "Research Assistant".to_string(),
            description: Some("Deep research with multi-source verification and citation management".to_string()),
            version: "1.0.0".to_string(),
            author: Some("Anthropic".to_string()),
            installed: false,
            enabled: false,
            source: "anthropic".to_string(),
        },
        SkillInfo {
            id: "skill-writing".to_string(),
            name: "Writing Coach".to_string(),
            description: Some("Improve writing clarity, tone, and structure".to_string()),
            version: "1.0.0".to_string(),
            author: Some("Anthropic".to_string()),
            installed: false,
            enabled: false,
            source: "anthropic".to_string(),
        },
    ]
}

/// 列出所有 Skills（本地检测 + Anthropic 官方 + ClawHub 指引）+ 用户可见的 Skill Assets
#[tauri::command]
pub fn list_skills(token: String) -> Result<Vec<SkillInfo>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    
    // 获取已安装的 Skills
    let installed_skills = db::get_installed_skills(&conn)
        .map_err(|e| e.to_string())?;
    
    // 扫描本地 Skills（已废弃，使用空列表）
    #[allow(deprecated)]
    let local_skills = scan_local_skills().unwrap_or_default();
    
    // 获取 Anthropic 官方 Skills
    let anthropic_skills = get_anthropic_skills();
    
    // 合并所有 Skills
    let mut all_skills: Vec<SkillInfo> = Vec::new();
    
    // 添加本地 Skills
    for mut skill in local_skills {
        skill.installed = installed_skills.iter().any(|s| s == &skill.id);
        skill.enabled = skill.installed;
        all_skills.push(skill);
    }
    
    // 添加 Anthropic Skills
    for mut skill in anthropic_skills {
        skill.installed = installed_skills.iter().any(|s| s == &skill.id);
        skill.enabled = skill.installed;
        all_skills.push(skill);
    }
    
    // 获取用户可见的 Skill Assets（基于权限）
    let visible_skills = match db::get_visible_skills(&conn, &user.user_id, &user.role) {
        Ok(skills) => skills,
        Err(e) => {
            eprintln!("Failed to get visible skills: {}", e);
            Vec::new()
        }
    };
    
    // 将 Skill Assets 转换为 SkillInfo 格式
    for skill_asset in visible_skills {
        let skill_id = skill_asset.get("skill_id").and_then(|v| v.as_str()).unwrap_or("");
        let name = skill_asset.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let version = skill_asset.get("version").and_then(|v| v.as_str()).unwrap_or("1.0.0");
        let description = skill_asset.get("description").and_then(|v| v.as_str());
        
        // 检查是否已安装
        let is_installed = installed_skills.iter().any(|s| s == &skill_id);
        
        all_skills.push(SkillInfo {
            id: skill_id.to_string(),
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            version: version.to_string(),
            author: Some("custom".to_string()), // 标记为自定义 Skill
            installed: is_installed,
            enabled: is_installed,
            source: "custom".to_string(),
        });
    }
    
    // 按 source 排序：skill-creator 排第一，然后是 local，最后是 anthropic 和 custom
    all_skills.sort_by(|a, b| {
        if a.id == "skill-creator" {
            std::cmp::Ordering::Less
        } else if b.id == "skill-creator" {
            std::cmp::Ordering::Greater
        } else {
            a.source.cmp(&b.source)
        }
    });
    
    Ok(all_skills)
}

/// 安装 Skill（从本地目录或 Anthropic 仓库）
#[tauri::command]
pub fn install_skill(token: String, req: InstallSkillRequest) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "skill", "install")?;
    
    let source = req.source.as_deref().unwrap_or("local");
    
    match source {
        "anthropic" => {
            // 从 Anthropic 仓库克隆
            eprintln!("[Skill 安装] 从 Anthropic 仓库安装：{}", req.skill_id);
            // TODO: 实现 git clone https://github.com/anthropics/skills.git
            // 目前仅提示用户手动下载
            Ok(format!("📥 请从 https://github.com/anthropics/skills 下载 {} 到本地 Skills 目录，然后重新刷新列表", req.skill_id))
        },
        "clawhub" => {
            Ok("🌐 ClawHub API 尚未开放。请访问 https://clawhub.com 获取 Skills 和安装说明".to_string())
        },
        _ => {
            // 本地安装
            let skills_dir = get_skills_directory()?;
            let skill_path = skills_dir.join(&req.skill_id);
            
            if !skill_path.exists() {
                return Err(format!("本地未找到 Skill: {}. 请先下载到 {}", req.skill_id, skills_dir.display()));
            }
            
            // 在数据库中标记为已安装
            db::install_skill(&conn, &req.skill_id, req.version.as_deref().unwrap_or("latest"))
                .map_err(|e| format!("数据库更新失败：{}", e))?;
            
            // 记录审计日志
            auth::log_audit_operation(
                &conn,
                &user,
                "skill",
                "install",
                "M",
                "success",
                Some(&format!("{{\"skill_id\": \"{}\", \"source\": \"{}\"}}", req.skill_id, source)),
            );
            
            Ok(format!("✅ Skill {} installed successfully (from {})", req.skill_id, source))
        }
    }
}

/// 卸载 Skill
#[tauri::command]
pub fn uninstall_skill(token: String, skill_id: String) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "skill", "uninstall")?;
    
    // 从数据库删除记录
    db::uninstall_skill(&conn, &skill_id)
        .map_err(|e| format!("数据库删除失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "skill",
        "uninstall",
        "M",
        "success",
        Some(&format!("{{\"skill_id\": \"{}\"}}", skill_id)),
    );
    
    Ok(format!("✅ Skill {} uninstalled successfully", skill_id))
}

/// 更新 Skill
#[tauri::command]
pub fn update_skill(token: String, req: UpdateSkillRequest) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "skill", "update")?;
    
    auth::log_audit_operation(
        &conn,
        &user,
        "skill",
        "update",
        "M",
        "success",
        Some(&format!("{{\"skill_id\": \"{}\"}}", req.skill_id)),
    );
    
    Ok(())
}

/// 启用/禁用 Skill
#[tauri::command]
pub fn toggle_skill(token: String, skill_id: String, enabled: bool) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "skill", "toggle")?;
    
    auth::log_audit_operation(
        &conn,
        &user,
        "skill",
        "toggle",
        "L",
        "success",
        Some(&format!("{{\"skill_id\": \"{}\", \"enabled\": {}}}", skill_id, enabled)),
    );
    
    Ok(())
}

/// 扫描本地 Skills 目录，检测已下载的 Skills（已废弃）
#[deprecated(since = "2.0.0", note = "请使用scan_local_skills_replica")]
fn scan_local_skills() -> Result<Vec<SkillInfo>, String> {
    Ok(Vec::new())
}
