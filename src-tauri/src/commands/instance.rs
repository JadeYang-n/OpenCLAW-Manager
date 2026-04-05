use crate::services::db;
use crate::middleware::auth;
use crate::util::config_utils;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub id: String,
    pub name: String,
    pub host_ip: String,                // 主机 IP
    pub admin_port: u16,                // 管理端口
    pub status: String,
    pub version: Option<String>,
    pub last_heartbeat: Option<i64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInstanceRequest {
    pub name: String,
    pub host_ip: String,                // 主机 IP
    pub admin_port: u16,                // 管理端口
    pub admin_token: String,            // 管理 Token
    pub config_id: Option<String>,      // 可选：关联的配置 ID
    pub skill_ids: Option<Vec<String>>, // 可选：关联的 Skill ID 列表
    pub department_id: Option<String>,  // 可选：所属部门 ID
    pub skip_test: bool,                // 可选：跳过连接测试（默认 false）
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchOperationRequest {
    pub instance_ids: Vec<String>,
    pub operation: String, // restart, upgrade, start, stop
}

/// 列出所有实例（支持部门数据隔离）
#[tauri::command]
pub fn list_instances(token: String) -> Result<Vec<InstanceInfo>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：运维管理员及以上
    auth::check_permission(&user.role, &["admin", "operator", "dept_admin", "employee", "auditor"], "instance", "list")?;
    
    // 数据隔离：获取用户可访问的部门
    let accessible_dept_ids = db::get_user_accessible_departments(&conn, &user.user_id, &user.role)
        .map_err(|e| e.to_string())?;
    
    // 根据角色过滤实例
    let rows = if user.role == "admin" || user.role == "operator" {
        // 管理员和运维管理员可以看到所有实例
        db::list_instances(&conn).map_err(|e| e.to_string())?
    } else {
        // 部门管理员、员工、审计员只能看到本部门的实例
        db::list_instances_by_departments(&conn, &accessible_dept_ids).map_err(|e| e.to_string())?
    };
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "instance",
        "list",
        "L",
        "success",
        None,
    );
    
    let instances = rows
        .into_iter()
        .map(|(id, name, endpoint, status, version, last_heartbeat, created_at)| {
            // 从 endpoint 解析出 host_ip 和 admin_port
            let endpoint_clean = endpoint.trim_start_matches("http://");
            let parts: Vec<&str> = endpoint_clean.split(':').collect();
            let host_ip = parts[0];
            let admin_port = parts[1].parse().unwrap_or(18789);
            
            InstanceInfo {
                id,
                name,
                host_ip: host_ip.to_string(),
                admin_port,
                status,
                version: if version.is_empty() { None } else { Some(version) },
                last_heartbeat,
                created_at: Some(created_at),
            }
        })
        .collect();
    
    Ok(instances)
}

/// 创建新实例
#[tauri::command]
pub fn create_instance(token: String, req: CreateInstanceRequest) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：运维管理员及以上
    auth::check_permission(&user.role, &["admin", "operator"], "instance", "create")?;
    
    // 构建 OpenClaw 管理 API 端点
    let openclaw_endpoint = format!("http://{}:{}", req.host_ip, req.admin_port);
    
    // 1. 连接测试 - 仅当 skip_test 为 false 时执行
    if !req.skip_test {
        eprintln!("[创建实例] 测试连接：{}", openclaw_endpoint);
        test_openclaw_connection(&openclaw_endpoint, &req.admin_token)?;
    } else {
        eprintln!("[创建实例] 跳过连接测试");
    }
    
    // 2. 获取实例信息（版本号等）- 如果跳过测试，不获取
    let instance_info = if !req.skip_test {
        get_openclaw_instance_info(&openclaw_endpoint, &req.admin_token)?
    } else {
        // 跳过测试时使用默认信息
        eprintln!("[创建实例] 跳过信息获取，使用默认状态");
        InstanceInfoResponse {
            version: "unknown".to_string(),
            status: "offline".to_string(), // 未测试，状态设为 offline
        }
    };
    eprintln!("[创建实例] 连接成功 - 版本：{}, 状态：{}", instance_info.version, instance_info.status);
    
    // 3. 生成实例 ID
    let id = format!("inst-{}", Uuid::new_v4().simple());
    
    // 4. 保存实例信息（存储明文管理 Token，不加密）
    db::create_instance(&conn, &id, &req.name, &openclaw_endpoint, &req.admin_token)
        .map_err(|e| format!("创建失败：{}", e))?;
    
    // 5. 更新实例状态（使用获取到的真实信息）
    db::update_instance_status(&conn, &id, &instance_info.status, Some(&instance_info.version))
        .map_err(|e| format!("更新状态失败：{}", e))?;
    
    // 6. 绑定配置（如果有）
    if let Some(config_id) = &req.config_id {
        db::bind_config_to_instance(&conn, &id, config_id, true)
            .map_err(|e| format!("绑定配置失败：{}", e))?;
    }
    
    // 7. 绑定 Skills（如果有）
    if let Some(skill_ids) = &req.skill_ids {
        for skill_id in skill_ids {
            db::bind_skill_to_instance(&conn, &id, skill_id)
                .map_err(|e| format!("绑定 Skill 失败：{}", e))?;
        }
    }
    
    // 8. 绑定部门（如果有）
    if let Some(dept_id) = &req.department_id {
        db::bind_instance_to_department(&conn, &id, dept_id)
            .map_err(|e| format!("绑定部门失败：{}", e))?;
    }
    
    // 9. 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "instance",
        "create",
        "M",
        "success",
        Some(&format!("{{\"name\": \"{}\", \"host_ip\": \"{}\", \"admin_port\": {}, \"version\": \"{}\", \"status\": \"{}\", \"config_id\": {:?}, \"skill_ids\": {:?}, \"department_id\": {:?}}}", 
            req.name, req.host_ip, req.admin_port, instance_info.version, instance_info.status, req.config_id, req.skill_ids, req.department_id)),
    );
    
    Ok(id)
}

/// 测试连接到 OpenCLAW 实例
fn test_openclaw_connection(endpoint: &str, admin_token: &str) -> Result<(), String> {
    // 构建健康检查 URL
    let health_url = format!("{}/api/health", endpoint.trim_end_matches('/'));
    
    // 创建 HTTP 客户端
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    // 发送健康检查请求，使用管理 Token
    let response = client
        .get(&health_url)
        .header("X-Admin-Token", admin_token)  // 使用管理 Token 鉴权
        .send()
        .map_err(|e| {
            if e.is_timeout() {
                format!("连接超时（10 秒）：{}\n\n请检查：\n1. 设备是否在线\n2. 网络是否通畅\n3. 防火墙是否开放端口", endpoint)
            } else if e.is_connect() {
                format!("无法连接到设备：{}\n\n请检查：\n1. IP 地址/端口是否正确\n2. OpenCLAW 是否正在运行\n3. 设备是否可访问", endpoint)
            } else {
                format!("连接失败：{}\n\n错误详情：{}", endpoint, e)
            }
        })?;
    
    if !response.status().is_success() {
        return Err(format!("API 返回错误状态：{}\n\n可能原因：\n1. 管理 Token 不正确\n2. OpenCLAW 版本不支持此接口", response.status()));
    }
    
    Ok(())
}

/// 获取 OpenCLAW 实例信息
struct InstanceInfoResponse {
    version: String,
    status: String,
}

fn get_openclaw_instance_info(endpoint: &str, admin_token: &str) -> Result<InstanceInfoResponse, String> {
    // 构建信息获取 URL
    let info_url = format!("{}/api/info", endpoint.trim_end_matches('/'));
    
    // 创建 HTTP 客户端
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    // 发送请求，使用管理 Token
    let response = client
        .get(&info_url)
        .header("X-Admin-Token", admin_token)  // 使用管理 Token 鉴权
        .send()
        .map_err(|e| format!("获取实例信息失败：{}", e))?;
    
    if !response.status().is_success() {
        // 如果 /api/info 不存在，返回默认信息
        return Ok(InstanceInfoResponse {
            version: "unknown".to_string(),
            status: "online".to_string(),
        });
    }
    
    // 解析响应
    let json: serde_json::Value = response
        .json()
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    let version = json.get("version")
        .and_then(|v: &serde_json::Value| v.as_str())
        .unwrap_or("unknown")
        .to_string();
    
    let status = json.get("status")
        .and_then(|v: &serde_json::Value| v.as_str())
        .unwrap_or("online")
        .to_string();
    
    Ok(InstanceInfoResponse { version, status })
}

/// 删除实例
#[tauri::command]
pub fn delete_instance(token: String, instance_id: String) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：运维管理员及以上
    auth::check_permission(&user.role, &["admin", "operator"], "instance", "delete")?;
    
    // 删除实例
    db::delete_instance(&conn, &instance_id)
        .map_err(|e| format!("删除失败：{}", e))?;
    
    // 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "instance",
        "delete",
        "H",
        "success",
        Some(&format!("{{\"instance_id\": \"{}\"}}", instance_id)),
    );
    
    Ok(())
}

/// 更新实例状态
#[tauri::command]
pub fn update_instance_status(instance_id: String, status: String, version: Option<String>) -> Result<(), String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    db::update_instance_status(&conn, &instance_id, &status, version.as_deref())
        .map_err(|e| format!("更新失败：{}", e))?;
    
    Ok(())
}

/// 批量操作实例
#[tauri::command]
pub fn batch_operation(token: String, req: BatchOperationRequest) -> Result<Vec<String>, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // 验证 token
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查：运维管理员及以上
    auth::check_permission(&user.role, &["admin", "operator"], "instance", "batch_operation")?;
    
    let mut results = Vec::new();
    
    for instance_id in &req.instance_ids {
        // 获取实例信息
        let instance = db::get_instance(&conn, instance_id)
            .map_err(|e| format!("获取实例 {} 失败：{}", instance_id, e))?;
        
        if instance.is_none() {
            results.push(format!("❌ 实例 {} 不存在", instance_id));
            continue;
        }
        
        let (id, name, endpoint, admin_token, ..) = instance.unwrap();
        
        // 执行操作
        match req.operation.as_str() {
            "restart" => {
                // 调用 OpenCLAW API 重启实例
                match restart_openclaw_instance(&endpoint, &admin_token) {
                    Ok(_) => {
                        results.push(format!("✅ 实例 {} 重启成功", name));
                        // 记录审计日志
                        auth::log_audit_operation(
                            &conn,
                            &user,
                            "instance",
                            "restart",
                            "H",
                            "success",
                            Some(&format!("{{\"instance_id\": \"{}\", \"name\": \"{}\"}}", id, name)),
                        );
                    }
                    Err(e) => {
                        results.push(format!("❌ 实例 {} 重启失败：{}", name, e));
                    }
                }
            }
            "start" => {
                results.push(format!("⚠️ 启动操作暂不支持（实例 {}）", name));
            }
            "stop" => {
                results.push(format!("⚠️ 停止操作暂不支持（实例 {}）", name));
            }
            "upgrade" => {
                results.push(format!("⚠️ 升级操作暂不支持（实例 {}）", name));
            }
            _ => {
                results.push(format!("❌ 未知操作：{}", req.operation));
            }
        }
    }
    
    Ok(results)
}

/// 重启 OpenCLAW 实例（调用其 API）
fn restart_openclaw_instance(endpoint: &str, admin_token: &str) -> Result<(), String> {
    // 构建 OpenCLAW 管理 API URL
    let restart_url = format!("{}/api/admin/restart", endpoint.trim_end_matches('/'));
    
    // 创建 HTTP 客户端
    let client = reqwest::blocking::Client::new();
    
    // 发送重启请求，使用管理 Token
    let response = client
        .post(&restart_url)
        .header("X-Admin-Token", admin_token)  // 使用管理 Token 鉴权
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .map_err(|e| format!("HTTP 请求失败：{}", e))?;
    
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("API 返回错误状态：{}", response.status()))
    }
}

/// 扫描本地实例（18789-18799 端口）
#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoveredInstance {
    pub port: u16,
    pub endpoint: String,
    pub status: String,
    pub admin_token: Option<String>,  // 从配置文件自动读取的 Gateway Token
}

#[tauri::command]
pub fn scan_local_instances(token: String) -> Result<Vec<DiscoveredInstance>, String> {
    use std::net::TcpStream;
    use std::time::Duration;
    
    eprintln!("[scan] 开始扫描，token长度: {}", token.len());
    
    // 验证token
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn).map_err(|e| e.to_string())?;
    auth::check_permission(&user.role, &["admin", "operator", "auditor"], "instance", "read")?;
    
    eprintln!("[scan] token验证通过，用户: {:?}", user.username);
    
    // 尝试从配置文件读取Gateway Token
    if let Some(config) = config_utils::read_local_gateway_config() {
        eprintln!("[scan] 从配置文件读取 Gateway Config: {:?}", config);
        let auto_token = config.admin_token.clone();
        eprintln!("[scan] 自动读取到的 Token: {:?}", auto_token.as_ref().map(|t| &t[..10]));
        let auto_token_clone = auto_token.clone();
        eprintln!("[scan] auto_token_clone: {:?}", auto_token_clone);
    }
    let auto_token = config_utils::read_local_gateway_config()
        .and_then(|c| c.admin_token)
        .or_else(|| {
            eprintln!("[scan] 未从配置文件读取到 admin_token，将提示用户输入");
            None
        });
    
    let mut discovered = Vec::new();
    
    // 扫描 18789-18793 端口（根据你的情况，只扫描实际使用的端口）
    for port in 18789..=18793 {
        eprintln!("[scan] 尝试连接端口: {}", port);
        
        // 尝试 TCP 连接
        let result = TcpStream::connect_timeout(
            &format!("127.0.0.1:{}", port).parse().unwrap(),
            Duration::from_millis(200)  // 减少到200ms
        );
        
        if result.is_ok() {
            eprintln!("[scan] 端口 {} 在线", port);
            discovered.push(DiscoveredInstance {
                port,
                endpoint: format!("http://127.0.0.1:{}", port),
                status: "online".to_string(),
                admin_token: auto_token.clone(),  // 自动填充从配置文件读取的 Token
            });
        } else {
            eprintln!("[scan] 端口 {} 离线", port);
        }
    }
    
    eprintln!("[scan] 扫描完成，发现 {} 个实例", discovered.len());
    Ok(discovered)
}

/// 快速添加本地实例
#[derive(Debug, Serialize, Deserialize)]
pub struct AddLocalInstanceRequest {
    pub port: u16,
    pub admin_token: String,            // 修改为管理 Token
}

#[tauri::command]
pub fn add_local_instance(token: String, req: AddLocalInstanceRequest) -> Result<String, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    auth::check_permission(&user.role, &["admin", "operator"], "instance", "create")?;
    
    let endpoint = format!("http://127.0.0.1:{}", req.port);
    
    // 1. 验证管理 Token 有效性
    // 只要 TCP 连接成功且能访问 /health 端点，就认为实例可用
    // 管理 Token 会在后续的 API 调用中生效
    let health_endpoints = [
        "/health",           // 标准健康检查
        "/v1/health",        // v1 健康检查
        "/api/health",       // OpenCLAW API 健康检查
        "/api/info",         // OpenCLAW API 信息
    ];
    
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    let mut version = "unknown".to_string();
    let mut validated = false;
    let mut last_error = String::new();
    
    // 尝试不同的健康检查端点
    for health_path in &health_endpoints {
        let health_url = format!("{}{}", endpoint, health_path);
        
        match client
            .get(&health_url)
            .header("X-Admin-Token", req.admin_token.clone())  // 使用管理 Token
            .send()
        {
            Ok(response) => {
                let status = response.status();
                
                // 401/403 表示管理 Token 错误，但不立即返回错误
                if status == reqwest::StatusCode::UNAUTHORIZED 
                    || status == reqwest::StatusCode::FORBIDDEN {
                    last_error = format!("管理 Token 验证失败：HTTP {} (请检查管理 Token 是否正确)", status);
                    // 不立即返回，继续尝试其他端点
                    continue;
                }
                
                // 200-299 表示成功
                if status.is_success() {
                    // 尝试获取版本信息（如果是 JSON 响应）
                    if let Ok(json) = response.json::<serde_json::Value>() {
                        let has_version = json.get("version").is_some() || json.get("openclaw_version").is_some();
                        if version == "unknown" {
                            version = json
                                .get("version")
                                .or_else(|| json.get("openclaw_version"))
                                .and_then(|v| v.as_str())
                                .unwrap_or("unknown")
                                .to_string();
                        }
                        // 找到有效的版本信息，验证通过
                        if has_version {
                            validated = true;
                            break;
                        }
                    } else {
                        // 无法解析 JSON，但连接成功，记录为已验证
                        validated = true;
                        break;
                    }
                }
            }
            Err(e) => {
                last_error = format!("无法连接到{}: {}", health_path, e);
            }
        }
    }
    
    // 验证失败，返回错误
    if !validated {
        return Err(last_error.is_empty()
            .then(|| "无法连接到 OpenCLAW 实例，请确认实例已启动且网络正常".to_string())
            .unwrap_or(last_error));
    }
    
    let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S").to_string();
    let name = format!("本地实例 - {} - {}", req.port, timestamp);
    
    // 2. 保存实例信息（不加密管理 Token）
    let id = format!("inst-{}", Uuid::new_v4().simple());
    db::create_instance(&conn, &id, &name, &endpoint, &req.admin_token)
        .map_err(|e| format!("创建实例失败：{}", e))?;
    
    // 3. 更新状态为 online
    db::update_instance_status(&conn, &id, "online", Some(&version))
        .map_err(|e| format!("更新状态失败：{}", e))?;
    
    // 4. 记录审计日志
    let audit_id = format!("audit-{}", Uuid::new_v4().simple());
    let _ = db::log_audit(
        &conn,
        &audit_id,
        &user.user_id,
        &user.username,
        "instance",
        "add_local_instance",
        "M",
        "success",
        Some(&format!("endpoint={}, version={}", endpoint, version)),
        None,
    );
    
    Ok(id)
}

/// 获取实例详情
#[tauri::command]
pub fn get_instance_detail(instance_id: String) -> Result<InstanceInfo, String> {
    let _conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // TODO: 查询单个实例详情
    // 暂时返回模拟数据
    Ok(InstanceInfo {
        id: instance_id,
        name: "示例实例".to_string(),
        host_ip: "127.0.0.1".to_string(),
        admin_port: 18789,
        status: "running".to_string(),
        version: Some("2026.2.0".to_string()),
        last_heartbeat: Some(chrono::Utc::now().timestamp()),
        created_at: Some("2026-03-10T00:00:00".to_string()),
    })
}
