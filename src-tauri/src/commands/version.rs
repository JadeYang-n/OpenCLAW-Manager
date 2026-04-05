use serde::{Deserialize, Serialize};

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

#[tauri::command]
pub fn check_openclaw_version() -> Result<VersionInfo, String> {
    // 模拟检查OpenCLAW版本
    Ok(VersionInfo {
        version: "2026.2.0".to_string(),
        release_date: "2026-02-01".to_string(),
        is_latest: true,
        latest_version: None,
    })
}

#[tauri::command]
pub fn get_compatibility_info() -> CompatibilityInfo {
    // 模拟获取兼容性信息
    CompatibilityInfo {
        openclaw_version: "2026.2.0".to_string(),
        ocm_version: "0.1.0".to_string(),
        compatible: true,
        message: "当前版本兼容".to_string(),
        recommended_version: "2026.2.0".to_string(),
    }
}