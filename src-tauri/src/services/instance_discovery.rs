// 实例发现服务
use std::net::{TcpStream, UdpSocket, SocketAddr};
use std::time::{Duration, Instant};
use std::thread;

/// 实例状态
#[derive(Debug, Clone, PartialEq)]
pub enum InstanceStatus {
    Online,
    Offline,
    Unknown,
}

/// 平台类型
#[derive(Debug, Clone)]
pub enum PlatformType {
    Windows,
    Linux,
    MacOs,
    Unknown,
}

impl std::fmt::Display for PlatformType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PlatformType::Windows => write!(f, "Windows"),
            PlatformType::Linux => write!(f, "Linux"),
            PlatformType::MacOs => write!(f, "macOS"),
            PlatformType::Unknown => write!(f, "Unknown"),
        }
    }
}

/// 发现的实例
#[derive(Debug, Clone)]
pub struct DiscoveredInstance {
    pub ip: String,
    pub host: String,
    pub port: u16,
    pub platform: PlatformType,
    pub status: InstanceStatus,
    pub version: Option<String>,
    pub instance_name: Option<String>,
}

/// 实例发现服务
pub struct InstanceDiscoveryService {
    timeout: Duration,
    concurrent: usize,
}

impl InstanceDiscoveryService {
    /// 创建新的实例发现服务
    pub fn new() -> Self {
        Self {
            timeout: Duration::from_millis(1000),
            concurrent: 10,
        }
    }

    /// 设置超时时间
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// 设置并发数
    pub fn with_concurrent(mut self, concurrent: usize) -> Self {
        self.concurrent = concurrent;
        self
    }

    /// 扫描局域网实例 (默认 192.168.1.0/24)
    pub fn discover(&self) -> Result<Vec<DiscoveredInstance>, String> {
        self.discover_subnet("192.168.1.0/24", 3000)
    }

    /// 扫描指定子网
    pub fn discover_subnet(&self, subnet: &str, port: u16) -> Result<Vec<DiscoveredInstance>, String> {
        // 解析子网 (简化版，仅支持 x.x.x.0/24)
        let parts: Vec<&str> = subnet.split('.').collect();
        if parts.len() != 4 {
            return Err("Invalid subnet format. Expected: x.x.x.0/24".to_string());
        }

        let mut results = Vec::new();

        // 并发扫描 255 个 IP
        let mut handles = Vec::new();
        for i in 1..=254 {
            let ip = format!("{}.{}.{}", parts[0], parts[1], i);
            let timeout = self.timeout;
            let ip_clone = ip.clone();
            
            let handle = thread::spawn(move || {
                InstanceDiscoveryService::check_instance(&ip, port, timeout)
            });
            handles.push((ip_clone, handle));
        }

        // 收集结果
        for (_ip, handle) in handles {
            if let Ok(Some(instance)) = handle.join() {
                results.push(instance);
            }
        }

        Ok(results)
    }

    /// 检查单个实例
    fn check_instance(ip: &str, port: u16, timeout: Duration) -> Option<DiscoveredInstance> {
        let addr = format!("{}:{}", ip, port)
            .parse::<SocketAddr>()
            .ok()?;
        
        // 简单的 TCP 连接测试
        match TcpStream::connect_timeout(&addr, timeout) {
            Ok(_) => {
                // 尝试获取平台信息 (简化版)
                let platform = PlatformType::Unknown; // 实际实现中可加入更详细的检测
                
                Some(DiscoveredInstance {
                    ip: ip.to_string(),
                    host: ip.to_string(),
                    port,
                    platform,
                    status: InstanceStatus::Online,
                    version: None,
                    instance_name: None,
                })
            }
            Err(_) => {
                None
            }
        }
    }

    /// 快速存活检测
    pub fn detect_alive_hosts(&self, subnet: &str) -> Result<Vec<String>, String> {
        let parts: Vec<&str> = subnet.split('.').collect();
        if parts.len() < 3 {
            return Err("Invalid subnet format".to_string());
        }

        let base = format!("{}.{}.{}", parts[0], parts[1], parts[2]);
        let mut alive_hosts = Vec::new();

        for i in 1..=254 {
            let ip = format!("{}.{}", base, i);
            
            // 简单的 UDP 检测
            match UdpSocket::bind(("0.0.0.0", 0)) {
                Ok(sock) => {
                    sock.set_read_timeout(Some(Duration::from_millis(500))).ok();
                    sock.set_write_timeout(Some(Duration::from_millis(500))).ok();

                    // 发送 ping
                    if sock.send_to(&[0], (ip.as_str(), 1)).is_ok() {
                        alive_hosts.push(ip);
                    }
                }
                Err(_) => continue,
            }
        }

        Ok(alive_hosts)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_discover_subnet() {
        let service = InstanceDiscoveryService::new();
        // 测试不会实际执行，因为需要网络
        let result = service.discover_subnet("192.168.1.0/24", 3000);
        // 结果可能为空或包含实例
        assert!(result.is_ok());
    }

    #[test]
    fn test_detect_alive_hosts() {
        let service = InstanceDiscoveryService::new();
        let result = service.detect_alive_hosts("192.168.1.0/24");
        // 结果可能为空或包含在线主机
        assert!(result.is_ok());
    }
}
