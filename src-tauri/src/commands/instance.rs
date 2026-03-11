use crate::services::db;
use crate::middleware::auth;
use crate::crypto;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub id: String,
    pub name: String,
    pub endpoint: String,
    pub status: String,
    pub version: Option<String>,
    pub last_heartbeat: Option<i64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInstanceRequest {
    pub name: String,
    pub endpoint: String,
    pub api_key: String,
    pub config_id: Option<String>,      // 可选：关联的配置 ID
    pub skill_ids: Option<Vec<String>>, // 可选：关联的 Skill ID 列表
    pub department_id: Option<String>,  // 可选：所属部门 ID
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
        .map(|(id, name, endpoint, status, version, last_heartbeat, created_at)| InstanceInfo {
            id,
            name,
            endpoint,
            status,
            version: if version.is_empty() { None } else { Some(version) },
            last_heartbeat,
            created_at: Some(created_at),
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
    
    // 1. 连接测试 - 验证 endpoint 是否可访问
    eprintln!("[创建实例] 测试连接：{}", req.endpoint);
    test_openclaw_connection(&req.endpoint, &req.api_key)?;
    
    // 2. 获取实例信息（版本号等）
    let instance_info = get_openclaw_instance_info(&req.endpoint, &req.api_key)?;
    eprintln!("[创建实例] 连接成功 - 版本：{}, 状态：{}", instance_info.version, instance_info.status);
    
    // 3. 生成实例 ID
    let id = format!("inst-{}", Uuid::new_v4().simple());
    
    // 4. 加密 API Key（AES-256-GCM）
    let api_key_encrypted = crypto::encrypt(&req.api_key)
        .map_err(|e| format!("API Key 加密失败：{}", e))?;
    
    // 5. 创建实例（包含获取到的版本信息）
    db::create_instance(&conn, &id, &req.name, &req.endpoint, &api_key_encrypted)
        .map_err(|e| format!("创建失败：{}", e))?;
    
    // 6. 更新实例状态（使用获取到的真实信息）
    db::update_instance_status(&conn, &id, &instance_info.status, Some(&instance_info.version))
        .map_err(|e| format!("更新状态失败：{}", e))?;
    
    // 7. 绑定配置（如果有）
    if let Some(config_id) = &req.config_id {
        db::bind_config_to_instance(&conn, &id, config_id, true)
            .map_err(|e| format!("绑定配置失败：{}", e))?;
    }
    
    // 8. 绑定 Skills（如果有）
    if let Some(skill_ids) = &req.skill_ids {
        for skill_id in skill_ids {
            db::bind_skill_to_instance(&conn, &id, skill_id)
                .map_err(|e| format!("绑定 Skill 失败：{}", e))?;
        }
    }
    
    // 9. 绑定部门（如果有）
    if let Some(dept_id) = &req.department_id {
        db::bind_instance_to_department(&conn, &id, dept_id)
            .map_err(|e| format!("绑定部门失败：{}", e))?;
    }
    
    // 10. 记录审计日志
    auth::log_audit_operation(
        &conn,
        &user,
        "instance",
        "create",
        "M",
        "success",
        Some(&format!("{{\"name\": \"{}\", \"endpoint\": \"{}\", \"version\": \"{}\", \"status\": \"{}\", \"config_id\": {:?}, \"skill_ids\": {:?}, \"department_id\": {:?}}}", 
            req.name, req.endpoint, instance_info.version, instance_info.status, req.config_id, req.skill_ids, req.department_id)),
    );
    
    Ok(id)
}

/// 测试连接到 OpenCLAW 实例
fn test_openclaw_connection(endpoint: &str, api_key: &str) -> Result<(), String> {
    // 构建健康检查 URL
    let health_url = format!("{}/api/health", endpoint.trim_end_matches('/'));
    
    // 创建 HTTP 客户端
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    // 发送健康检查请求
    let response = client
        .get(&health_url)
        .header("Authorization", format!("Bearer {}", api_key))
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
        return Err(format!("API 返回错误状态：{}\n\n可能原因：\n1. API Key 不正确\n2. OpenCLAW 版本不支持此接口", response.status()));
    }
    
    Ok(())
}

/// 获取 OpenCLAW 实例信息
struct InstanceInfoResponse {
    version: String,
    status: String,
}

fn get_openclaw_instance_info(endpoint: &str, api_key: &str) -> Result<InstanceInfoResponse, String> {
    // 构建信息获取 URL
    let info_url = format!("{}/api/info", endpoint.trim_end_matches('/'));
    
    // 创建 HTTP 客户端
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    // 发送请求
    let response = client
        .get(&info_url)
        .header("Authorization", format!("Bearer {}", api_key))
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
        
        let (id, name, endpoint, api_key, ..) = instance.unwrap();
        
        // 执行操作
        match req.operation.as_str() {
            "restart" => {
                // 调用 OpenCLAW API 重启实例
                match restart_openclaw_instance(&endpoint, &api_key) {
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
fn restart_openclaw_instance(endpoint: &str, api_key_encrypted: &str) -> Result<(), String> {
    // 解密 API Key
    let api_key = crypto::decrypt(api_key_encrypted)
        .map_err(|e| format!("API Key 解密失败：{}", e))?;
    
    // 构建 OpenCLAW 管理 API URL
    let restart_url = format!("{}/api/admin/restart", endpoint.trim_end_matches('/'));
    
    // 创建 HTTP 客户端
    let client = reqwest::blocking::Client::new();
    
    // 发送重启请求
    let response = client
        .post(&restart_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .map_err(|e| format!("HTTP 请求失败：{}", e))?;
    
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("API 返回错误状态：{}", response.status()))
    }
}

/// 获取实例详情
#[tauri::command]
pub fn get_instance_detail(instance_id: String) -> Result<InstanceInfo, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    
    // TODO: 查询单个实例详情
    // 暂时返回模拟数据
    Ok(InstanceInfo {
        id: instance_id,
        name: "示例实例".to_string(),
        endpoint: "http://localhost:18789".to_string(),
        status: "running".to_string(),
        version: Some("2026.2.0".to_string()),
        last_heartbeat: Some(chrono::Utc::now().timestamp()),
        created_at: Some("2026-03-10T00:00:00".to_string()),
    })
}
