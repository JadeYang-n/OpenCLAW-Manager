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
    pub code: String,
    pub visibility: String,
    pub allowed_roles: Vec<String>,
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

    let installed_skills = db::get_installed_skills(&conn)
        .map_err(|e| e.to_string())?;

    #[allow(deprecated)]
    let local_skills = scan_local_skills().unwrap_or_default();

    let anthropic_skills = get_anthropic_skills();

    let mut all_skills: Vec<SkillInfo> = Vec::new();

    for mut skill in local_skills {
        skill.installed = installed_skills.iter().any(|s| s == &skill.id);
        skill.enabled = skill.installed;
        all_skills.push(skill);
    }

    for mut skill in anthropic_skills {
        skill.installed = installed_skills.iter().any(|s| s == &skill.id);
        skill.enabled = skill.installed;
        all_skills.push(skill);
    }

    let visible_skills = match db::get_visible_skills(&conn, &user.user_id, &user.role) {
        Ok(skills) => skills,
        Err(e) => {
            eprintln!("Failed to get visible skills: {}", e);
            Vec::new()
        }
    };

    for skill_asset in visible_skills {
        let skill_id = skill_asset.get("skill_id").and_then(|v| v.as_str()).unwrap_or("");
        let name = skill_asset.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let version = skill_asset.get("version").and_then(|v| v.as_str()).unwrap_or("1.0.0");
        let description = skill_asset.get("description").and_then(|v| v.as_str());

        let is_installed = installed_skills.iter().any(|s| s == &skill_id);

        all_skills.push(SkillInfo {
            id: skill_id.to_string(),
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            version: version.to_string(),
            author: Some("custom".to_string()),
            installed: is_installed,
            enabled: is_installed,
            source: "custom".to_string(),
        });
    }

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
            eprintln!("[Skill 安装] 从 Anthropic 仓库安装：{}", req.skill_id);
            let skills_dir = get_skills_directory()?;
            let target_path = skills_dir.join(&req.skill_id);

            if target_path.exists() {
                return Err(format!("Skill {} 已存在，请先卸载再安装", req.skill_id));
            }

            // 尝试 git clone
            let clone_result = std::process::Command::new("git")
                .args(["clone", "--depth", "1",
                    &format!("https://github.com/anthropics/skills/{}", req.skill_id),
                    target_path.to_str().unwrap()])
                .output();

            match clone_result {
                Ok(output) if output.status.success() => {
                    eprintln!("[Skill 安装] git clone 成功：{}", req.skill_id);
                },
                _ => {
                    eprintln!("[Skill 安装] git clone 失败，尝试 HTTP 下载：{}", req.skill_id);
                    download_skill_from_github(&req.skill_id, &target_path)?;
                }
            }

            db::install_skill(&conn, &req.skill_id, req.version.as_deref().unwrap_or("latest"))
                .map_err(|e| format!("数据库更新失败：{}", e))?;

            auth::log_audit_operation(
                &conn, &user, "skill", "install", "M", "success",
                Some(&format!("{{\"skill_id\": \"{}\", \"source\": \"anthropic\"}}", req.skill_id)),
            );

            Ok(format!("✅ Skill {} installed successfully (from anthropic)", req.skill_id))
        },
        "clawhub" => {
            Ok("🌐 ClawHub API 尚未开放。请访问 https://clawhub.com 获取 Skills 和安装说明".to_string())
        },
        _ => {
            let skills_dir = get_skills_directory()?;
            let skill_path = skills_dir.join(&req.skill_id);

            if !skill_path.exists() {
                return Err(format!("本地未找到 Skill: {}. 请先下载到 {}", req.skill_id, skills_dir.display()));
            }

            db::install_skill(&conn, &req.skill_id, req.version.as_deref().unwrap_or("latest"))
                .map_err(|e| format!("数据库更新失败：{}", e))?;

            auth::log_audit_operation(
                &conn, &user, "skill", "install", "M", "success",
                Some(&format!("{{\"skill_id\": \"{}\", \"source\": \"{}\"}}", req.skill_id, source)),
            );

            Ok(format!("✅ Skill {} installed successfully (from {})", req.skill_id, source))
        }
    }
}

/// 从 GitHub 下载 Skill（zip 归档解压）
fn download_skill_from_github(skill_id: &str, target_path: &std::path::Path) -> Result<(), String> {
    let zip_url = "https://github.com/anthropics/skills/archive/refs/heads/main.zip";

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;

    let response = client.get(zip_url)
        .send()
        .map_err(|e| format!("下载 Skill 仓库失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub 返回错误状态：{}", response.status()));
    }

    let zip_bytes = response.bytes()
        .map_err(|e| format!("读取响应失败：{}", e))?;

    let temp_dir = std::env::temp_dir().join(format!("skill_{}", skill_id));
    let _ = std::fs::remove_dir_all(&temp_dir);
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("创建临时目录失败：{}", e))?;

    let cursor = std::io::Cursor::new(zip_bytes);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| format!("解压失败：{}", e))?;
    archive.extract(&temp_dir)
        .map_err(|e| format!("解压失败：{}", e))?;

    // 查找 skill 目录
    let extracted_skill = temp_dir.join(format!("skills-main/{}", skill_id));
    if extracted_skill.exists() {
        copy_dir_all(&extracted_skill, target_path)?;
    } else {
        let alt_path = temp_dir.join(format!("skills-main/skills/{}", skill_id));
        if alt_path.exists() {
            copy_dir_all(&alt_path, target_path)?;
        } else {
            return Err(format!("在下载的仓库中未找到 Skill: {}", skill_id));
        }
    }

    let _ = std::fs::remove_dir_all(&temp_dir);
    Ok(())
}

fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> Result<(), String> {
    std::fs::create_dir_all(dst).map_err(|e| format!("创建目录失败：{}", e))?;
    for entry in std::fs::read_dir(src).map_err(|e| format!("读取目录失败：{}", e))? {
        let entry = entry.map_err(|e| format!("读取条目失败：{}", e))?;
        let ty = entry.file_type().map_err(|e| format!("获取类型失败：{}", e))?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.join(entry.file_name()))
                .map_err(|e| format!("复制文件失败：{}", e))?;
        }
    }
    Ok(())
}

/// 卸载 Skill
#[tauri::command]
pub fn uninstall_skill(token: String, skill_id: String) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "skill", "uninstall")?;

    db::uninstall_skill(&conn, &skill_id)
        .map_err(|e| format!("数据库删除失败：{}", e))?;

    // 同时删除本地文件
    let skills_dir = get_skills_directory()?;
    let skill_path = skills_dir.join(&skill_id);
    if skill_path.exists() {
        let _ = std::fs::remove_dir_all(&skill_path);
    }

    auth::log_audit_operation(
        &conn, &user, "skill", "uninstall", "M", "success",
        Some(&format!("{{\"skill_id\": \"{}\"}}", skill_id)),
    );

    Ok(format!("✅ Skill {} uninstalled successfully", skill_id))
}

/// 更新 Skill — 从 Anthropic 仓库重新下载（如果是官方 Skill）
#[tauri::command]
pub fn update_skill(token: String, req: UpdateSkillRequest) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "skill", "update")?;

    let anthropic_skills = get_anthropic_skills();
    let is_anthropic = anthropic_skills.iter().any(|s| s.id == req.skill_id);

    if is_anthropic {
        let skills_dir = get_skills_directory()?;
        let target_path = skills_dir.join(&req.skill_id);

        // 删除旧版本
        if target_path.exists() {
            std::fs::remove_dir_all(&target_path)
                .map_err(|e| format!("删除旧版本失败：{}", e))?;
        }

        // 重新下载
        download_skill_from_github(&req.skill_id, &target_path)?;

        auth::log_audit_operation(
            &conn, &user, "skill", "update", "M", "success",
            Some(&format!("{{\"skill_id\": \"{}\"}}", req.skill_id)),
        );

        Ok(format!("✅ Skill {} 已更新到最新版本", req.skill_id))
    } else {
        Ok(format!("Skill {} 为自定义/本地 Skill，请手动更新文件后刷新列表", req.skill_id))
    }
}

/// 启用/禁用 Skill
#[tauri::command]
pub fn toggle_skill(token: String, skill_id: String, enabled: bool) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "skill", "toggle")?;

    db::toggle_skill_enabled(&conn, &skill_id, enabled)
        .map_err(|e| format!("更新 Skill 状态失败：{}", e))?;

    auth::log_audit_operation(
        &conn, &user, "skill", "toggle", "L", "success",
        Some(&format!("{{\"skill_id\": \"{}\", \"enabled\": {}}}", skill_id, enabled)),
    );

    Ok(())
}

/// 扫描本地 Skills 目录，检测已下载的 Skills（已废弃）
#[deprecated(since = "2.0.0", note = "请使用scan_local_skills_replica")]
fn scan_local_skills() -> Result<Vec<SkillInfo>, String> {
    Ok(Vec::new())
}
