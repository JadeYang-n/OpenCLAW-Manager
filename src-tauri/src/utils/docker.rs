use std::process::Command;

/// 检查 Docker 是否可用
pub fn is_docker_available() -> bool {
    Command::new("docker")
        .arg("--version")
        .output()
        .is_ok()
}

/// 检查 Docker Compose 是否可用
pub fn is_docker_compose_available() -> bool {
    Command::new("docker-compose")
        .arg("--version")
        .output()
        .is_ok()
}

/// 执行 Docker Compose 命令
pub fn run_docker_compose_command(
    args: &[&str],
    working_dir: &str,
) -> Result<String, String> {
    let output = Command::new("docker-compose")
        .args(args)
        .current_dir(working_dir)
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(stderr)
    }
}

/// 启动 Docker Compose 服务
pub fn start_docker_compose(working_dir: &str) -> Result<String, String> {
    run_docker_compose_command(&["up", "-d"], working_dir)
}

/// 停止 Docker Compose 服务
pub fn stop_docker_compose(working_dir: &str) -> Result<String, String> {
    run_docker_compose_command(&["down"], working_dir)
}

/// 检查 Docker Compose 服务状态
pub fn check_docker_compose_status(working_dir: &str) -> Result<String, String> {
    run_docker_compose_command(&["ps"], working_dir)
}

/// 查看 Docker Compose 日志
pub fn get_docker_compose_logs(working_dir: &str, follow: bool) -> Result<String, String> {
    let mut args = vec!["logs"];
    if follow {
        args.push("-f");
    }
    run_docker_compose_command(&args, working_dir)
}

/// 拉取 Docker 镜像
pub fn pull_docker_image(image: &str) -> Result<String, String> {
    let output = Command::new("docker")
        .args(["pull", image])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(stderr)
    }
}

/// 检查 Docker 镜像是否存在
pub fn is_docker_image_exists(image: &str) -> bool {
    let output = Command::new("docker")
        .args(["images", "-q", image])
        .output();
    
    match output {
        Ok(output) => {
            output.status.success() && !String::from_utf8_lossy(&output.stdout).trim().is_empty()
        }
        Err(_) => false,
    }
}
