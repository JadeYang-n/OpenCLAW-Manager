use serde::{Deserialize, Serialize};

/// OCM 自身版本（hardcoded from Cargo.toml）
const OCM_VERSION: &str = env!("CARGO_PKG_VERSION");

/// 已知 OpenCLAW 版本兼容矩阵
const COMPATIBILITY_MATRIX: &[( &str, bool, &str)] = &[
    ("2026.3.0", true, "推荐版本"),
    ("2026.2.0", true, "兼容"),
    ("2026.1.0", true, "兼容，建议升级"),
    ("2025.12.0", false, "不兼容，请升级至 2026.1.0+"),
    ("2025.11.0", false, "不兼容，请升级至 2026.1.0+"),
];

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionInfo {
    pub version: String,
    pub release_date: String,
    pub is_latest: bool,
    pub latest_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompatibilityInfo {
    pub openclaw_version: String,
    pub ocm_version: String,
    pub compatible: bool,
    pub message: String,
    pub recommended_version: String,
}

/// 检查本地 OpenCLAW 版本（读取数据库中的实例信息）
#[tauri::command]
pub fn check_openclaw_version() -> Result<VersionInfo, String> {
    // 读取本地实例的版本信息（从数据库获取最新版本）
    let conn = crate::services::db::get_connection().map_err(|e| e.to_string())?;
    let latest_version = conn.query_row(
        "SELECT version FROM instances WHERE version IS NOT NULL AND version != '' ORDER BY created_at DESC LIMIT 1",
        [],
        |r| r.get::<_, Option<String>>(0),
    ).ok().flatten().unwrap_or_else(|| "2026.2.0".to_string());

    // 检查是否为最新版本
    let is_latest = COMPATIBILITY_MATRIX.iter().any(|(v, compat, _)| *v == latest_version && *compat);

    Ok(VersionInfo {
        version: latest_version.clone(),
        release_date: "2026-02-01".to_string(),
        is_latest,
        latest_version: Some("2026.3.0".to_string()),
    })
}

/// 获取兼容性信息（基于硬编码的兼容矩阵）
#[tauri::command]
pub fn get_compatibility_info() -> Vec<CompatibilityInfo> {
    COMPATIBILITY_MATRIX.iter().map(|(ver, compatible, message)| {
        CompatibilityInfo {
            openclaw_version: ver.to_string(),
            ocm_version: OCM_VERSION.to_string(),
            compatible: *compatible,
            message: message.to_string(),
            recommended_version: "2026.3.0".to_string(),
        }
    }).collect()
}