// 端口扫描服务
use std::net::{TcpStream, SocketAddr};
use std::time::Duration;

/// 扫描模式
#[derive(Debug, Clone)]
pub enum ScanMode {
    Quick,    // 常用端口
    Full,     // 全面扫描 (1-65535)
    Custom,   // 自定义端口
}

/// 扫描结果
#[derive(Debug, Clone)]
pub struct PortResult {
    pub port: u16,
    pub service: String,
    pub status: PortStatus,
    pub product: Option<String>,
    pub version: Option<String>,
}

/// 端口状态
#[derive(Debug, Clone, PartialEq)]
pub enum PortStatus {
    Open,
    Closed,
    Filtered,
}

impl From<PortStatus> for &'static str {
    fn from(status: PortStatus) -> &'static str {
        match status {
            PortStatus::Open => "open",
            PortStatus::Closed => "closed",
            PortStatus::Filtered => "filtered",
        }
    }
}

/// 端口扫描服务
pub struct PortScanner {
    timeout: Duration,
}

impl PortScanner {
    /// 创建新的端口扫描器
    pub fn new() -> Self {
        Self {
            timeout: Duration::from_millis(500),
        }
    }

    /// 设置超时时间
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// 获取常用端口列表
    pub fn get_common_ports() -> Vec<u16> {
        vec![
            21, 22, 23, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995,
            1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9000,
        ]
    }

    /// 获取服务名称映射
    pub fn get_service_name(port: u16) -> Option<String> {
        let services = [
            (21, "FTP"),
            (22, "SSH"),
            (23, "Telnet"),
            (25, "SMTP"),
            (53, "DNS"),
            (80, "HTTP"),
            (110, "POP3"),
            (143, "IMAP"),
            (443, "HTTPS"),
            (465, "SMTPS"),
            (587, "Submission"),
            (993, "IMAPS"),
            (995, "POP3S"),
            (1433, "MSSQL"),
            (1521, "Oracle"),
            (3306, "MySQL"),
            (3389, "RDP"),
            (5432, "PostgreSQL"),
            (5900, "VNC"),
            (6379, "Redis"),
            (8080, "HTTP-Proxy"),
            (8443, "HTTPS-Alt"),
            (9000, "Generic"),
        ];
        services.iter().find(|(p, _)| *p == port).map(|(_, name)| name.to_string())
    }

    /// 扫描所有端口 (快速模式)
    pub fn scan_all_ports(&self, ip: &str) -> Result<Vec<PortResult>, String> {
        let ports = Self::get_common_ports();
        self.scan_ports(ip, &ports)
    }

    /// 扫描指定端口列表
    pub fn scan_ports(&self, ip: &str, ports: &[u16]) -> Result<Vec<PortResult>, String> {
        let mut results = Vec::new();
        let start_time = std::time::Instant::now();

        for &port in ports {
            let service = Self::get_service_name(port).unwrap_or_else(|| "Unknown".to_string());
            
            let addr = format!("{}:{}", ip, port)
                .parse::<SocketAddr>()
                .map_err(|e| e.to_string())?;
            
            match TcpStream::connect_timeout(&addr, self.timeout) {
                Ok(_) => {
                    results.push(PortResult {
                        port,
                        service,
                        status: PortStatus::Open,
                        product: None,
                        version: None,
                    });
                }
                Err(e) => {
                    // 判断是关闭还是过滤
                    let status = if e.kind() == std::io::ErrorKind::ConnectionRefused {
                        PortStatus::Closed
                    } else {
                        PortStatus::Filtered
                    };
                    results.push(PortResult {
                        port,
                        service,
                        status,
                        product: None,
                        version: None,
                    });
                }
            }
        }

        Ok(results)
    }

    /// 扫描自定义端口范围
    pub fn scan_port_range(&self, ip: &str, start: u16, end: u16) -> Result<Vec<PortResult>, String> {
        let mut ports = Vec::new();
        for port in start..=end {
            ports.push(port);
        }
        self.scan_ports(ip, &ports)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_common_ports() {
        let ports = PortScanner::get_common_ports();
        assert!(ports.contains(&80));
        assert!(ports.contains(&443));
    }

    #[test]
    fn test_get_service_name() {
        assert_eq!(PortScanner::get_service_name(80), Some("HTTP".to_string()));
        assert_eq!(PortScanner::get_service_name(443), Some("HTTPS".to_string()));
        assert_eq!(PortScanner::get_service_name(9999), None);
    }
}
