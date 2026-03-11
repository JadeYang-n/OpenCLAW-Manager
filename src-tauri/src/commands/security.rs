use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityReport {
    pub score: i32,
    pub issues: Vec<SecurityIssue>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityIssue {
    pub category: String,
    pub severity: String,
    pub description: String,
    pub fix: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillsScanReport {
    pub skills: Vec<SkillScanResult>,
    pub total_risk: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillScanResult {
    pub name: String,
    pub version: String,
    pub risk: String,
    pub issues: Vec<String>,
}

#[tauri::command]
pub fn save_api_key(key_id: String, key_value: String) -> Result<(), String> {
    // 模拟保存API密钥
    Ok(())
}

#[tauri::command]
pub fn get_api_key(key_id: String) -> Result<String, String> {
    // 模拟获取API密钥
    Ok("sk-...".to_string())
}

#[tauri::command]
pub fn security_check() -> SecurityReport {
    // 模拟安全检查
    SecurityReport {
        score: 85,
        issues: vec![
            SecurityIssue {
                category: "端口配置".to_string(),
                severity: "警告".to_string(),
                description: "使用默认端口".to_string(),
                fix: "修改为自定义端口".to_string(),
            },
        ],
        recommendations: vec![
            "关闭不必要的端口".to_string(),
            "使用非root用户运行".to_string(),
        ],
    }
}

#[tauri::command]
pub fn scan_skills(path: String) -> SkillsScanReport {
    // 模拟Skills扫描
    SkillsScanReport {
        skills: vec![
            SkillScanResult {
                name: "文件操作".to_string(),
                version: "1.0.0".to_string(),
                risk: "低".to_string(),
                issues: vec![],
            },
            SkillScanResult {
                name: "浏览器自动化".to_string(),
                version: "1.1.0".to_string(),
                risk: "中".to_string(),
                issues: vec!["网络请求权限".to_string()],
            },
        ],
        total_risk: "低".to_string(),
    }
}