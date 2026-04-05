use tracing_subscriber::{prelude::*, EnvFilter};
use std::path::PathBuf;

use tracing_appender::rolling::{RollingFileAppender, Rotation};

/// 初始化日志系统
pub fn init_logging() -> Result<(), Box<dyn std::error::Error>> {
    let log_dir = get_log_dir();
    std::fs::create_dir_all(&log_dir).ok();
    
    // 文件日志（按天滚动）
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        log_dir,
        "ocm-manager.log",
    );
    
    // 控制台日志
    let console_layer = tracing_subscriber::fmt::layer()
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false);
    
    // 文件日志层
    let file_layer = tracing_subscriber::fmt::layer()
        .with_writer(file_appender)
        .with_ansi(false)
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true);
    
    // 组合日志层
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(console_layer)
        .with(file_layer)
        .init();
    
    tracing::info!("日志系统初始化完成");
    
    Ok(())
}

/// 获取日志目录
fn get_log_dir() -> PathBuf {
    let db_path = crate::services::db::get_db_path();
    let mut log_dir = db_path.parent().unwrap_or_else(|| std::path::Path::new(".")).to_path_buf();
    log_dir.push("logs");
    log_dir
}
