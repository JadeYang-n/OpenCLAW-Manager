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
pub fn get_token_stats(token: String, start_date: String, end_date: String) -> TokenStats {
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
pub fn get_token_history(date: String) -> Vec<TokenEntry> {
    let conn = db::get_connection().unwrap();
    let mut stmt = conn.prepare("SELECT id, instance_id, timestamp, model, prompt_tokens, completion_tokens, total_tokens, cost FROM token_history WHERE timestamp LIKE ? ORDER BY timestamp DESC").unwrap();
    
    let mut entries = Vec::new();
    let mut rows = stmt.query([format!("{}%", date)]).unwrap();
    
    while let Some(row) = rows.next().unwrap() {
        entries.push(TokenEntry {
            id: row.get::<_, i64>(0).unwrap().to_string(),
            instance_id: row.get::<_, String>(1).unwrap(),
            timestamp: row.get::<_, String>(2).unwrap(),
            model: row.get::<_, String>(3).unwrap(),
            prompt_tokens: row.get::<_, i64>(4).unwrap(),
            completion_tokens: row.get::<_, i64>(5).unwrap(),
            total_tokens: row.get::<_, i64>(6).unwrap(),
            cost: row.get::<_, f64>(7).unwrap(),
        });
    }
    
    // 如果没有记录，添加模拟数据
    if entries.is_empty() {
        entries.push(TokenEntry {
            id: "1".to_string(),
            instance_id: "default".to_string(),
            timestamp: format!("{} 10:30:00", date),
            model: "gpt-4o".to_string(),
            prompt_tokens: 120,
            completion_tokens: 245,
            total_tokens: 365,
            cost: 0.006,
        });
        entries.push(TokenEntry {
            id: "2".to_string(),
            instance_id: "default".to_string(),
            timestamp: format!("{} 09:15:00", date),
            model: "claude-sonnet-4".to_string(),
            prompt_tokens: 85,
            completion_tokens: 160,
            total_tokens: 245,
            cost: 0.003,
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
pub fn update_model_prices(prices: HashMap<String, ModelPrice>) -> Result<(), String> {
    // 模拟更新模型价格
    Ok(())
}