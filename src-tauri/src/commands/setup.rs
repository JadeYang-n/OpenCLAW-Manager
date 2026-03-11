use serde::{Deserialize, Serialize};
use std::process::Command;

/// 部署方式枚举
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DeployMode {
    Windows,
    Wsl2,
    Docker,
}

/// 环境检测项
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EnvCheckItem {
    pub name: String,
    pub required: bool,
    pub installed: bool,
    pub version: Option<String>,
    pub description: String,
    pub download_url: Option<String>,
    pub auto_fix: Option<String>,  // 将 fix_command 改为 auto_fix 以匹配前端
}

/// 环境检测报告
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EnvCheckReport {
    pub mode: DeployMode,
    pub items: Vec<EnvCheckItem>,
    pub all_passed: bool,
    pub passed_count: usize,
    pub total_count: usize,
}

/// 部署配置
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeployConfig {
    pub mode: DeployMode,
    pub install_path: String,
    pub port: u16,
    pub auto_start: bool,
    pub openclaw_config: OpenClawConfig,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OpenClawConfig {
    pub api_key: String,
    pub model: String,
    pub max_tokens: u32,
}

/// 部署结果
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeployResult {
    pub success: bool,
    pub message: String,
    pub install_path: Option<String>,
}

/// 部署进度（包含日志流）
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JobProgress {
    pub job_id: String,
    pub progress: u8,
    pub message: String,
    pub logs: Vec<String>,
}

/// 检查环境依赖
#[tauri::command]
pub fn check_environment(mode: DeployMode) -> Result<EnvCheckReport, String> {

    let items = match mode {
        DeployMode::Windows => check_windows_env(),
        DeployMode::Wsl2 => check_wsl2_env(),
        DeployMode::Docker => check_docker_env(),
    };

    let total_count = items.len();
    let passed_count = items.iter().filter(|item| item.installed).count();
    let all_passed = passed_count == total_count;

    Ok(EnvCheckReport {
        mode,
        items,
        all_passed,
        passed_count,
        total_count,
    })
}

/// 检查 Windows 原生环境
fn check_windows_env() -> Vec<EnvCheckItem> {
    vec![
        EnvCheckItem {
            name: "Node.js".to_string(),
            required: true,
            installed: check_command_exists("node --version"),
            version: get_command_version("node --version"),
            description: "Node.js 20 或更高版本".to_string(),
            download_url: Some("https://nodejs.org/".to_string()),
            auto_fix: Some("winget install OpenJS.NodeJS.LTS".to_string()),
        },
        EnvCheckItem {
            name: "Git".to_string(),
            required: true,
            installed: check_command_exists("git --version"),
            version: get_command_version("git --version"),
            description: "Git 版本控制工具".to_string(),
            download_url: Some("https://git-scm.com/".to_string()),
            auto_fix: Some("winget install Git.Git".to_string()),
        },
        EnvCheckItem {
            name: "pnpm".to_string(),
            required: true,
            installed: check_command_exists("pnpm --version"),
            version: get_command_version("pnpm --version"),
            description: "pnpm 包管理器".to_string(),
            download_url: Some("https://pnpm.io/".to_string()),
            auto_fix: Some("npm install -g pnpm".to_string()),
        },
    ]
}

/// 检查 WSL2 环境
fn check_wsl2_env() -> Vec<EnvCheckItem> {
    vec![
        EnvCheckItem {
            name: "Node.js".to_string(),
            required: true,
            installed: check_wsl_command("node --version"),
            version: get_wsl_command_version("node --version"),
            description: "Node.js 20 或更高版本（WSL2 内）".to_string(),
            download_url: Some("https://nodejs.org/".to_string()),
            auto_fix: Some("curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs".to_string()),
        },
        EnvCheckItem {
            name: "Git".to_string(),
            required: true,
            installed: check_wsl_command("git --version"),
            version: get_wsl_command_version("git --version"),
            description: "Git 版本控制工具（WSL2 内）".to_string(),
            download_url: Some("https://git-scm.com/".to_string()),
            auto_fix: Some("sudo apt-get update && sudo apt-get install -y git".to_string()),
        },
        EnvCheckItem {
            name: "pnpm".to_string(),
            required: true,
            installed: check_wsl_command("pnpm --version"),
            version: get_wsl_command_version("pnpm --version"),
            description: "pnpm 包管理器（WSL2 内）".to_string(),
            download_url: Some("https://pnpm.io/".to_string()),
            auto_fix: Some("npm install -g pnpm".to_string()),
        },
    ]
}

/// 检查 Docker 环境
fn check_docker_env() -> Vec<EnvCheckItem> {
    vec![
        EnvCheckItem {
            name: "Docker Desktop".to_string(),
            required: true,
            installed: check_command_exists("docker --version"),
            version: get_command_version("docker --version"),
            description: "Docker Desktop for Windows".to_string(),
            download_url: Some("https://www.docker.com/products/docker-desktop/".to_string()),
            auto_fix: Some("winget install -e -i Docker.DockerDesktop".to_string()),
        },
        EnvCheckItem {
            name: "Docker Compose".to_string(),
            required: true,
            installed: check_command_exists("docker compose version"),
            version: get_command_version("docker compose version"),
            description: "Docker Compose（Docker Desktop 已包含）".to_string(),
            download_url: Some("https://docs.docker.com/compose/install/".to_string()),
            auto_fix: None, // Docker Desktop 已包含
        },
    ]
}

/// 检查命令是否存在
fn check_command_exists(cmd: &str) -> bool {
    let parts: Vec<&str> = cmd.split_whitespace().collect();
    if parts.is_empty() {
        return false;
    }

    Command::new(parts[0])
        .args(&parts[1..])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// 获取命令版本
fn get_command_version(cmd: &str) -> Option<String> {
    let parts: Vec<&str> = cmd.split_whitespace().collect();
    if parts.is_empty() {
        return None;
    }

    Command::new(parts[0])
        .args(&parts[1..])
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|s| s.lines().next().unwrap_or("").to_string())
}

/// 检查 WSL2 是否安装
fn check_wsl2_installed() -> bool {
    Command::new("wsl")
        .arg("--list")
        .arg("--verbose")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// 获取 WSL 版本
fn get_wsl_version() -> Option<String> {
    Command::new("wsl")
        .arg("--version")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|s| s.lines().next().unwrap_or("").to_string())
}

/// 检查 Ubuntu 是否安装
fn check_ubuntu_installed() -> bool {
    Command::new("wsl")
        .arg("--list")
        .arg("--verbose")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|s| s.contains("Ubuntu"))
        .unwrap_or(false)
}

/// 检查 WSL 内命令
fn check_wsl_command(cmd: &str) -> bool {
    Command::new("wsl")
        .arg("bash")
        .arg("-c")
        .arg(cmd)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// 获取 WSL 内命令版本
fn get_wsl_command_version(cmd: &str) -> Option<String> {
    Command::new("wsl")
        .arg("bash")
        .arg("-c")
        .arg(cmd)
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|s| s.lines().next().unwrap_or("").to_string())
}

/// 修复环境
#[tauri::command]
pub fn fix_environment(mode: DeployMode, item_name: String) -> Result<bool, String> {
    log::info!("Fixing environment item: {} for mode: {:?}", item_name, mode);

    // TODO: 实现具体修复逻辑
    // 这里可以根据 item_name 执行对应的 fix_command
    // 可以调用 winget、wsl、npm 等命令进行自动安装

    match item_name.as_str() {
        "Node.js" => {
            // 调用 winget 安装 Node.js
            let status = Command::new("winget")
                .args(["install", "-e", "-i", "OpenJS.NodeJS.LTS", "--silent"])
                .status();

            match status {
                Ok(s) if s.success() => Ok(true),
                Ok(s) => Err(format!("安装失败，退出码：{:?}", s.code())),
                Err(e) => Err(format!("执行失败：{}", e)),
            }
        }
        "Git" => {
            let status = Command::new("winget")
                .args(["install", "-e", "-i", "Git.Git", "--silent"])
                .status();

            match status {
                Ok(s) if s.success() => Ok(true),
                Ok(s) => Err(format!("安装失败，退出码：{:?}", s.code())),
                Err(e) => Err(format!("执行失败：{}", e)),
            }
        }
        "WSL2 功能" => {
            let status = Command::new("wsl")
                .arg("--install")
                .status();

            match status {
                Ok(s) if s.success() => Ok(true),
                Ok(s) => Err(format!("安装失败，退出码：{:?}", s.code())),
                Err(e) => Err(format!("执行失败：{}", e)),
            }
        }
        "Docker Desktop" => {
            let status = Command::new("winget")
                .args(["install", "-e", "-i", "Docker.DockerDesktop", "--silent"])
                .status();

            match status {
                Ok(s) if s.success() => Ok(true),
                Ok(s) => Err(format!("安装失败，退出码：{:?}", s.code())),
                Err(e) => Err(format!("执行失败：{}", e)),
            }
        }
        _ => Err(format!("未知的环境项：{}", item_name)),
    }
}

/// 部署 OpenCLAW
#[tauri::command]
pub fn deploy_openclaw(mode: DeployMode, config: DeployConfig) -> Result<DeployResult, String> {
    match mode {
        DeployMode::Windows => deploy_windows(config),
        DeployMode::Wsl2 => deploy_wsl2(config),
        DeployMode::Docker => deploy_docker(config),
    }
}

/// Windows 原生部署
pub fn deploy_windows(config: DeployConfig) -> Result<DeployResult, String> {
    let install_path = config.install_path.clone();

    // 1. 确保安装路径存在
    std::fs::create_dir_all(&install_path)
        .map_err(|e| format!("创建安装目录失败：{}", e))?;

    // 2. 克隆 OpenCLAW 仓库（使用 git）
    let repo_url = "https://github.com/openclaw/openclaw.git";
    let repo_dir = format!("{}/openclaw", install_path);

    log::info!("克隆 OpenCLAW 仓库到 {}", repo_dir);
    let status = Command::new("git")
        .args(["clone", repo_url, &repo_dir])
        .status()
        .map_err(|e| format!("Git 克隆失败：{}", e))?;

    if !status.success() {
        return Err("克隆 OpenCLAW 仓库失败".to_string());
    }

    // 3. 检查 Rust 环境
    let rustc_status = Command::new("rustc").arg("--version").status();
    if rustc_status.is_err() || !rustc_status.unwrap().success() {
        return Err("未检测到 Rust 环境，请安装 rustup：https://rustup.rs".to_string());
    }

    // 4. 构建 release 版本
    log::info!("正在构建 OpenCLAW release 版本...");
    let build_status = Command::new("cargo")
        .args(["build", "--release", "--manifest-path", &format!("{}/Cargo.toml", repo_dir)])
        .status()
        .map_err(|e| format!("构建失败：{}", e))?;

    if !build_status.success() {
        return Err("OpenCLAW 构建失败".to_string());
    }

    // 5. 生成配置文件
    let config_content = r#"
# OpenCLAW 配置文件
server:
  host: "0.0.0.0"
  port: 9000

log:
  level: "info"
  dir: "./logs"
"#;
    let config_path = format!("{}/config.yaml", install_path);
    std::fs::write(&config_path, config_content)
        .map_err(|e| format!("写入配置文件失败：{}", e))?;

    // 6. 启动服务（后台运行）
    log::info!("启动 OpenCLAW 服务...");
    Command::new("cargo")
        .args(["run", "--release", "--manifest-path", &format!("{}/Cargo.toml", repo_dir)])
        .spawn()
        .map_err(|e| format!("启动服务失败：{}", e))?;

    Ok(DeployResult {
        success: true,
        message: format!("OpenCLAW 已成功部署到 {}", install_path),
        install_path: Some(install_path),
    })
}

/// WSL2 部署
pub fn deploy_wsl2(config: DeployConfig) -> Result<DeployResult, String> {
    let install_path = config.install_path.clone();

    // 1. 检查 WSL2 是否可用
    let wsl_check = Command::new("wsl")
        .args(["--version"])
        .output()
        .map_err(|e| format!("WSL2 检测失败：{}", e))?;

    if !wsl_check.status.success() {
        return Err("WSL2 未安装或未启用，请运行：dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all".to_string());
    }

    // 2. 在 WSL2 中克隆仓库
    let repo_url = "https://github.com/openclaw/openclaw.git";
    let repo_dir = format!("{}/openclaw", install_path);

    log::info!("在 WSL2 中克隆 OpenCLAW 仓库到 {}", repo_dir);
    let status = Command::new("wsl")
        .args(["git", "clone", repo_url, &repo_dir])
        .status()
        .map_err(|e| format!("WSL2 克隆失败：{}", e))?;

    if !status.success() {
        return Err("在 WSL2 中克隆 OpenCLAW 仓库失败".to_string());
    }

    // 3. 在 WSL2 中构建
    log::info!("在 WSL2 中构建 OpenCLAW...");
    let build_status = Command::new("wsl")
        .args(["cargo", "build", "--release", "--manifest-path", &format!("{}/Cargo.toml", repo_dir)])
        .status()
        .map_err(|e| format!("WSL2 构建失败：{}", e))?;

    if !build_status.success() {
        return Err("WSL2 中构建 OpenCLAW 失败".to_string());
    }

    // 4. 生成配置文件
    let config_path = format!("{}/config.yaml", install_path);
    let config_content = r#"
# OpenCLAW 配置文件
server:
  host: "0.0.0.0"
  port: 9000

log:
  level: "info"
  dir: "./logs"
"#;
    std::fs::write(&config_path, config_content)
        .map_err(|e| format!("写入配置文件失败：{}", e))?;

    // 5. 启动服务
    log::info!("在 WSL2 中启动 OpenCLAW 服务...");
    Command::new("wsl")
        .args(["cargo", "run", "--release", "--manifest-path", &format!("{}/Cargo.toml", repo_dir)])
        .spawn()
        .map_err(|e| format!("WSL2 启动服务失败：{}", e))?;

    Ok(DeployResult {
        success: true,
        message: format!("OpenCLAW 已在 WSL2 中成功部署到 {}", install_path),
        install_path: Some(install_path),
    })
}

/// Docker 部署
pub fn deploy_docker(config: DeployConfig) -> Result<DeployResult, String> {
    // 1. 检查 Docker 是否可用
    let docker_check = Command::new("docker")
        .arg("--version")
        .output()
        .map_err(|e| format!("Docker 检测失败：{}", e))?;

    if !docker_check.status.success() {
        return Err("Docker 未安装或未运行，请安装 Docker Desktop：https://www.docker.com/products/docker-desktop".to_string());
    }

    // 2. 拉取 OpenCLAW 镜像（如果还没有）
    let image_name = "openclaw/openclaw:latest";
    log::info!("拉取 OpenCLAW 镜像...");
    let pull_status = Command::new("docker")
        .args(["pull", image_name])
        .status()
        .map_err(|e| format!("镜像拉取失败：{}", e))?;

    if !pull_status.success() {
        return Err("拉取 OpenCLAW 镜像失败".to_string());
    }

    // 3. 创建数据卷
    let data_dir = config.install_path.clone();
    let data_path = format!("/app/data/{}", data_dir);

    // 4. 启动容器
    log::info!("启动 OpenCLAW 容器...");
    let port = config.port;

    let container_name = "openclaw-server";
    let run_cmd = format!(
        "docker run -d --name {} -p {}:{} -v {}:/app/data {}",
        container_name, port, port, data_path, image_name
    );

    let status = Command::new("docker")
        .args([
            "run",
            "-d",
            "--name",
            container_name,
            "-p",
            &format!("{}:{}", port, port),
            "-v",
            &format!("{}:/app/data", data_path),
            image_name,
        ])
        .status()
        .map_err(|e| format!("容器启动失败：{}", e))?;

    if !status.success() {
        return Err("启动 OpenCLAW 容器失败".to_string());
    }

    // 5. 验证服务
    std::thread::sleep(std::time::Duration::from_secs(3));
    let health_status = Command::new("docker")
        .args(["exec", container_name, "curl", "-sf", "http://localhost:9000/health"])
        .status();

    if health_status.is_err() || !health_status.unwrap().success() {
        return Err("服务健康检查失败".to_string());
    }

    Ok(DeployResult {
        success: true,
        message: format!("OpenCLAW 已通过 Docker 成功部署，端口：{}", port),
        install_path: Some(data_dir),
    })
}
