use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Gateway配置结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct GatewayConfig {
    pub port: Option<u16>,
    pub admin_token: Option<String>,
    pub admin_port: Option<u16>,
}

/// 探测OpenClaw配置文件位置
pub fn detect_config_file() -> Option<PathBuf> {
    // 常见的配置文件路径
    let possible_paths = [
        // Windows
        PathBuf::from("C:/Users/vip/.openclaw-autoclaw/openclaw.json"),
        PathBuf::from("C:/Users/vip/.openclaw-autoclaw/config.json"),
        // 通用路径
        dirs::home_dir()?.join(".openclaw-autoclaw/openclaw.json"),
        dirs::home_dir()?.join(".openclaw-autoclaw/config.json"),
    ];
    
    for path in possible_paths {
        if path.exists() {
            eprintln!("[配置探测] 找到配置文件: {:?}", path);
            return Some(path);
        }
    }
    
    eprintln!("[配置探测] 未找到配置文件");
    None
}

/// 从配置文件中读取Gateway Token
pub fn _read_gateway_token_from_config() -> Option<String> {
    let config_path = detect_config_file()?;
    
    match fs::read_to_string(&config_path) {
        Ok(content) => {
            if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                // 尝试从不同位置读取admin_token
                // 1. 直接读取 admin_token 字段
                if let Some(token) = config.get("admin_token").and_then(|v| v.as_str()) {
                    eprintln!("[配置读取] 从根级别读取 admin_token");
                    return Some(token.to_string());
                }
                
                // 2. 从 gateway 字段中读取
                if let Some(gateway) = config.get("gateway") {
                    if let Some(token) = gateway.get("admin_token").and_then(|v| v.as_str()) {
                        eprintln!("[配置读取] 从 gateway.admin_token 读取");
                        return Some(token.to_string());
                    }
                    if let Some(port) = gateway.get("admin_port").and_then(|v| v.as_u64()) {
                        eprintln!("[配置读取] 从 gateway.admin_port 读取: {}", port);
                    }
                }
                
                // 3. 从 openclaw 字段中读取
                if let Some(openclaw) = config.get("openclaw") {
                    if let Some(token) = openclaw.get("admin_token").and_then(|v| v.as_str()) {
                        eprintln!("[配置读取] 从 openclaw.admin_token 读取");
                        return Some(token.to_string());
                    }
                }
            }
            
            eprintln!("[配置读取] 配置文件存在但未找到 admin_token 字段");
            None
        }
        Err(e) => {
            eprintln!("[配置读取] 读取配置文件失败: {}", e);
            None
        }
    }
}

/// 从配置文件中读取完整的Gateway配置
pub fn read_gateway_config() -> Option<GatewayConfig> {
    let config_path = detect_config_file()?;
    
    match fs::read_to_string(&config_path) {
        Ok(content) => {
            if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                let port = config.get("port").and_then(|v| v.as_u64()).map(|p| p as u16);
                let admin_token = config
                    .get("admin_token")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                let admin_port = config
                    .get("admin_port")
                    .and_then(|v| v.as_u64())
                    .map(|p| p as u16);
                
                let config = GatewayConfig {
                    port,
                    admin_token,
                    admin_port,
                };
                
                eprintln!("[配置读取] 成功读取配置: {:?}", config);
                Some(config)
            } else {
                eprintln!("[配置读取] 配置文件不是有效的JSON");
                None
            }
        }
        Err(e) => {
            eprintln!("[配置读取] 读取配置文件失败: {}", e);
            None
        }
    }
}

/// 读取本地实例的Gateway配置(自动发现)
pub fn read_local_gateway_config() -> Option<GatewayConfig> {
    // 尝试从环境变量读取
    if let Ok(port_str) = std::env::var("OPENCLAW_ADMIN_PORT") {
        if let Ok(port) = port_str.parse::<u16>() {
            let admin_token = std::env::var("OPENCLAW_ADMIN_TOKEN").ok();
            return Some(GatewayConfig {
                port: Some(port),
                admin_token,
                admin_port: Some(port),
            });
        }
    }
    
    // 尝试从配置文件读取
    read_gateway_config()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_config() {
        let path = detect_config_file();
        println!("Config path: {:?}", path);
    }

    #[test]
    fn test_read_config() {
        let config = read_local_gateway_config();
        println!("Config: {:?}", config);
    }
}
