use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::services::db;
use crate::middleware::auth;
use rusqlite::Row;

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenStats {
    pub today: i64,
    pub today_cost: f64,
    pub monthly: i64,
    pub monthly_cost: f64,
    pub budget: f64,
    pub remaining: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenEntry {
    pub id: String,
    pub instance_id: String,
    pub timestamp: String,
    pub model: String,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
    pub cost: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelPrice {
    pub input: f64,
    pub output: f64,
}

#[tauri::command]
pub fn get_token_stats(token: String, _start_date: String, _end_date: String) -> TokenStats {
    let conn = db::get_connection().unwrap();
    
    // 验证 token 并获取用户信息
    let user = if let Ok(u) = auth::verify_token(&token, &conn) {
        u
    } else {
        // 如果是旧版本调用（无 token），返回空数据
        return TokenStats {
            today: 0,
            today_cost: 0.0,
            monthly: 0,
            monthly_cost: 0.0,
            budget: 100.0,
            remaining: 100.0,
        };
    };
    
    // 数据隔离：获取用户可访问的部门
    let accessible_dept_ids = db::get_user_accessible_departments(&conn, &user.user_id, &user.role)
        .unwrap_or_default();
    
    // 构建实例过滤条件
    let instance_filter = if user.role == "admin" || user.role == "operator" {
        // 管理员和运维管理员可以看到所有实例
        String::new()
    } else {
        // 部门管理员、员工、审计员只能看到本部门的实例
        if accessible_dept_ids.is_empty() {
            return TokenStats {
                today: 0,
                today_cost: 0.0,
                monthly: 0,
                monthly_cost: 0.0,
                budget: 100.0,
                remaining: 100.0,
            };
        }
        let placeholders = accessible_dept_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        format!(
            " AND instance_id IN (SELECT instance_id FROM instance_departments WHERE department_id IN ({}))",
            placeholders
        )
    };
    
    // 获取今日统计
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let query = format!("SELECT SUM(total_tokens), SUM(cost) FROM token_history WHERE timestamp LIKE ?{}", instance_filter);
    let today_result: (i64, f64) = if user.role == "admin" || user.role == "operator" {
        conn.prepare(&query).unwrap().query_row([format!("{}%", today)], |row: &Row| {
            let tokens: Option<i64> = row.get(0).unwrap_or(None);
            let cost: Option<f64> = row.get(1).unwrap_or(None);
            Ok((tokens.unwrap_or(0), cost.unwrap_or(0.0)))
        }).unwrap_or((0, 0.0))
    } else {
        let params: Vec<&str> = accessible_dept_ids.iter().map(|s| s.as_str()).collect();
        let mut all_params = vec![format!("{}%", today)];
        for p in &params {
            all_params.push(p.to_string());
        }
        conn.prepare(&query).unwrap().query_row(rusqlite::params_from_iter(all_params.iter()), |row: &Row| {
            let tokens: Option<i64> = row.get(0).unwrap_or(None);
            let cost: Option<f64> = row.get(1).unwrap_or(None);
            Ok((tokens.unwrap_or(0), cost.unwrap_or(0.0)))
        }).unwrap_or((0, 0.0))
    };
    
    // 获取本月统计
    let month = chrono::Utc::now().format("%Y-%m").to_string();
    let monthly_result: (i64, f64) = if user.role == "admin" || user.role == "operator" {
        conn.prepare(&query).unwrap().query_row([format!("{}%", month)], |row: &Row| {
            let tokens: Option<i64> = row.get(0).unwrap_or(None);
            let cost: Option<f64> = row.get(1).unwrap_or(None);
            Ok((tokens.unwrap_or(0), cost.unwrap_or(0.0)))
        }).unwrap_or((0, 0.0))
    } else {
        let params: Vec<&str> = accessible_dept_ids.iter().map(|s| s.as_str()).collect();
        let mut all_params = vec![format!("{}%", month)];
        for p in &params {
            all_params.push(p.to_string());
        }
        conn.prepare(&query).unwrap().query_row(rusqlite::params_from_iter(all_params.iter()), |row: &Row| {
            let tokens: Option<i64> = row.get(0).unwrap_or(None);
            let cost: Option<f64> = row.get(1).unwrap_or(None);
            Ok((tokens.unwrap_or(0), cost.unwrap_or(0.0)))
        }).unwrap_or((0, 0.0))
    };
    
    // 获取预算
    let mut stmt = conn.prepare("SELECT monthly FROM budget ORDER BY updated_at DESC LIMIT 1").unwrap();
    let budget: f64 = stmt.query_row([], |row: &Row| {
        let value: f64 = row.get(0).unwrap();
        Ok(value)
    }).unwrap_or(100.0);
    
    TokenStats {
        today: today_result.0,
        today_cost: today_result.1,
        monthly: monthly_result.0,
        monthly_cost: monthly_result.1,
        budget,
        remaining: budget - monthly_result.1,
    }
}

#[tauri::command]
pub fn get_token_history(token: String, date: String) -> Vec<TokenEntry> {
    let conn = db::get_connection().unwrap();
    
    // 验证 token 并获取用户信息
    let user = if let Ok(u) = auth::verify_token(&token, &conn) {
        u
    } else {
        // 如果验证失败，返回空列表
        return Vec::new();
    };
    
    // 数据隔离：获取用户可访问的部门
    let accessible_dept_ids = db::get_user_accessible_departments(&conn, &user.user_id, &user.role)
        .unwrap_or_default();
    
    // 构建实例过滤条件
    let instance_filter = if user.role == "admin" || user.role == "operator" {
        // 管理员和运维管理员可以看到所有实例
        String::new()
    } else {
        // 部门管理员、员工、审计员只能看到本部门的实例
        if accessible_dept_ids.is_empty() {
            return Vec::new();
        }
        let placeholders = accessible_dept_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        format!(
            " AND instance_id IN (SELECT instance_id FROM instance_departments WHERE department_id IN ({}))",
            placeholders
        )
    };
    
    let query = format!("SELECT id, instance_id, timestamp, model, prompt_tokens, completion_tokens, total_tokens, cost FROM token_history WHERE timestamp LIKE ?{} ORDER BY timestamp DESC", instance_filter);
    
    struct TokenRow {
        id: i64,
        instance_id: String,
        timestamp: String,
        model: String,
        prompt_tokens: i64,
        completion_tokens: i64,
        total_tokens: i64,
        cost: f64,
    }
    
    let mut entries = Vec::new();
    let mut stmt = conn.prepare(&query).unwrap();
    let rows = stmt.query_map(rusqlite::params![format!("{}%", date)], |r| {
        Ok(TokenRow {
            id: r.get(0).unwrap(),
            instance_id: r.get(1).unwrap(),
            timestamp: r.get(2).unwrap(),
            model: r.get(3).unwrap(),
            prompt_tokens: r.get(4).unwrap(),
            completion_tokens: r.get(5).unwrap(),
            total_tokens: r.get(6).unwrap(),
            cost: r.get(7).unwrap(),
        })
    }).unwrap();
    
    for r in rows {
        let row = r.unwrap();
        entries.push(TokenEntry {
            id: row.id.to_string(),
            instance_id: row.instance_id,
            timestamp: row.timestamp,
            model: row.model,
            prompt_tokens: row.prompt_tokens,
            completion_tokens: row.completion_tokens,
            total_tokens: row.total_tokens,
            cost: row.cost,
        });
    }
    
    entries
}

#[tauri::command]
pub fn set_budget_limit(daily: f64, monthly: f64) -> Result<(), String> {
    let conn = db::get_connection().unwrap();
    
    let result = conn.execute(
        r#"
        UPDATE budget SET daily = ?, monthly = ?, updated_at = datetime('now')
        WHERE id = (SELECT id FROM budget ORDER BY updated_at DESC LIMIT 1)
        "#,
        (daily, monthly)
    );
    
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn update_model_prices(_prices: HashMap<String, ModelPrice>) -> Result<(), String> {
    // 模拟更新模型价格
    Ok(())
}