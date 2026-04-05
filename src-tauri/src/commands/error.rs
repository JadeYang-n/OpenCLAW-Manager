use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorExplanation {
    pub error_code: String,
    pub error_message: String,
    pub explanation_zh: String,
    pub solution_zh: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UnknownError {
    pub error_code: String,
    pub error_message: String,
    pub context: String,
    pub timestamp: String,
}

#[tauri::command]
pub fn get_error_explanation(error_code: String) -> Option<ErrorExplanation> {
    // 模拟获取错误解释
    Some(ErrorExplanation {
        error_code: error_code.clone(),
        error_message: "Authentication failed: invalid API key".to_string(),
        explanation_zh: "API 密钥认证失败，可能是密钥错误或已过期".to_string(),
        solution_zh: "1. 检查 API Key 是否正确\n2. 在控制台重新生成密钥\n3. 确认账户余额充足".to_string(),
        updated_at: "2026-03-01".to_string(),
    })
}

#[tauri::command]
pub fn update_error_database() -> Result<(), String> {
    // 模拟更新错误数据库
    Ok(())
}

#[tauri::command]
pub fn report_unknown_error(_error: UnknownError) -> Result<(), String> {
    // 模拟上报未知错误
    Ok(())
}