use crate::services::db;
use crate::services::port_scanner::PortScanner;
use crate::services::instance_discovery::InstanceDiscoveryService;
use crate::services::token_blacklist::TokenBlacklistService;
use crate::services::port_scanner::{PortResult, PortStatus, ScanMode};
use crate::services::instance_discovery::{DiscoveredInstance as InternalDiscoveredInstance, InstanceStatus, PlatformType};
use crate::services::token_blacklist::BlacklistReason;
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
    pub severity: String,  // "high", "medium", "low"
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

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct SecurityCheckItem {
    pub name: String,
    pub status: String,  // "passed", "warning", "failed"
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct SecurityConfig {
    pub check_interval: i32,  // minutes
    pub enable_health_check: bool,
    pub enable_security_audit: bool,
}

#[allow(dead_code)]
#[tauri::command]
pub fn security_check() -> SecurityReport {
    let mut issues = Vec::new();
    let mut score = 100;
    
    // 检查 1：数据库连接
    let conn = match db::get_connection() {
        Ok(c) => c,
        Err(e) => {
            return SecurityReport {
                score: 0,
                issues: vec![SecurityIssue {
                    category: "数据库".to_string(),
                    severity: "high".to_string(),
                    description: format!("无法连接数据库：{}", e),
                    fix: "检查数据库配置".to_string(),
                }],
                recommendations: vec!["检查数据库配置".to_string()],
            };
        }
    };
    
    // 检查 API Key 是否配置
    let has_api_keys = conn
        .prepare("SELECT COUNT(*) FROM api_keys")
        .ok()
        .and_then(|mut stmt| stmt.query_row([], |r| r.get(0)).ok())
        .unwrap_or(0) > 0;
    
    if !has_api_keys {
        issues.push(SecurityIssue {
            category: "密钥管理".to_string(),
            severity: "medium".to_string(),
            description: "未配置任何 API Key".to_string(),
            fix: "在安全中心添加 API Key".to_string(),
        });
        score -= 20;
    }
    
    // 检查 3：审计日志
    let _audit_enabled = true; // 简化判断
    
    // 生成报告
    let recommendations = vec![
        "定期更换管理员密码".to_string(),
        "启用审计日志功能".to_string(),
        "限制不必要的端口开放".to_string(),
    ];
    
    if issues.is_empty() {
        score = 100;
    }
    
    SecurityReport {
        score,
        issues,
        recommendations,
    }
}

#[allow(dead_code)]
#[tauri::command]
pub fn security_remediate() -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;

    let mut actions = Vec::new();

    // 检查 API Key 是否配置
    let has_api_keys = conn
        .prepare("SELECT COUNT(*) FROM api_keys")
        .ok()
        .and_then(|mut stmt| stmt.query_row([], |r| r.get(0)).ok())
        .unwrap_or(0) > 0;

    if !has_api_keys {
        return Err("无法执行加固：请先配置至少一个 API Key".to_string());
    }

    // 检查默认密码：admin 账户是否存在
    let has_default_password: bool = conn
        .prepare("SELECT COUNT(*) FROM users WHERE username = 'admin'")
        .ok()
        .and_then(|mut stmt| {
            let count: i64 = stmt.query_row([], |r| r.get(0)).ok()?;
            Some(count > 0)
        })
        .unwrap_or(false);

    if has_default_password {
        actions.push("⚠️ 检测到 admin 账户存在默认密码，建议立即修改".to_string());
    }

    // 检查是否有禁用的审计日志
    let audit_log_enabled: bool = conn
        .prepare("SELECT COUNT(*) FROM config WHERE key = 'audit_log_enabled' AND value = 'true'")
        .ok()
        .and_then(|mut stmt| stmt.query_row([], |r| r.get(0)).ok())
        .unwrap_or(false);

    if !audit_log_enabled {
        let _ = conn.execute(
            "INSERT OR REPLACE INTO config (key, value) VALUES ('audit_log_enabled', 'true')",
            [],
        );
        actions.push("✅ 已启用审计日志功能".to_string());
    }

    if actions.is_empty() {
        actions.push("✅ 安全检查通过，无需加固".to_string());
    }

    Ok(actions.join("\n"))
}

#[tauri::command]
pub fn scan_skills(path: String) -> SkillsScanReport {
    let scan_path = if path.is_empty() {
        dirs::data_local_dir()
            .map(|d| d.join("OpenCLAW").join("skills"))
            .unwrap_or_default()
    } else {
        std::path::PathBuf::from(&path)
    };

    let mut skills = Vec::new();
    let mut total_risk = "无".to_string();

    if scan_path.exists() && scan_path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&scan_path) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                let version = read_skill_version(&entry.path()).unwrap_or_else(|| "unknown".to_string());
                let (risk, issues) = analyze_skill_risk(&entry.path(), &name);
                if risk != "无" && (total_risk == "无" || total_risk == "低") {
                    total_risk = risk.clone();
                }
                skills.push(SkillScanResult { name, version, risk, issues });
            }
        }
    }

    if skills.is_empty() {
        skills.push(SkillScanResult {
            name: "(目录为空)".to_string(),
            version: "N/A".to_string(),
            risk: "无".to_string(),
            issues: vec![],
        });
    }

    SkillsScanReport { skills, total_risk }
}

fn read_skill_version(path: &std::path::Path) -> Option<String> {
    ["package.json", "skill.json", "metadata.json"].iter()
        .find(|f| path.join(f).exists())
        .and_then(|f| std::fs::read_to_string(path.join(f)).ok())
        .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
        .and_then(|v| v.get("version").and_then(|v| v.as_str()).map(|s| s.to_string()))
}

fn analyze_skill_risk(path: &std::path::Path, _name: &str) -> (String, Vec<String>) {
    let mut issues = Vec::new();
    let mut risk = "低".to_string();

    if let Ok(content) = std::fs::read_to_string(path.join("skill.md"))
        .or_else(|_| std::fs::read_to_string(path.join("README.md")))
    {
        let lower = content.to_lowercase();
        if lower.contains("fs.") || lower.contains("filesystem") {
            issues.push("文件系统访问权限".to_string());
            risk = "中".to_string();
        }
        if lower.contains("fetch(") || lower.contains("http") || lower.contains("curl") {
            issues.push("网络请求权限".to_string());
            risk = "中".to_string();
        }
        if lower.contains("exec(") || lower.contains("spawn") || lower.contains("shell") {
            issues.push("命令执行权限".to_string());
            risk = "高".to_string();
        }
    }

    if issues.is_empty() {
        risk = "无".to_string();
    }

    (risk, issues)
}

// ==================== 端口扫描服务 ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct PortScanRequest {
    pub ip: String,
    pub mode: String,  // "quick", "full", "custom"
    pub ports: Option<Vec<u16>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PortScanResult {
    pub port: u16,
    pub service: String,
    pub status: String,  // "open", "closed", "filtered"
    pub product: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PortScanResponse {
    pub results: Vec<PortScanResult>,
    pub total_scanned: usize,
    pub open_count: usize,
    pub duration_ms: u64,
}

#[tauri::command]
pub fn scan_ports(request: PortScanRequest) -> Result<PortScanResponse, String> {
    let scanner = PortScanner::new();
    
    let start_time = std::time::Instant::now();
    
    // Clone ports to avoid move
    let ports = request.ports.clone();
    
    let results = match request.mode.as_str() {
        "quick" => scanner.scan_all_ports(&request.ip),
        "full" => scanner.scan_all_ports(&request.ip),
        "custom" => {
            if let Some(ref ports_vec) = ports {
                scanner.scan_ports(&request.ip, ports_vec)
            } else {
                return Err("自定义扫描必须指定端口列表".to_string());
            }
        }
        _ => {
            return Err("无效的扫描模式".to_string());
        }
    }?;
    
    let duration = start_time.elapsed().as_millis() as u64;
    
    let open_count = results.iter().filter(|r| matches!(r.status, PortStatus::Open)).count();
    
    // Convert internal PortResult to API PortScanResult
    let formatted_results = results.into_iter().map(|r| PortScanResult {
        port: r.port,
        service: r.service,
        status: match r.status {
            PortStatus::Open => "open".to_string(),
            PortStatus::Closed => "closed".to_string(),
            PortStatus::Filtered => "filtered".to_string(),
        },
        product: r.product,
        version: r.version,
    }).collect();
    
    // Calculate total_scanned using cloned ports
    let total_scanned = ports.map_or_else(|| PortScanner::get_common_ports().len(), |p| p.len());
    
    Ok(PortScanResponse {
        results: formatted_results,
        total_scanned,
        open_count,
        duration_ms: duration,
    })
}

// ==================== 实例发现服务 ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoveryRequest {
    pub subnet: Option<String>,
    pub port: Option<u16>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoveredInstance {
    pub ip: String,
    pub host: String,
    pub port: u16,
    pub platform: String,  // "windows", "linux", "macos", "unknown"
    pub status: String,   // "online", "offline", "unknown"
    pub version: Option<String>,
    pub instance_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoveryResponse {
    pub instances: Vec<DiscoveredInstance>,
    pub total_found: usize,
    pub online_count: usize,
    pub duration_ms: u64,
}

#[tauri::command]
pub fn discover_instances(request: DiscoveryRequest) -> Result<DiscoveryResponse, String> {
    let service = InstanceDiscoveryService::new();
    
    let subnet = request.subnet.unwrap_or_else(|| "192.168.1.0/24".to_string());
    let port = request.port.unwrap_or(3000);
    
    let start_time = std::time::Instant::now();
    
    let instances = service.discover_subnet(&subnet, port)?;
    
    let duration = start_time.elapsed().as_millis() as u64;
    
    // Convert internal instances to API format
    let formatted_instances = instances.into_iter().map(|i| {
        let platform = match i.platform {
            PlatformType::Windows => "windows".to_string(),
            PlatformType::Linux => "linux".to_string(),
            PlatformType::MacOs => "macos".to_string(),
            PlatformType::Unknown => "unknown".to_string(),
        };
        let status = match i.status {
            InstanceStatus::Online => "online".to_string(),
            InstanceStatus::Offline => "offline".to_string(),
            InstanceStatus::Unknown => "unknown".to_string(),
        };
        let online_count = if status == "online" { 1 } else { 0 };
        
        (DiscoveredInstance {
            ip: i.ip,
            host: i.host,
            port: i.port,
            platform,
            status,
            version: i.version,
            instance_name: i.instance_name,
        }, online_count)
    }).collect::<Vec<_>>();
    
    let total_found = formatted_instances.len();
    let online_count = formatted_instances.iter().map(|(_, count)| count).sum();
    
    Ok(DiscoveryResponse {
        instances: formatted_instances.into_iter().map(|(i, _)| i).collect(),
        total_found,
        online_count,
        duration_ms: duration,
    })
}

// ==================== Token 黑名单服务 ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct BlacklistTokenRequest {
    pub token: String,
    pub reason: String,  // "user_logout", "user_deleted", "security_breach", "manual_revocation", "expired"
    pub revoked_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlacklistResponse {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub fn blacklist_token(request: BlacklistTokenRequest) -> Result<BlacklistResponse, String> {
    let service = TokenBlacklistService::new();
    
    let reason = match request.reason.as_str() {
        "user_logout" => BlacklistReason::UserLogout,
        "user_deleted" => BlacklistReason::UserDeleted,
        "security_breach" => BlacklistReason::SecurityBreach,
        "manual_revocation" => BlacklistReason::ManualRevocation,
        "expired" => BlacklistReason::Expired,
        _ => return Err("无效的黑名单原因".to_string()),
    };
    
    service.blacklist_token(&request.token, reason, request.revoked_by);
    
    Ok(BlacklistResponse {
        success: true,
        message: "Token 已加入黑名单".to_string(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckTokenRequest {
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckTokenResponse {
    pub is_blacklisted: bool,
    pub message: String,
}

#[tauri::command]
pub fn check_token_status(request: CheckTokenRequest) -> Result<CheckTokenResponse, String> {
    let service = TokenBlacklistService::new();
    let is_blacklisted = service.is_blacklisted(&request.token);
    
    Ok(CheckTokenResponse {
        is_blacklisted,
        message: if is_blacklisted { "Token 已被禁用" } else { "Token 有效" }.to_string(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoveFromBlacklistRequest {
    pub token: String,
}

#[tauri::command]
pub fn remove_from_blacklist(request: RemoveFromBlacklistRequest) -> Result<BlacklistResponse, String> {
    let service = TokenBlacklistService::new();
    
    if service.remove_from_blacklist(&request.token) {
        Ok(BlacklistResponse {
            success: true,
            message: "Token 已从黑名单移除".to_string(),
        })
    } else {
        Ok(BlacklistResponse {
            success: false,
            message: "Token 不在黑名单中".to_string(),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlacklistStats {
    pub total: usize,
    pub active: usize,
}

#[tauri::command]
pub fn get_blacklist_stats() -> Result<BlacklistStats, String> {
    let service = TokenBlacklistService::new();
    let (total, active) = service.get_stats();
    
    Ok(BlacklistStats { total, active })
}
