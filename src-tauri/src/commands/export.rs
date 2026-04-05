use crate::services::db;
use crate::middleware::auth;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportReport {
    pub csv_content: String,
    pub filename: String,
}

/// 导出成本报表为 CSV（Excel 可打开）
#[tauri::command]
pub fn export_cost_report(token: String, month: String) -> Result<ExportReport, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查
    if user.role != "admin" && user.role != "operator" && user.role != "auditor" {
        return Err("权限不足：无法导出成本报表".to_string());
    }
    
    // 生成 CSV 内容
    let csv_content = generate_cost_report_csv(&conn, &month)?;
    
    Ok(ExportReport {
        csv_content,
        filename: format!("cost_report_{}.csv", month),
    })
}

/// 导出部门成本报表
#[tauri::command]
pub fn export_department_cost_report(token: String, month: String, department_id: String) -> Result<ExportReport, String> {
    let conn = db::get_connection().map_err(|e| e.to_string())?;
    let user = auth::verify_token(&token, &conn)?;
    
    // 权限检查
    if user.role != "admin" && user.role != "operator" && user.role != "auditor" {
        return Err("权限不足：无法导出成本报表".to_string());
    }
    
    // 生成 CSV 内容
    let csv_content = generate_department_cost_report_csv(&conn, &month, &department_id)?;
    
    Ok(ExportReport {
        csv_content,
        filename: format!("department_{}_cost_{}.csv", department_id, month),
    })
}

/// 生成全局成本报表CSV
fn generate_cost_report_csv(conn: &rusqlite::Connection, month: &str) -> Result<String, String> {
    // 使用 LEFT JOIN 确保即使没有部门信息也能查询
    let sql = "
        SELECT COALESCE(th.department, '未分配') as department, 
               SUM(th.total_tokens) as total_tokens, 
               SUM(th.cost) as total_cost, 
               COUNT(*) as request_count
        FROM token_history th
        LEFT JOIN departments d ON th.department_id = d.id
        WHERE strftime('%Y-%m', th.timestamp) = ?
        GROUP BY COALESCE(th.department, '未分配')
        ORDER BY total_cost DESC
    ";
    
    let mut csv = "部门,Token 总量,总成本(美元),请求次数,占比\n".to_string();
    let mut total_cost: f64 = 0.0;
    
    struct DeptRow {
        dept: String,
        tokens: i64,
        cost: f64,
        count: i64,
    }
    
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![month], |r| {
        Ok(DeptRow {
            dept: r.get(0).unwrap_or_default(),
            tokens: r.get(1).unwrap_or(0),
            cost: r.get(2).unwrap_or(0.0),
            count: r.get(3).unwrap_or(0),
        })
    }).map_err(|e| e.to_string())?;
    
    let results: Vec<DeptRow> = rows.map(|r| r.map_err(|e| e.to_string())).collect::<Result<_, _>>()?;
    
    for r in &results {
        total_cost += r.cost;
    }
    
    for r in results {
        let pct = if total_cost > 0.0 { (r.cost / total_cost) * 100.0 } else { 0.0 };
        csv.push_str(&format!("{},{},{:.2},{},{:.2}%\n", r.dept, r.tokens, r.cost, r.count, pct));
    }
    
    Ok(csv)
}

/// 生成部门成本报表CSV
fn generate_department_cost_report_csv(
    conn: &rusqlite::Connection,
    month: &str,
    department_id: &str
) -> Result<String, String> {
    // 使用 JOIN 获取实例名称
    let sql = "
        SELECT th.instance_id, i.name as instance_name, th.model, 
               SUM(th.total_tokens) as total_tokens,
               SUM(th.cost) as total_cost, 
               COUNT(*) as request_count
        FROM token_history th
        LEFT JOIN instances i ON th.instance_id = i.id
        WHERE strftime('%Y-%m', th.timestamp) = ? 
          AND th.department_id = ?
        GROUP BY th.instance_id, th.model
        ORDER BY total_cost DESC
    ";
    
    let mut csv = "实例ID,实例名称,模型,Token总量,总成本(美元),请求次数\n".to_string();
    
    struct InstRow {
        id: String,
        name: String,
        model: String,
        tokens: i64,
        cost: f64,
        count: i64,
    }
    
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![month, department_id], |r| {
        Ok(InstRow {
            id: r.get(0).unwrap_or_default(),
            name: r.get(1).unwrap_or_default(),
            model: r.get(2).unwrap_or_default(),
            tokens: r.get(3).unwrap_or(0),
            cost: r.get(4).unwrap_or(0.0),
            count: r.get(5).unwrap_or(0),
        })
    }).map_err(|e| e.to_string())?;
    
    let results: Vec<InstRow> = rows.map(|r| r.map_err(|e| e.to_string())).collect::<Result<_, _>>()?;
    
    for r in results {
        csv.push_str(&format!("{},{},{},{},{:.2},{}\n", 
            r.id, r.name, r.model, r.tokens, r.cost, r.count));
    }
    
    Ok(csv)
}
