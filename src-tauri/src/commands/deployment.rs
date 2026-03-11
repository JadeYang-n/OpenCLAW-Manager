use serde::{Deserialize, Serialize};
use crate::commands::setup::DeployMode;

/// 部署步骤枚举
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum DeployStep {
    SelectMode,     // 选择部署方式
    Checking,       // 环境检测中
    Fixing,         // 环境修复中
    Ready,          // 环境就绪
    Deploying,      // 部署中
    Completed,      // 部署完成
    Error,          // 错误
}

/// 部署状态
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeploymentStatus {
    pub mode: Option<DeployMode>,      // 选择的部署方式
    pub step: DeployStep,              // 当前步骤
    pub message: String,               // 状态消息
    pub items: Vec<String>,            // 待修复的环境项
}

/// 获取当前部署状态
#[tauri::command]
pub fn get_deployment_status() -> DeploymentStatus {
    DeploymentStatus {
        mode: None,
        step: DeployStep::SelectMode,
        message: "请选择部署方式".to_string(),
        items: vec![],
    }
}

/// 设置部署方式
#[tauri::command]
pub fn set_deploy_mode(mode: DeployMode) -> Result<DeploymentStatus, String> {
    let mode_name = get_mode_name(&mode);
    Ok(DeploymentStatus {
        mode: Some(mode),
        step: DeployStep::Checking,
        message: format!("正在检查 {} 环境...", mode_name),
        items: vec![],
    })
}

/// 获取部署方式名称
fn get_mode_name(mode: &DeployMode) -> &'static str {
    match mode {
        DeployMode::Windows => "Windows 原生",
        DeployMode::Docker => "Docker",
        DeployMode::Wsl2 => "WSL2",
    }
}

/// 部署进度信息
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JobProgress {
    pub job_id: String,
    pub progress: u8,        // 0-100
    pub message: String,
    pub logs: Vec<String>,
}

/// 开始一键部署
#[tauri::command]
pub fn start_deployment(mode: DeployMode, install_path: Option<String>, port: Option<u16>) -> Result<JobProgress, String> {
    // 调用 setup.rs 中的部署函数
    use crate::commands::setup::{deploy_windows, deploy_docker, deploy_wsl2, DeployConfig, OpenClawConfig};
    
    let config = DeployConfig {
        mode,
        install_path: install_path.unwrap_or_else(|| "C:\\Program Files\\OpenCLAW".to_string()),
        port: port.unwrap_or(9000),
        auto_start: true,
        openclaw_config: OpenClawConfig {
            api_key: "".to_string(),
            model: "qwen3-coder-next".to_string(),
            max_tokens: 4096,
        },
    };

    let job_id = uuid::Uuid::new_v4().to_string();

    match config.mode {
        DeployMode::Windows => {
            deploy_windows(config).map(|r| JobProgress {
                job_id,
                progress: 100,
                message: r.message,
                logs: vec![
                    "[部署开始] Windows 模式".to_string(),
                    "[检查] 检查 Node.js...".to_string(),
                    "[检查] 检查 Git...".to_string(),
                    "[检查] 检查 winget...".to_string(),
                    "[部署] 克隆 OpenCLAW 仓库...".to_string(),
                    "[部署] 安装依赖...".to_string(),
                    "[部署] 构建项目...".to_string(),
                    "[部署] 生成配置文件...".to_string(),
                    "[部署] 启动服务...".to_string(),
                    "[完成] OpenCLAW 已成功部署到".to_string(),
                ],
            })
        },
        DeployMode::Wsl2 => {
            deploy_wsl2(config).map(|r| JobProgress {
                job_id,
                progress: 100,
                message: r.message,
                logs: vec![
                    "[部署开始] WSL2 模式".to_string(),
                    "[检查] 检查 WSL2...".to_string(),
                    "[检查] 检查 Git...".to_string(),
                    "[检查] 检查 Cargo...".to_string(),
                    "[部署] 克隆 OpenCLAW 仓库到 WSL2...".to_string(),
                    "[部署] 构建项目...".to_string(),
                    "[部署] 生成配置文件...".to_string(),
                    "[部署] 启动服务...".to_string(),
                    "[完成] OpenCLAW 已在 WSL2 中成功部署".to_string(),
                ],
            })
        },
        DeployMode::Docker => {
            deploy_docker(config).map(|r| JobProgress {
                job_id,
                progress: 100,
                message: r.message,
                logs: vec![
                    "[部署开始] Docker 模式".to_string(),
                    "[检查] 检查 Docker Desktop...".to_string(),
                    "[部署] 拉取 OpenCLAW 镜像...".to_string(),
                    "[部署] 创建容器...".to_string(),
                    "[部署] 启动容器...".to_string(),
                    "[完成] OpenCLAW 已在 Docker 中成功部署".to_string(),
                ],
            })
        }
    }
}

/// 获取部署日志（轮询接口）
#[tauri::command]
pub fn get_deployment_log(job_id: String) -> Result<JobProgress, String> {
    // TODO: 从内存/文件存储中查询 job_id 对应的日志
    // 当前返回 mock 数据，后续替换为真实日志
    Ok(JobProgress {
        job_id,
        progress: 100,
        message: "部署已完成".to_string(),
        logs: vec!["开始部署...".to_string(), "检查环境...".to_string(), "部署完成".to_string()],
    })
}
