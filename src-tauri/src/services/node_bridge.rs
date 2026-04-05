use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

pub fn start_node_service() {
    // 检查端口是否被占用
    if !check_port_available(3456) {
        // 检查是否是OCM服务
        if health_check(3456) {
            println!("Node.js service is already running");
            return;
        } else {
            println!("Port 3456 is occupied by another process");
            return;
        }
    }

    // 启动Node.js服务
    let node_path = find_node_exe();
    if let Some(node) = node_path {
        println!("Starting Node.js service...");
        let _ = Command::new(node.clone())
            .arg("../../../packages/node-services/src/server.js")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("Failed to start Node.js service");

        // 启动监控线程
        let node_clone = node;
        thread::spawn(move || {
            loop {
                thread::sleep(Duration::from_secs(5));
                if !health_check(3456) {
                    println!("Node.js service is down, restarting...");
                    // 重新启动
                    let _ = Command::new(node_clone.clone())
                        .arg("../../../packages/node-services/src/server.js")
                        .stdout(Stdio::null())
                        .stderr(Stdio::null())
                        .spawn()
                        .expect("Failed to restart Node.js service");
                }
            }
        });
    } else {
        println!("Node.js not found");
    }
}

fn find_node_exe() -> Option<String> {
    // 在PATH中查找node.exe
    if let Ok(output) = Command::new("where").arg("node.exe").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout);
            return Some(path.trim().to_string());
        }
    }
    None
}

fn check_port_available(port: u16) -> bool {
    use std::net::TcpListener;
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

fn health_check(port: u16) -> bool {
    use reqwest::blocking::Client;
    let client = Client::new();
    client
        .get(&format!("http://127.0.0.1:{}/health", port))
        .timeout(Duration::from_secs(2))
        .send()
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}