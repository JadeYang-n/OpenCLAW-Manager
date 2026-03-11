#![cfg_attr(debug_assertions, allow(dead_code, unused_variables))]

mod commands;
mod services;
mod middleware;
mod crypto;

#[tauri::command]
async fn greet(name: &str) -> Result<String, String> {
    Ok(format!("Hello, {}! You've been greeted from Rust!", name))
}

fn main() {
    tauri::Builder::default()
        // 注册 opener 插件
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 初始化数据库
            services::db::init_db().unwrap();
            // 创建初始管理员账号
            let _ = commands::auth::create_initial_admin();
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
            // 安全
            commands::security::save_api_key,
            commands::security::get_api_key,
            commands::security::security_check,
            commands::security::scan_skills,
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
            // 审计日志
            commands::audit::list_audit_logs,
            // Skills
            commands::skills::list_skills,
            commands::skills::install_skill,
            commands::skills::uninstall_skill,
            commands::skills::update_skill,
            commands::skills::toggle_skill,
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
            commands::dept::remove_user_from_department
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
