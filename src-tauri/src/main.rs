mod commands;
mod services;
mod middleware;
mod crypto;
mod logging;
mod config_watcher;
mod util;

#[tauri::command]
async fn greet(name: &str) -> Result<String, String> {
    Ok(format!("Hello, {}! You've been greeted from Rust!", name))
}

fn main() {
    // 设置 panic 钩子，记录错误日志
    let panic_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        let location = panic_info.location().unwrap();
        let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            *s
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.as_str()
        } else {
            "Unknown panic"
        };
        tracing::error!("Panic at {}:{}\n{}", location.file(), location.line(), message);
        panic_hook(panic_info);
    }));
    
    // 初始化日志系统
    let _ = logging::init_logging();
    
    tauri::Builder::default()
        // 注册 opener 插件
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            // 初始化数据库并执行迁移
            let _ = services::db::init_db_and_migrate();
            // 创建初始管理员账号
            let _ = commands::auth::create_initial_admin();
            // 启动 node-services
            let _ = services::node_bridge::start_node_service();
            // 启动定时备份（每天凌晨 2 点）
            commands::backup::start_scheduled_backup();
            // 启动配置热更新监听（带防抖，1000ms）
            let config_path = std::path::PathBuf::from("config.json");
            let _ = config_watcher::watch_config_changes(
                config_path.to_string_lossy().to_string(),
                1000, // 1 秒防抖
                || {
                    let _ = config_watcher::reload_config();
                }
            );
            tracing::info!("OpenCLAW Manager 启动完成");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // 认证相关
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            commands::auth::create_initial_admin,
            // 配置管理
            commands::config::list_configs,
            commands::config::create_config,
            commands::config::update_config,
            commands::config::delete_config,
            commands::config::test_config,
            // 监控
            commands::monitor::get_token_stats,
            commands::monitor::get_token_history,
            commands::monitor::set_budget_limit,
            commands::monitor::update_model_prices,
            // 安全（密钥管理）
            commands::keys::save_api_key,
            commands::keys::get_api_key,
            commands::keys::list_api_keys,
            commands::keys::delete_api_key,
            // 安全（检查与扫描）
            commands::security::security_check,
            commands::security::scan_skills,
            // 端口扫描（v5.7）
            commands::security::scan_ports,
            // 实例发现（v5.7）
            commands::security::discover_instances,
            // Token黑名单（v5.7）
            commands::security::blacklist_token,
            commands::security::check_token_status,
            commands::security::remove_from_blacklist,
            commands::security::get_blacklist_stats,
            // 部署
            commands::setup::check_environment,
            commands::setup::fix_environment,
            commands::setup::deploy_openclaw,
            commands::deployment::get_deployment_status,
            commands::deployment::set_deploy_mode,
            commands::deployment::start_deployment,
            commands::deployment::get_deployment_log,
            // 实例管理
            commands::instance::list_instances,
            commands::instance::create_instance,
            commands::instance::delete_instance,
            commands::instance::update_instance_status,
            commands::instance::batch_operation,
            commands::instance::get_instance_detail,
            // 本地实例扫描
            commands::instance::scan_local_instances,
            commands::instance::add_local_instance,
            // 审计日志
            commands::audit::list_audit_logs,
            // Skills
            commands::skills::list_skills,
            commands::skills::install_skill,
            commands::skills::uninstall_skill,
            commands::skills::update_skill,
            commands::skills::toggle_skill,
            // Simplified Skills (v2.2)
            commands::skill_basic::list_basic_skills,
            commands::skill_basic::install_basic_skill,
            commands::skill_basic::uninstall_basic_skill,
            commands::skill_basic::toggle_basic_skill,
            commands::skill_basic::batch_basic_skills_operation,
            commands::skill_basic::get_basic_skills_stats,
            // 版本
            commands::version::check_openclaw_version,
            commands::version::get_compatibility_info,
            // 错误
            commands::error::get_error_explanation,
            commands::error::update_error_database,
            commands::error::report_unknown_error,
            // 部门管理（Phase 2）
            commands::dept::list_departments,
            commands::dept::create_department,
            commands::dept::update_department,
            commands::dept::delete_department,
            commands::dept::bind_instance_to_department,
            commands::dept::unbind_instance_from_department,
            commands::dept::get_instance_departments,
            commands::dept::get_user_departments,
            commands::dept::bind_user_to_department,
            commands::dept::remove_user_from_department,
            // SSO 单点登录（v2.0.0）
            commands::oauth::get_oauth_authorization_url,
            commands::oauth::handle_oauth_callback,
            commands::oauth::save_oauth_config,
            commands::oauth::get_oauth_config_command,
            commands::oauth::list_oauth_configs,
            commands::oauth::delete_oauth_config,
            commands::oauth::test_oauth_connection,
            commands::saml::get_saml_config,
            commands::saml::save_saml_config,
            commands::saml::generate_saml_auth_request,
            commands::saml::handle_saml_response,
            commands::saml::test_saml_connection,
            // 用户管理（v2.0.0）
            commands::users::list_users,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
            // Token 使用分析（v2.0.0）
            commands::usage::query_usage,
            commands::usage::save_provider_api_key,  // 保留用于兼容，实际使用 keys::save_api_key
            // 备份与恢复（v2.0.0）
            commands::backup::backup_database,
            commands::backup::restore_database,
            commands::backup::list_backups,
            commands::backup::delete_backup,
            // 导出报表（v2.0.0）
            commands::export::export_cost_report,
            commands::export::export_department_cost_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
