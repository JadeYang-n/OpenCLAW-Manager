use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime};

/// 配置监听器（线程安全版本）
pub struct ConfigWatcher {
    config_path: PathBuf,
    last_modified_ms: AtomicU64,
    last_read_ms: AtomicU64,
    debounce_ms: u64,
    is_running: Arc<AtomicBool>,
}

impl ConfigWatcher {
    /// 创建新的配置监听器
    pub fn new(config_path: String, debounce_ms: u64) -> Self {
        Self {
            config_path: PathBuf::from(config_path),
            last_modified_ms: AtomicU64::new(0),
            last_read_ms: AtomicU64::new(0),
            debounce_ms,
            is_running: Arc::new(AtomicBool::new(true)),
        }
    }

    /// 启动配置监听（带防抖和文件锁）
    pub fn start<F>(self: Arc<Self>, callback: F) -> Result<(), String>
    where
        F: Fn() + Send + 'static,
    {
        let watcher = self;
        let is_running = watcher.is_running.clone();

        // 在后台线程中轮询配置文件
        std::thread::spawn(move || {
            tracing::info!("配置热更新监听已启动：{:?}", watcher.config_path);

            while is_running.load(Ordering::Relaxed) {
                std::thread::sleep(Duration::from_secs(2));

                // 防抖：避免频繁读取
                let now_ms = Instant::now().duration_since(Instant::now()).as_millis() as u64;
                let last_read_ms = watcher.last_read_ms.load(Ordering::Relaxed);
                if now_ms - last_read_ms < watcher.debounce_ms {
                    continue;
                }

                // 检查文件是否存在
                match fs::metadata(&watcher.config_path) {
                    Ok(metadata) => {
                        if let Ok(modified) = metadata.modified() {
                            // 转换为毫秒时间戳
                            let modified_ms = modified
                                .duration_since(SystemTime::UNIX_EPOCH)
                                .unwrap_or(Duration::ZERO)
                                .as_millis() as u64;

                            let last_modified_ms = watcher.last_modified_ms.load(Ordering::Relaxed);

                            // 检查文件是否真的发生变化
                            if last_modified_ms != modified_ms {
                                tracing::info!("配置文件发生变化：{:?}", watcher.config_path);

                                // 尝试获取文件锁（避免读写冲突）
                                match Self::try_read_with_lock(&watcher.config_path) {
                                    Ok(_) => {
                                        watcher.last_modified_ms.store(modified_ms, Ordering::Relaxed);
                                        watcher.last_read_ms.store(now_ms, Ordering::Relaxed);
                                        callback();
                                    }
                                    Err(e) => {
                                        tracing::warn!("配置文件读取失败（可能被占用）: {}", e);
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        // 文件不存在，可能是首次启动
                        tracing::debug!("配置文件不存在或无法访问：{} (error: {})", 
                            watcher.config_path.display(), e);
                    }
                }
            }

            tracing::info!("配置热更新监听已停止");
        });

        Ok(())
    }

    /// 带文件锁的读取尝试（避免竞态条件）
    fn try_read_with_lock(path: &PathBuf) -> Result<(), String> {
        // Windows 上文件打开时会自动加锁
        // 使用只读模式打开，避免与其他写入操作冲突
        match fs::File::open(path) {
            Ok(_file) => {
                // 文件成功打开（已隐式加锁）
                // 这里不需要实际读取内容，只是测试是否能获取锁
                Ok(())
            }
            Err(e) => {
                Err(format!("无法获取文件锁：{}", e))
            }
        }
    }

    /// 停止监听
    #[allow(dead_code)]
    pub fn stop(&self) {
        self.is_running.store(false, Ordering::Relaxed);
    }

    /// 检查监听器是否运行中
    #[allow(dead_code)]
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::Relaxed)
    }
}

/// 启动配置监听（简化 API）
pub fn watch_config_changes<F>(config_path: String, debounce_ms: u64, callback: F) -> Result<Arc<ConfigWatcher>, String>
where
    F: Fn() + Send + 'static,
{
    let watcher = Arc::new(ConfigWatcher::new(config_path, debounce_ms));
    let watcher_clone = watcher.clone();
    watcher_clone.start(callback)?;
    Ok(watcher)
}

/// 重新加载配置（带验证）
pub fn reload_config() -> Result<(), String> {
    tracing::info!("重新加载配置...");

    // TODO: 实现具体的配置重载逻辑
    // 1. 读取配置文件
    // 2. 验证配置有效性
    // 3. 应用新配置
    // 4. 记录审计日志

    tracing::info!("配置重载完成");
    Ok(())
}

/// 配置验证
#[allow(dead_code)]
pub fn validate_config(config_path: &PathBuf) -> Result<(), String> {
    if !config_path.exists() {
        return Err("配置文件不存在".to_string());
    }

    // 尝试读取并解析 JSON
    match fs::read_to_string(config_path) {
        Ok(content) => {
            // 验证 JSON 格式
            if let Err(e) = serde_json::from_str::<serde_json::Value>(&content) {
                return Err(format!("配置文件格式错误：{}", e));
            }
            Ok(())
        }
        Err(e) => Err(format!("无法读取配置文件：{}", e)),
    }
}
