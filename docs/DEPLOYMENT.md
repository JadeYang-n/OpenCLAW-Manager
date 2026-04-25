# OpenCLAW Manager 部署指南

## 环境要求

| 组件 | 版本 |
|------|------|
| Node.js | >= 18 |
| pnpm | >= 9 |
| Rust | >= 1.75 |
| 内存 | >= 4GB |
| 磁盘 | >= 2GB |

## 快速启动（开发环境）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 生成密钥（生产环境必须）
# Windows PowerShell:
# openssl rand -hex 32  (生成 JWT_SECRET)
# openssl rand -hex 32  (生成 AES_KEY)
# openssl rand -hex 32  (生成 AUDIT_SECRET)
```

`.env` 最小配置：
```env
OCM_JWT_SECRET=<32字节hex>
OCM_AES_KEY=<32字节hex>
OCM_AUDIT_SECRET=<32字节hex>
OCM_DEBUG=true
```

### 3. 启动服务

**方式 A — 分别启动（推荐开发）:**

```bash
# 终端 1 - 后端
cd src/server
cargo run --release

# 终端 2 - 前端
cd apps/web
pnpm dev
```

**方式 B — Tauri 桌面应用:**

```bash
pnpm tauri dev
```

### 4. 登录

浏览器打开 `http://localhost:5173`，使用默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

> ⚠️ **生产环境必须修改默认密码！**

---

## 生产部署

### 构建

```bash
# 仅后端
cd src/server
cargo build --release

# 仅前端
cd apps/web
pnpm build

# 构建产物
# 后端: src/server/target/release/ocm-server.exe
# 前端: apps/web/dist/
```

### 生产环境变量

```env
# 生产环境关闭 debug
OCM_DEBUG=false

# 必须设置强密钥
OCM_JWT_SECRET=<强随机hex>
OCM_AES_KEY=<强随机hex>
OCM_AUDIT_SECRET=<强随机hex>

# 可选：自定义端口
OCM_HOST=0.0.0.0
OCM_PORT=8080
OCM_WORKERS=4

# 可选：CORS 白名单（逗号分隔）
OCM_CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com

# 可选：数据库路径
OCM_DB_PATH=/var/lib/openclaw-manager/ocm.db
```

### 启动后端

```bash
# Windows
cd src/server/target/release
ocm-server.exe

# Linux
./ocm-server
```

### 部署前端

将 `apps/web/dist/` 部署到 Nginx / Caddy 或任何静态文件服务器：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 首次使用流程

### 1. 配置实例

1. 进入「实例管理」页面
2. 点击「扫描本地实例」自动发现已安装的 OpenCLAW
3. 或手动添加远程实例（需要 Gateway IP 和端口）

### 2. 创建部门

1. 进入「部门管理」
2. 创建部门（如：研发部、测试部）
3. 将实例绑定到对应部门

### 3. 添加用户

1. 进入「用户管理」
2. 创建用户并分配角色和部门
3. 将 Token 用量配额分配到部门

### 4. 使用 Skill

1. 进入「Skill 商店」浏览已发布的 Skill
2. 点击「调用」输入参数执行
3. 或进入「Skill 管理」提交新 Skill

---

## 角色说明

| 角色 | 权限 |
|------|------|
| `admin` | 全部权限，可管理用户、部门、Skill 授权 |
| `operator` | 实例管理、部署、配置，不可管理用户 |
| `dept_admin` | 本部门资源管理 |
| `employee` | 查看个人用量、使用 Skill |
| `auditor` | 只读查看全局用量/成本 + 审计日志 |

---

## 常见问题

### 后端启动失败

```
[ERROR] OCM_JWT_SECRET not set!
```
→ 检查 `.env` 文件是否存在，三个密钥是否都已设置。

### 前端无法连接后端

```
API request failed: Network Error
```
→ 确认后端已启动在 `localhost:8080`，检查 CORS 配置。

### 数据库文件不存在

首次启动会自动创建 SQLite 数据库，无需手动初始化。

### Skill 调用失败

```
All invocation methods failed for instance X
```
→ 检查：
1. 实例是否在线（心跳正常）
2. admin_token 是否正确
3. 网络是否可达（防火墙/端口）
4. 查看后端日志 `[WARN] WebSocket RPC failed:` 获取详细原因

### 修改默认密码

登录后进入「用户管理」→ 找到 admin 用户 → 修改密码。

---

## 日志位置

| 组件 | 位置 |
|------|------|
| 后端日志 | 标准输出（启动时打印到控制台） |
| 数据库 | `data/ocm.db`（SQLite） |
| 前端日志 | 浏览器开发者工具 Console |
