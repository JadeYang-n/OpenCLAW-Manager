use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::sync::LazyLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
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

static ERROR_DATABASE: LazyLock<HashMap<&'static str, ErrorExplanation>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    m.insert("AUTH_001", ErrorExplanation {
        error_code: "AUTH_001".to_string(),
        error_message: "Authentication failed: invalid API key".to_string(),
        explanation_zh: "API 密钥认证失败，可能是密钥错误或已过期".to_string(),
        solution_zh: "1. 检查 API Key 是否正确\n2. 在控制台重新生成密钥\n3. 确认账户余额充足".to_string(),
        updated_at: "2026-03-01".to_string(),
    });
    m.insert("CONN_001", ErrorExplanation {
        error_code: "CONN_001".to_string(),
        error_message: "Connection timeout: cannot reach the API endpoint".to_string(),
        explanation_zh: "连接超时，无法到达 API 端点".to_string(),
        solution_zh: "1. 检查网络连接\n2. 确认 API 地址和端口正确\n3. 检查防火墙设置".to_string(),
        updated_at: "2026-03-01".to_string(),
    });
    m.insert("RATE_001", ErrorExplanation {
        error_code: "RATE_001".to_string(),
        error_message: "Rate limit exceeded: too many requests".to_string(),
        explanation_zh: "请求频率超过限制".to_string(),
        solution_zh: "1. 降低请求频率\n2. 使用批量请求减少调用次数\n3. 考虑升级配额".to_string(),
        updated_at: "2026-03-01".to_string(),
    });
    m.insert("TOKEN_001", ErrorExplanation {
        error_code: "TOKEN_001".to_string(),
        error_message: "Token usage limit reached for this billing cycle".to_string(),
        explanation_zh: "当前计费周期内 Token 用量已达上限".to_string(),
        solution_zh: "1. 在控制台查看当前用量\n2. 升级计费计划\n3. 等待计费周期重置".to_string(),
        updated_at: "2026-03-01".to_string(),
    });
    m.insert("INST_001", ErrorExplanation {
        error_code: "INST_001".to_string(),
        error_message: "Instance not found or not accessible".to_string(),
        explanation_zh: "实例不存在或无法访问".to_string(),
        solution_zh: "1. 确认实例 ID 正确\n2. 检查实例是否在线\n3. 确认网络连通性".to_string(),
        updated_at: "2026-03-01".to_string(),
    });
    m
});

#[tauri::command]
pub fn get_error_explanation(error_code: String) -> Option<ErrorExplanation> {
    ERROR_DATABASE.get(error_code.as_str()).cloned()
}

#[tauri::command]
pub fn update_error_database() -> Result<String, String> {
    eprintln!("[error] 错误数据库更新触发，当前 {} 条记录", ERROR_DATABASE.len());
    Ok(format!("当前错误数据库包含 {} 条已知错误记录", ERROR_DATABASE.len()))
}

/// 上报未知错误，追加到错误日志文件
#[tauri::command]
pub fn report_unknown_error(error: UnknownError) -> Result<(), String> {
    let log_dir = dirs::data_local_dir()
        .ok_or("无法获取应用数据目录")?
        .join("OpenCLAW")
        .join("logs");
    std::fs::create_dir_all(&log_dir).map_err(|e| format!("创建日志目录失败：{}", e))?;

    let log_file = log_dir.join("unknown_errors.log");
    let log_entry = format!("[{}] {} - {} | Context: {}\n",
        error.timestamp, error.error_code, error.error_message, error.context);
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| format!("打开日志文件失败：{}", e))?;
    file.write_all(log_entry.as_bytes())
        .map_err(|e| format!("写入日志失败：{}", e))?;

    Ok(())
}
