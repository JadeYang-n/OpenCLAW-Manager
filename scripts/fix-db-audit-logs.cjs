// 批量修复 db.rs 中的审计日志函数，添加 signature 字段
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src-tauri', 'src', 'services', 'db.rs');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. list_audit_logs: 8 元组 -> 9 元组（添加 signature）
content = content.replace(
  /pub fn list_audit_logs\(conn: &Connection, limit: i32\) -> Result<Vec<\(String, String, String, String, String, String, String, String\)>>/g,
  'pub fn list_audit_logs(conn: &Connection, limit: i32) -> Result<Vec<(String, String, String, String, String, String, String, String, Option<String>)>>'
);

content = content.replace(
  /pub fn list_audit_logs_by_user_id\(conn: &Connection, user_id: &str, limit: i32\) -> Result<Vec<\(String, String, String, String, String, String, String, String\)>>/g,
  'pub fn list_audit_logs_by_user_id(conn: &Connection, user_id: &str, limit: i32) -> Result<Vec<(String, String, String, String, String, String, String, String, Option<String>)>>'
);

content = content.replace(
  /pub fn list_audit_logs_by_user\(conn: &Connection, user_id: &str, limit: i32\) -> Result<Vec<\(String, String, String, String, String, String, String, String\)>>/g,
  'pub fn list_audit_logs_by_user(conn: &Connection, user_id: &str, limit: i32) -> Result<Vec<(String, String, String, String, String, String, String, String, Option<String>)>>'
);

// 2. SELECT 语句添加 signature 字段
content = content.replace(
  /SELECT id, timestamp, user_id, username, resource, operation, result, risk_level FROM audit_logs/g,
  'SELECT id, timestamp, user_id, username, resource, operation, result, risk_level, signature FROM audit_logs'
);

content = content.replace(
  /SELECT id, timestamp, user_id, username, resource, operation, result, risk_level FROM audit_logs WHERE user_id = \?1/g,
  'SELECT id, timestamp, user_id, username, resource, operation, result, risk_level, signature FROM audit_logs WHERE user_id = ?1'
);

// 3. row.get::<_, String>(7)? -> row.get::<_, Option<String>>(8)?
// 需要更复杂的替换，这里手动处理

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ db.rs 修复完成');
