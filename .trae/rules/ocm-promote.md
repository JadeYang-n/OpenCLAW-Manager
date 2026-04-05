# OCM Manager AI 程序员开发守则

**项目：** OpenCLAW Manager — 中小企业 OpenCLAW 企业级管理平台  
**后端：** Rust + Actix-web 4.x + SQLite  
**前端：** React + Vite + TypeScript  
**代码路径：** `C:\Users\vip\.openclaw-autoclaw\workspace\OpenCLAW Manager\ocm-manager`  
**后端代码：** `src/server/`  
**前端代码：** `apps/web/`

---

## 🔴 第零条：铁律（违反任何一条，代码必然不可用）

### 铁律 1：改一个文件，验证一次，才能改下一个

```
❌ 错误做法：同时改 8 个文件 → 最后 cargo check → 79 个错误 → 完全无法定位
✅ 正确做法：改一个文件 → cargo check → 通过了 → 改下一个
```

**每次修改后必须执行：**
```bash
cd "C:\Users\vip\.openclaw-autoclaw\workspace\OpenCLAW Manager\ocm-manager\src\server"
cargo check
```

只有 `cargo check` 输出 `Finished` 且没有 `error`，才能继续改下一个文件。

### 铁律 2：永远做最小化修改

- 修复 bug，只修导致 bug 的那几行代码
- **不要**"顺便优化"其他代码
- **不要**添加新功能，除非用户明确要求
- **不要**重构已能工作的模块
- 修改前先问自己：这个改动是修复问题**必需**的吗？不是就别动

### 铁律 3：改之前必须读完整代码

- 要改一个函数，先读整个文件，理解上下文
- 要改一个结构体，先读它的定义和所有引用
- **不要**凭记忆或猜测字段名、函数名
- **不要**在没读代码的情况下假设某个函数存在

### 铁律 4：先改定义，再改引用

如果要加字段：
```
1. 先改 Model 定义（struct）
2. 再改数据库表（CREATE TABLE / ALTER TABLE）
3. 再改数据库函数（INSERT / SELECT）
4. 最后改 Controller
```

顺序反了 = 编译错误。

---

## 📋 开发工作流

### 步骤 1：理解需求

- 读《项目改造指南.md》了解产品定位和架构
- 读《代码审查报告.md》了解之前犯的错，不要再犯

### 步骤 2：读代码

- 找到相关的文件
- 读完整文件，理解现有逻辑
- 找到需要修改的**最小范围**

### 步骤 3：修改

- 只做必要的改动
- 保持已有功能不变

### 步骤 4：编译验证

```bash
cd "C:\Users\vip\.openclaw-autoclaw\workspace\OpenCLAW Manager\ocm-manager\src\server"
cargo check
```

如果报错：
- **只修编译错误**，不要改无关代码
- 修完再跑 `cargo check`
- 重复直到没有 error

### 步骤 5：构建 + 运行测试

```bash
# 1. 清理缓存（必须！否则可能用旧代码）
cargo clean -p ocm-server

# 2. 构建
cargo build --release

# 3. 杀掉旧进程
Get-Process -Name "ocm-server" -ErrorAction SilentlyContinue | Stop-Process -Force

# 4. 启动
cd "C:\Users\vip\.openclaw-autoclaw\workspace\OpenCLAW Manager\ocm-manager\src\server"
Start-Process -FilePath "target\release\ocm-server.exe" -NoNewWindow
Start-Sleep -Seconds 3

# 5. 测试
curl.exe -s http://localhost:8080/health          # 应该返回 OK
```

### 步骤 6：验证功能

- 如果改了路由，测试对应端点
- 如果改了数据库，测试数据能正确存取
- 如果改了认证，测试需要认证的端点确实需要 token

---

## ⚠️ Rust + Actix-web 常见坑

### 坑 1：模块命名冲突

**场景：** 你建了一个叫 `middleware` 的本地模块，但 `actix_web` 也有个 `middleware`。

```rust
// ❌ 错误
mod middleware;                          // 你的模块
use actix_web::{..., middleware};        // actix_web 的 middleware → 冲突！

// ✅ 正确 — 用别名
mod ocmmiddleware;                       // 改名字
use actix_web::{..., middleware};        // actix_web 的 middleware 不会冲突
```

**规则：** 本地模块名不要和依赖库的模块名重复。如果重复了，用 `as` 起别名。

### 坑 2：类型可见性（pub）

```rust
// ❌ 错误 — 其他模块引用不了
type Pool = r2d2::Pool<SqliteConnectionManager>;

// ✅ 正确
pub type Pool = r2d2::Pool<SqliteConnectionManager>;
pub type PooledConnection = r2d2::PooledConnection<SqliteConnectionManager>;
```

**规则：** 如果一个类型要被其他模块使用，必须加 `pub`。

### 坑 3：结构体字段不存在

```rust
// Model 定义：
pub struct CreateSkillRequest {
    pub name: String,
    pub description: Option<String>,
}

// ❌ 错误 — Controller 里引用了不存在的字段
let author = req.author;     // author 不存在！
let version = req.version;   // version 不存在！

// ✅ 正确 — 先确认字段存在再用
let name = req.name.clone();
```

**规则：** 引用结构体字段前，先去 Model 定义里确认这个字段真的存在。

### 坑 4：Result 错误类型不匹配

```rust
// ❌ 错误 — rusqlite::Result 和 r2d2::Error 不兼容
pub fn init_db_pool() -> rusqlite::Result<Pool> {
    let pool = r2d2::Pool::builder().build(manager)?;  // ← 这里返回 r2d2::Error
    Ok(pool)
}

// ✅ 正确 — 用统一的错误类型
pub fn init_db_pool() -> Result<Pool, Box<dyn std::error::Error>> {
    let pool = r2d2::Pool::builder().build(manager)?;
    Ok(pool)
}
```

**规则：** `?` 操作符要求错误类型能转换。如果用了多个库的 Result，用 `Box<dyn Error>` 或自定义错误类型。

### 坑 5：数据库参数绑定

```rust
// ❌ 错误 — rusqlite 不支持 &[Box<dyn ToSql>]
let params: Vec<Box<dyn ToSql>> = vec![Box::new(id)];
conn.execute("SELECT * FROM t WHERE id = ?", params)?;

// ✅ 正确 — 用 rusqlite::params! 宏
conn.execute("SELECT * FROM t WHERE id = ?", rusqlite::params![id])?;

// ✅ 也可以用元组
conn.execute("SELECT * FROM t WHERE id = ?", (&id,))?;
```

### 坑 6：actix-web 中间件的正确写法

**actix-web 4.x 的中间件不是简单的 async 函数。**

```rust
// ❌ 错误 — 这只是一个普通 async 函数，不是中间件
pub async fn auth_middleware(req: ServiceRequest, next: Next) -> Result<ServiceResponse, Error> {
    // ...
}

// ❌ 下面这样调用会报错
.wrap(middleware::auth::auth_middleware)

// ✅ 正确 — 用 actix_web::middleware::from_fn
use actix_web::middleware::from_fn;

// 然后这样注册
.wrap(from_fn(auth_middleware_fn))
```

**如果你不确定怎么写中间件，先跳过，用每个 Controller 手动检查 token 的方式。** 虽然不优雅，但至少能工作。

### 坑 7：chrono DateTime vs String

```rust
// Model 里定义了 DateTime<Utc>
pub struct AgentHeartbeat {
    pub reported_at: DateTime<Utc>,
}

// ❌ 错误 — 传了 String
let hb = AgentHeartbeat {
    reported_at: "2026-04-03T00:00:00Z".to_string(),  // String != DateTime<Utc>
};

// ✅ 正确 — 用 chrono::Utc::now()
let hb = AgentHeartbeat {
    reported_at: chrono::Utc::now(),
};
```

### 坑 8：cargo 缓存坑

**改了代码但编译结果没变？** 这是因为 cargo 缓存了旧的编译结果。

```bash
# 必须清理缓存
cargo clean -p ocm-server
cargo build --release
```

如果还是不行，试试 `cargo clean`（清理全部，但会慢）。

---

## 🗄️ SQLite 数据库规范

### 连接池（已引入 r2d2）

```rust
// Cargo.toml 已有
// r2d2 = "0.8"
// r2d2_sqlite = "0.24"

// db.rs 中的类型定义（必须 pub）
pub type Pool = r2d2::Pool<SqliteConnectionManager>;
pub type PooledConnection = r2d2::PooledConnection<SqliteConnectionManager>;

// 初始化连接池
pub fn init_db_pool() -> Result<Pool, Box<dyn std::error::Error>> {
    let db_path = get_db_path();
    let manager = SqliteConnectionManager::file(db_path);
    let pool = r2d2::Pool::builder().build(manager)?;

    // 初始化表结构（用 pool 获取连接）
    let conn = pool.get()?;
    init_tables(&conn)?;

    Ok(pool)
}

// 数据库函数统一接收 &Connection（不管是直接连接还是 pool 获取的）
pub fn get_all_users(conn: &Connection) -> rusqlite::Result<Vec<User>> {
    // ...
}

// Controller 中用法
pub async fn get_users(pool: web::Data<Pool>) -> impl Responder {
    let conn = pool.get().map_err(|e| ...)?;
    let users = get_all_users(&conn)?;
    HttpResponse::Ok().json(users)
}
```

### SQL 写法

```rust
// ✅ 推荐写法
conn.execute(
    "INSERT INTO users (id, username, role) VALUES (?, ?, ?)",
    rusqlite::params![id, username, role],
)?;

// ✅ 查询
let mut stmt = conn.prepare("SELECT id, username FROM users WHERE role = ?")?;
let users = stmt.query_map(rusqlite::params![role], |row| {
    Ok(User {
        id: row.get(0)?,
        username: row.get(1)?,
    })
})?;
```

### 表迁移

如果要加新表，用 `CREATE TABLE IF NOT EXISTS`：

```rust
pub fn init_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS agent_registry (
            instance_id TEXT PRIMARY KEY,
            instance_name TEXT NOT NULL,
            -- ...
        )",
        [],
    )?;
    Ok(())
}
```

---

## 🔐 认证规范

### 当前状态

项目使用 JWT token 认证，每个 Controller 手动检查。在认证中间件没完全实现之前，**保持手动检查的方式**。

### 手动检查写法

```rust
// Controller 中
use crate::utils::auth::verify_request_auth;

pub async fn get_instances(
    req: actix_web::HttpRequest,
    settings: web::Data<Settings>,
) -> impl Responder {
    // 1. 验证 token
    match verify_request_auth(&req, &settings) {
        Ok(claims) => { /* 继续 */ }
        Err(e) => return HttpResponse::Unauthorized().json(json!({
            "success": false,
            "error": { "code": "UNAUTHORIZED", "message": e }
        })),
    }

    // 2. 执行业务逻辑
    // ...
}
```

### 白名单路径

以下路径**不需要**认证（公开访问）：
- `/health`
- `/api/v1/users/login`
- `/api/v1/users/logout`
- `/api/v1/health`
- `/api/v1/gateway/token/remote/write`
- `/api/v1/agent/register`
- `/api/v1/agent/heartbeat`
- `/api/v1/agent/usage`
- `/api/v1/agent/skills`

其他所有路径**必须**认证。

---

## 📡 API 响应格式

后端统一返回：

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-04-03T00:00:00Z"
}
```

失败时：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": null
  },
  "timestamp": "2026-04-03T00:00:00Z"
}
```

**前端需要 `response.data.data` 才能拿到真正的数据。**

---

## 🧪 测试验证清单

每次修改完成后，必须逐项检查：

- [ ] `cargo check` 无 error（warning 可以暂时忽略）
- [ ] `cargo build --release` 成功
- [ ] `curl.exe -s http://localhost:8080/health` 返回 "OK"
- [ ] 如果改了路由，测试对应端点能通
- [ ] 如果改了数据库，测试数据能正确存取
- [ ] 已有的功能没被破坏（测试 login、configs 等基本端点）

---

## 🚫 绝对不要做的事

1. ❌ **不要同时改多个文件不验证** — 这是最致命的错误
2. ❌ **不要凭空想象字段名** — 先去 Model 定义里确认
3. ❌ **不要改已能工作的代码** — 哪怕它看起来"不够优雅"
4. ❌ **不要假设函数存在** — 先搜索确认
5. ❌ **不要假设 API 路径存在** — 先读 `routes/mod.rs` 确认
6. ❌ **不要忽略编译错误** — 有 error 就是代码不可用
7. ❌ **不要用 HTTP REST 连接 OpenCLAW Gateway** — 它用 WebSocket RPC
8. ❌ **不要假设 Gateway 有 `/api/gateway/config` 端点** — 它没有
9. ❌ **不要修改 OpenClaw Gateway 的核心配置文件**（`openclaw.json`）— 改了会让 Agent 自己挂掉

---

## 📖 必读文档

| 文档 | 用途 |
|------|------|
| `项目诊断报告 v5.8.md` | 了解项目的问题和架构 |
| `项目改造指南.md` | 了解产品需求、改造方案、数据流 |
| `代码审查报告.md` | 了解之前犯的错，不要再犯 |
| 本文件 | 开发规范和常见坑 |

---

## 💡 遇到不确定的情况

1. **不确定函数是否存在？** → `grep` 或 `Select-String` 搜索
2. **不确定结构体有哪些字段？** → 读 Model 定义
3. **不确定路由是否存在？** → 读 `routes/mod.rs`
4. **不确定 API 用法？** → 写个最小测试先验证
5. **不确定改法对不对？** → 改一个文件，cargo check，看结果
6. **不确定会不会影响旧功能？** → 问清楚再改，或者先备份

---

**记住：宁可少做，不可做错。能编译通过、能运行的代码，比"看起来完美但跑不起来"的代码好一万倍。**
