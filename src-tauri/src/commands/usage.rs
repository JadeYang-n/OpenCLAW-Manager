use serde::{Deserialize, Serialize};
use crate::services::db;
use crate::middleware::auth;
use crate::crypto;

/// 用量查询请求
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryUsageRequest {
    pub provider: String,  // aliyun, zhipu, deepseek, etc.
    pub start_date: String, // YYYY-MM-DD
    pub end_date: String,   // YYYY-MM-DD
}

/// 用量查询结果
#[derive(Debug, Serialize, Deserialize)]
pub struct UsageData {
    pub provider: String,
    pub provider_name: String,
    pub total_tokens: i64,
    pub total_cost: f64,
    pub request_count: i64,
    pub by_model: Vec<ModelUsage>,
    pub period: UsagePeriod,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelUsage {
    pub model: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UsagePeriod {
    pub start_date: String,
    pub end_date: String,
}

/// 查询用量
#[tauri::command]
pub fn query_usage(token: String, req: QueryUsageRequest) -> Result<UsageData, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    
    // 获取用户的 API Key 配置
    let api_key = get_provider_api_key(&conn, &user.user_id, &req.provider)?;
    
    // 根据提供商调用对应的 API
    match req.provider.as_str() {
        "aliyun" => query_aliyun_usage(&api_key, &req.start_date, &req.end_date),
        "zhipu" => query_zhipu_usage(&api_key, &req.start_date, &req.end_date),
        "deepseek" => query_deepseek_usage(&api_key, &req.start_date, &req.end_date),
        _ => Err(format!("不支持的提供商：{}", req.provider)),
    }
}

/// 获取提供商的 API Key（从统一的 api_keys 表读取）
fn get_provider_api_key(conn: &rusqlite::Connection, _user_id: &str, provider: &str) -> Result<String, String> {
    eprintln!("[获取 API Key] 提供商：{}", provider);
    
    // 从 api_keys 表获取加密的 API Key（key_id = provider）
    let mut stmt = conn
        .prepare("SELECT encrypted_value FROM api_keys WHERE key_id = ?1 AND enabled = 1")
        .map_err(|e| {
            eprintln!("[获取 API Key] 数据库查询失败：{}", e);
            format!("获取 API Key 失败：{}", e)
        })?;
    
    let encrypted: Option<String> = stmt
        .query_row([provider], |row| row.get(0))
        .ok();
    
    eprintln!("[获取 API Key] 数据库查询结果：{}", if encrypted.is_some() { "找到" } else { "未找到" });
    
    let encrypted = encrypted
        .ok_or_else(|| {
            eprintln!("[获取 API Key] 未找到 API Key");
            format!("未配置{}的 API Key，请在安全中心→密钥管理中添加", get_provider_name(provider))
        })?;
    
    // 解密
    let api_key = crypto::decrypt(&encrypted)
        .map_err(|e| {
            eprintln!("[获取 API Key] 解密失败：{}", e);
            format!("解密 API Key 失败：{}", e)
        })?;
    
    eprintln!("[获取 API Key] 解密成功");
    
    Ok(api_key)
}

/// 初始化数据库表（确保表存在）（已废弃）
#[allow(dead_code)]
fn ensure_provider_api_keys_table(_conn: &rusqlite::Connection) -> Result<(), String> {
    Ok(())
}



/// 保存提供商 API Key（已废弃，统一使用 keys::save_api_key）
/// 保留此函数用于向后兼容
#[tauri::command]
pub fn save_provider_api_key(token: String, provider: String, api_key: String) -> Result<(), String> {
    // 调用统一的 save_api_key
    crate::commands::keys::save_api_key(token, provider, api_key)
}

/// 查询阿里云百炼用量
fn query_aliyun_usage(api_key: &str, start_date: &str, end_date: &str) -> Result<UsageData, String> {
    use reqwest::blocking::Client;
    
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    // 阿里云用量查询 API 文档：https://help.aliyun.com/zh/dashscope/developer-reference/usage-details
    let response = client
        .get("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/usage")
        .header("Authorization", format!("Bearer {}", api_key))
        .query(&[
            ("start_time", &format!("{}T00:00:00Z", start_date)),
            ("end_time", &format!("{}T23:59:59Z", end_date)),
        ])
        .send()
        .map_err(|e| {
            eprintln!("[阿里云 API] 请求失败：{}", e);
            format!("请求阿里云 API 失败：{}\n\n可能原因:\n1. 网络连接问题\n2. API 端点已变更\n3. API Key 权限不足", e)
        })?;
    
    let status = response.status();
    let status_code = status.as_u16();
    eprintln!("[阿里云 API] 响应状态码：{}", status_code);
    
    if !status.is_success() {
        let body = response.text().unwrap_or_default();
        eprintln!("[阿里云 API] 错误响应：{}", body);
        return Err(format!(
            "阿里云 API 返回错误：{} (HTTP {})\n\n响应内容：{}\n\n建议:\n1. 检查 API Key 是否正确（阿里云百炼控制台获取）\n2. 确认 API Key 有\"用量查询\"权限\n3. 查看阿里云 API 文档：https://help.aliyun.com/zh/dashscope/developer-reference/usage-details",
            status.canonical_reason().unwrap_or("Unknown Error"),
            status_code,
            if body.is_empty() { "(空响应)" } else { &body }
        ));
    }
    
    // 解析响应
    let json: serde_json::Value = response
        .json()
        .map_err(|e| {
            eprintln!("[阿里云 API] 解析 JSON 失败：{}", e);
            format!("解析响应失败：{}", e)
        })?;
    
    eprintln!("[阿里云 API] 完整响应：{}", json);
    
    // 阿里云 API 响应结构：
    // {
    //   "code": "200",
    //   "message": "SUCCESS",
    //   "data": {
    //     "total_tokens": 12345,
    //     "total_cost": 0.123
    //   }
    // }
    let total_tokens = json
        .get("data")
        .and_then(|d| d.get("total_tokens"))
        .and_then(|v| v.as_i64())
        .or_else(|| json.get("total_tokens").and_then(|v| v.as_i64()))
        .unwrap_or(0);
    
    let total_cost = json
        .get("data")
        .and_then(|d| d.get("total_cost"))
        .and_then(|v| v.as_f64())
        .or_else(|| json.get("total_cost").and_then(|v| v.as_f64()))
        .unwrap_or(0.0);
    
    Ok(UsageData {
        provider: "aliyun".to_string(),
        provider_name: "阿里云百炼".to_string(),
        total_tokens,
        total_cost,
        request_count: 0, // 根据实际 API 响应填充
        by_model: vec![], // 根据实际 API 响应填充
        period: UsagePeriod {
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
        },
    })
}

/// 查询智谱 AI 用量
fn query_zhipu_usage(api_key: &str, start_date: &str, end_date: &str) -> Result<UsageData, String> {
    use reqwest::blocking::Client;
    
    let client = Client::new();
    
    let response = client
        .post("https://open.bigmodel.cn/api/v4/billing/usage")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "start_date": start_date,
            "end_date": end_date
        }))
        .send()
        .map_err(|e| format!("请求智谱 API 失败：{}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("智谱 API 返回错误：{}", response.status()));
    }
    
    // 解析响应（简化示例）
    let json: serde_json::Value = response.json()
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    let total_tokens = json.get("data").and_then(|d| d.get("total_tokens"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    
    let total_cost = json.get("data").and_then(|d| d.get("total_cost"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    
    Ok(UsageData {
        provider: "zhipu".to_string(),
        provider_name: "智谱 AI".to_string(),
        total_tokens,
        total_cost,
        request_count: 0,
        by_model: vec![],
        period: UsagePeriod {
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
        },
    })
}

/// 查询 DeepSeek 用量
fn query_deepseek_usage(api_key: &str, start_date: &str, end_date: &str) -> Result<UsageData, String> {
    use reqwest::blocking::Client;
    
    let client = Client::new();
    
    let response = client
        .get("https://platform.deepseek.com/api/v1/usage")
        .header("Authorization", format!("Bearer {}", api_key))
        .query(&[("start_date", start_date), ("end_date", end_date)])
        .send()
        .map_err(|e| format!("请求 DeepSeek API 失败：{}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("DeepSeek API 返回错误：{}", response.status()));
    }
    
    // 解析响应（简化示例）
    let json: serde_json::Value = response.json()
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    let total_tokens = json.get("total_tokens")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    
    let total_cost = json.get("total_cost")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    
    Ok(UsageData {
        provider: "deepseek".to_string(),
        provider_name: "DeepSeek".to_string(),
        total_tokens,
        total_cost,
        request_count: 0,
        by_model: vec![],
        period: UsagePeriod {
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
        },
    })
}

/// 查询所有已配置厂商的用量汇总（已废弃）
#[tauri::command]
#[allow(dead_code, unused_variables)]
pub fn query_all_providers_usage(_token: String, start_date: String, end_date: String) -> Result<Vec<UsageData>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 获取所有已启用的 API Key 配置（已使用）
    let _api_keys = conn
        .prepare("SELECT key_id, encrypted_value FROM api_keys WHERE enabled = 1")
        .map_err(|e| format!("查询 API Keys 失败：{}", e))?;
    
    let mut results = Vec::new();
    
    let mut stmt = conn
        .prepare("SELECT key_id, encrypted_value FROM api_keys WHERE enabled = 1")
        .map_err(|e| format!("查询 API Keys 失败：{}", e))?;
    
    let keys = stmt
        .query_map([], |row| {
            let provider: String = row.get(0)?;
            let encrypted: String = row.get(1)?;
            Ok((provider, encrypted))
        })
        .map_err(|e| format!("遍历 API Keys 失败：{}", e))?;
    
    for key in keys {
        match key {
            Ok((provider, encrypted)) => {
                // 解密
                let api_key = crypto::decrypt(&encrypted).map_err(|e| format!("解密失败：{}", e))?;
                
                // 根据提供商调用对应的查询函数
                let usage = match provider.as_str() {
                    "aliyun" => query_aliyun_usage(&api_key, &start_date, &end_date),
                    "zhipu" => query_zhipu_usage(&api_key, &start_date, &end_date),
                    "deepseek" => query_deepseek_usage(&api_key, &start_date, &end_date),
                    "volcengine" => query_volcengine_usage(&api_key, &start_date, &end_date),
                    "baidu" => query_baidu_usage(&api_key, &start_date, &end_date),
                    "tencent" => query_tencent_usage(&api_key, &start_date, &end_date),
                    "iflytek" => query_iflytek_usage(&api_key, &start_date, &end_date),
                    _ => continue, // 跳过不支持的提供商
                };
                
                if let Ok(data) = usage {
                    results.push(data);
                }
            }
            Err(_) => continue, // 跳过有问题的记录
        }
    }
    
    Ok(results)
}

/// 查询火山方舟用量（已废弃）
#[allow(dead_code)]
fn query_volcengine_usage(_api_key: &str, _start_date: &str, _end_date: &str) -> Result<UsageData, String> {
    Err("火山方舟用量查询功能暂未实现".to_string())
}

/// 查询百度千帆用量（已废弃）
#[allow(dead_code)]
fn query_baidu_usage(_api_key: &str, _start_date: &str, _end_date: &str) -> Result<UsageData, String> {
    Err("百度千帆用量查询功能暂未实现".to_string())
}

/// 查询腾讯混元用量（已废弃）
#[allow(dead_code)]
fn query_tencent_usage(_api_key: &str, _start_date: &str, _end_date: &str) -> Result<UsageData, String> {
    Err("腾讯混元用量查询功能暂未实现".to_string())
}

/// 查询讯飞星火用量（已废弃）
#[allow(dead_code)]
fn query_iflytek_usage(_api_key: &str, _start_date: &str, _end_date: &str) -> Result<UsageData, String> {
    Err("讯飞星火用量查询功能暂未实现".to_string())
}

// ==================== 实时用量监控 API ====================

/// 当前实时用量统计（已废弃）
#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct CurrentUsageStats {
    pub total_tokens: i64,
    pub total_cost: f64,
    pub request_count: i64,
    pub by_provider: Vec<ProviderUsage>,
    pub by_department: Vec<DepartmentUsage>,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ProviderUsage {
    pub provider: String,
    pub provider_name: String,
    pub tokens: i64,
    pub cost: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct DepartmentUsage {
    pub department: String,
    pub tokens: i64,
    pub cost: f64,
}

/// 获取当前实时用量统计（从数据库）（已废弃）
#[tauri::command]
#[allow(dead_code, unused_variables)]
pub fn get_current_usage(token: String) -> Result<CurrentUsageStats, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let _user = auth::verify_token(&token, &conn)?;
    
    // 总体统计
    let total_tokens: i64 = conn.query_row(
        "SELECT COALESCE(SUM(total_tokens), 0) FROM token_history",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("查询总Tokens失败：{}", e))?;
    
    let total_cost: f64 = conn.query_row(
        "SELECT COALESCE(SUM(cost), 0.0) FROM token_history",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("查询总成本失败：{}", e))?;
    
    let request_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM token_history",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("查询请求数失败：{}", e))?;
    
    // 按厂商统计
    let mut by_provider = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT provider, SUM(total_tokens) as tokens, SUM(cost) as cost 
         FROM token_history 
         GROUP BY provider 
         ORDER BY cost DESC"
    ).map_err(|e| format!("查询厂商用量失败：{}", e))?;
    
    let rows = stmt.query_map([], |row| {
        Ok(ProviderUsage {
            provider: row.get::<_, String>(0)?,
            provider_name: get_provider_name(&row.get::<_, String>(0)?),
            tokens: row.get::<_, i64>(1)?,
            cost: row.get::<_, f64>(2)?,
        })
    }).map_err(|e| format!("遍历厂商用量失败：{}", e))?;
    
    for row in rows {
        by_provider.push(row.map_err(|e| e.to_string())?);
    }
    
    // 按部门统计（如果有部门配置）
    let mut by_department = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT department, SUM(total_tokens) as tokens, SUM(cost) as cost 
         FROM token_history 
         WHERE department IS NOT NULL AND department != '' 
         GROUP BY department 
         ORDER BY cost DESC"
    ).map_err(|e| format!("查询部门用量失败：{}", e))?;
    
    let rows = stmt.query_map([], |row| {
        Ok(DepartmentUsage {
            department: row.get::<_, String>(0)?,
            tokens: row.get::<_, i64>(1)?,
            cost: row.get::<_, f64>(2)?,
        })
    }).map_err(|e| format!("遍历部门用量失败：{}", e))?;
    
    for row in rows {
        by_department.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(CurrentUsageStats {
        total_tokens,
        total_cost,
        request_count,
        by_provider,
        by_department,
    })
}

/// 获取用量限额配置（已废弃）
#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct UsageQuotaConfig {
    pub enabled: bool,
    pub monthly_quota: f64,  // 月度预算（美元）
    pub warning_threshold: f64,  // 告警阈值（0.8 = 80%）
    pub current_usage: f64,
    pub remaining: f64,
    pub usage_percent: f64,
}

#[tauri::command]
#[allow(dead_code, unused_variables)]
pub fn get_usage_quota_config(_token: String) -> Result<UsageQuotaConfig, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 从配置表读取用量限额配置
    let config_json = conn.query_row(
        "SELECT value FROM config WHERE key = 'usage_quota'",
        [],
        |row| row.get::<_, String>(0),
    );
    
    let (monthly_quota, warning_threshold) = match config_json {
        Ok(json_str) => {
            // 解析JSON配置
            let config: serde_json::Value = serde_json::from_str(&json_str)
                .unwrap_or_else(|_| serde_json::json!({"monthly_quota": 1000.0, "warning_threshold": 0.8}));
            let monthly_quota = config.get("monthly_quota").and_then(|v| v.as_f64()).unwrap_or(1000.0);
            let warning_threshold = config.get("warning_threshold").and_then(|v| v.as_f64()).unwrap_or(0.8);
            (monthly_quota, warning_threshold)
        },
        Err(_) => {
            // 默认配置
            (1000.0, 0.8)
        }
    };
    
    // 计算当前用量
    let current_usage: f64 = conn.query_row(
        "SELECT COALESCE(SUM(cost), 0.0) FROM token_history",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("查询当前用量失败：{}", e))?;
    
    let remaining = monthly_quota - current_usage;
    let usage_percent = if monthly_quota > 0.0 {
        (current_usage / monthly_quota) * 100.0
    } else {
        0.0
    };
    
    Ok(UsageQuotaConfig {
        enabled: true,
        monthly_quota,
        warning_threshold,
        current_usage,
        remaining,
        usage_percent,
    })
}

/// 设置用量限额配置（已废弃）
#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct SetUsageQuotaRequest {
    pub monthly_quota: f64,
    pub warning_threshold: f64,
}

#[tauri::command]
#[allow(dead_code, unused_variables)]
pub fn set_usage_quota_config(token: String, req: SetUsageQuotaRequest) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 权限检查：只有admin和operator可以修改配置
    let _user = auth::verify_token(&token, &conn)?;
    
    if _user.role != "admin" && _user.role != "operator" {
        return Err("权限不足：只有管理员或运维员可以修改用量配置".to_string());
    }
    
    // 保存配置到数据库
    let config = serde_json::json!({
        "monthly_quota": req.monthly_quota,
        "warning_threshold": req.warning_threshold
    });
    
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
        ["usage_quota", &config.to_string()],
    ).map_err(|e| format!("保存配置失败：{}", e))?;
    
    Ok(())
}

// ==================== 辅助函数 ====================

fn get_provider_name(provider: &str) -> String {
    match provider {
        "aliyun" => "阿里云百炼".to_string(),
        "zhipu" => "智谱 AI".to_string(),
        "deepseek" => "DeepSeek".to_string(),
        "volcengine" => "火山方舟".to_string(),
        "baidu" => "百度千帆".to_string(),
        "tencent" => "腾讯混元".to_string(),
        "iflytek" => "讯飞星火".to_string(),
        _ => provider.to_string(),
    }
}
