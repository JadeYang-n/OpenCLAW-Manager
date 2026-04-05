# OpenCLAW 实例添加与认证机制

**版本：** v3.0.0  
**最后更新：** 2026-04-05  
**适用范围：** OCM Manager 添加和管理 OpenCLAW Gateway 实例  
**作者：** 架构师（AI）+ 程序员团队

---

## 📋 目录

- [1. 核心概念](#1-核心概念)
- [2. Gateway Token 认证机制 ⭐](#2-gateway-token-认证机制-)
- [3. 远程实例自动发现与配对 ⭐⭐](#3-远程实例自动发现与配对-)
- [4. 实例添加验证流程](#4-实例添加验证流程)
- [5. 用户操作指南](#5-用户操作指南)
- [6. 技术实现](#6-技术实现)
- [7. 故障排除](#7-故障排除)
- [8. 官方文档参考](#8-官方文档参考)

---

## 1. 核心概念

### 1.1 Gateway 实例类型

| 类型 | IP 地址示例 | 连接方式 | 认证要求 |
|------|-----------|---------|---------|
| **本地实例** | `127.0.0.1` 或 `localhost` | 直接 HTTP | 自动信任（无需配对） |
| **内网实例** | `192.168.x.x` | 直接 HTTP | 需要设备配对 |
| **远程实例** | Tailscale IP 或 SSH 隧道 | SSH/Tailscale | 需要设备配对 |

### 1.2 统一添加原则

**本地实例和远程实例使用同一个添加功能：**
- ✅ 同一个界面
- ✅ 同一个验证逻辑
- ✅ 同一个 API 接口
- ✅ 系统自动判断类型并显示不同提示

### 1.3 三层认证

```
┌─────────────────────────────────────────────────────────┐
│ 第一层：Gateway Token（WebSocket 连接认证）                │
│ - 用途：WebSocket 握手时验证客户端身份                      │
│ - 验证方式：connect.params.auth.token                     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ 第二层：设备配对（Device Pairing）                         │
│ - 用途：新设备首次连接需要批准                             │
│ - 本地连接：自动批准（loopback/tailnet）                   │
│ - 远程连接：需要 openclaw devices approve                │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ 第三层：HTTP API 认证（OCM Manager 使用的）                  │
│ - /health → 公开端点（用于健康检查）                        │
│ - /tools/invoke → 需要认证（用于验证 token）                │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Gateway Token 认证机制 ⭐

### 2.1 HTTP API 端点

| 端点 | 认证要求 | HTTP 方法 | 用途 |
|------|---------|----------|------|
| `GET /health` | ❌ 不需要 | GET | 检查 Gateway 是否在线 |
| `POST /tools/invoke` | ✅ 需要 | POST | 调用工具（可用来验证 token） |

### 2.2 认证方式

**正确的认证 header：**
```
Authorization: Bearer <token>
```

### 2.3 ⭐ 重要发现：Gateway Token 管理机制

**问题根因（2026-04-05 发现）：**

Gateway 的 token **不是从配置文件读取的**，而是通过**命令行参数**传入的！

#### Token 来源优先级

| 来源 | 说明 | 优先级 |
|------|------|-------|
| 命令行参数 `--token` | Gateway 启动时传入 | 🔴 **最高** |
| 环境变量 `OPENCLAW_GATEWAY_TOKEN` | 系统环境变量 | 🟡 中等 |
| 配置文件 `gateway.auth.token` | `~/.openclaw/openclaw.json` | 🟢 最低 |

#### 实际案例

```
配置文件 token: ogt_921806452507746304  ❌（不会生效）
命令行 token: 529d47fac02733e5ef87cde2397abd736ce313e274d2fe580eac549461e9a585  ✅（实际使用）
```

#### Gateway 启动日志示例

```plaintext
Gateway 启动参数：
C:\Program Files\AutoClaw\resources\node\node.exe 
 C:\Users\vip\.openclaw-autoclaw\gateway-launcher.cjs gateway run 
 --port 18789 
 --bind loopback 
 --force 
 --allow-unconfigured 
 --auth token 
 --token 529d47fac02733e5ef87cde2397abd736ce313e274d2fe580eac549461e9a585  ← 实际使用的 token

配置文件覆盖日志：
Config overwrite: C:\Users\vip\.openclaw\openclaw.json 
 (sha256 049d7613e49cb26b29304ab58bcf6bef1f4c989b49ebdaa4d54405989fc48ca3 
 -> 1c6abefcb97f9d3cbf75cdfda919526211e1a76da98b7e3e4e208f265a05f1a6)
```

### 2.4 如何获取正确的 Token

#### 方法 1：查看 Gateway 启动日志（推荐）

```bash
# Windows PowerShell
Get-Content C:\Users\vip\AppData\Local\Temp\openclaw\openclaw-*.log | Select-String "auth.token" -Context 5

# 或者查看 Gateway 进程命令行
wmic process where "name='node.exe'" get CommandLine
```

#### 方法 2：查看 Windows 服务配置

```bash
# 查看服务详情
sc qc "OpenCLAW Gateway"

# 或者查看任务计划程序
schtasks /Query /TN "OpenCLAW Gateway" /V /FO LIST
```

#### 方法 3：直接测试（最可靠）

```bash
# 测试候选 token
curl -s -X POST http://127.0.0.1:18789/tools/invoke ^
  -H "Authorization: Bearer 候选 token" ^
  -H "Content-Type: application/json" ^
  -d '{"tool": "sessions_list", "args": {}}'

# 返回 200 → token 正确
# 返回 401 → token 错误
```

### 2.5 注意事项

1. **配置文件的 token 可能不生效** - 如果 Gateway 通过命令行启动
2. **Token 可能会变化** - 每次 Gateway 重启可能生成新 token
3. **OCM Manager 需要自动检测** - 不要让用户手动输入
4. **这是 OpenCLAW 2026.3.7 的特性** - 可能是安全机制（每次启动生成新 token）

---

## 3. 远程实例自动发现与配对 ⭐⭐

**目标：** 实现远程 Gateway 实例的**自动发现 + 自动配对 + Token 自动获取**，无需用户手动输入 Token。

### 3.1 远程发现机制（三种方式，优先级排序）

#### 优先级 1：Bonjour/mDNS 自动发现（同一局域网）

**官方机制：**
- Gateway 通过 Bonjour 广播 `_openclaw-gw._tcp` 服务
- TXT 记录包含：`gatewayPort=18789`、`lanHost=xxx.local`、`displayName=友好名称`
- 客户端浏览并显示 Gateway 列表

**实现方式：**
```rust
// 使用 Rust 的 mdns 库（例如：mdns-sd）
use mdns_sd::{ServiceDaemon, ServiceEvent};

struct GatewayInfo {
    instance_name: String,      // 例如 "Desktop-PC._openclaw-gw._tcp.local."
    display_name: String,       // 例如 "Desktop-PC"
    lan_host: String,           // 例如 "desktop-pc.local"
    ip_address: String,         // 例如 "192.168.1.100"
    gateway_port: u16,          // 例如 18789
}

fn discover_lan_gateways() -> Result<Vec<GatewayInfo>> {
    let mut mdns = ServiceDaemon::new()?;
    let receiver = mdns.browse("_openclaw-gw._tcp.local.")?;
    
    let mut gateways = Vec::new();
    
    while let Ok(event) = receiver.recv_timeout(Duration::from_secs(5)) {
        match event {
            ServiceEvent::ServiceResolved(info) => {
                let gateway = GatewayInfo {
                    instance_name: info.get_fullname().to_string(),
                    display_name: info.get_properties()
                        .get("displayName")
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| info.get_hostname().to_string()),
                    lan_host: info.get_properties()
                        .get("lanHost")
                        .map(|s| s.to_string())
                        .unwrap_or_default(),
                    ip_address: info.get_addresses()
                        .iter()
                        .next()
                        .map(|a| a.to_string())
                        .unwrap_or_default(),
                    gateway_port: info.get_port(),
                };
                gateways.push(gateway);
            }
            _ => {}
        }
    }
    
    Ok(gateways)
}
```

**推荐库：**
- https://crates.io/crates/mdns-sd
- https://crates.io/crates/zeroconf

---

#### 优先级 2：Tailscale 发现（跨网络，可选实现）

**官方机制：**
- Gateway 配置 `discovery.wideArea.enabled: true`
- 通过 Tailscale DNS-SD 广播
- 客户端浏览 `openclaw.internal.` 域名

**实现方式：**
```rust
// 调用 Tailscale CLI 获取设备列表
fn discover_tailnet_gateways() -> Result<Vec<GatewayInfo>> {
    // 执行：tailscale status --json
    // 解析输出，获取 Tailscale IP 列表
    // 尝试连接每个 IP 的 18789 端口
}
```

---

#### 优先级 3：手动输入（备选）

```rust
// 简单的地址输入框
struct ManualInput {
    ip_address: String,  // 192.168.x.x 或 Tailscale IP
    port: u16,           // 默认 18789
}
```

---

### 3.2 设备配对机制（官方 WebSocket 协议）

#### 配对流程

```
1. WebSocket 连接 Gateway
   ↓
2. 发送 device.pair 请求
   ↓
3. Gateway 返回 requestId
   ↓
4. 显示配对指令给用户
   ↓
5. 用户在 Gateway 主机运行批准命令
   ↓
6. Gateway 颁发设备令牌（自动获取！）
   ↓
7. 添加实例成功
```

#### WebSocket 消息格式（基于官方文档）

**步骤 1：连接 Gateway**
```rust
let ws = WebSocket::connect(&format!("ws://{}:{}", ip, port)).await?;
```

**步骤 2：发送配对请求**
```rust
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};

ws.send(Message::Text(json!({
    "type": "req",
    "id": "pair-req-123",
    "method": "device.pair",
    "params": {
        "device": {
            "id": "ocm-uuid-xxx",  // uuid::Uuid::new_v4().to_string()
            "name": "OCM Manager",
            "role": "operator"
        }
    }
}).to_string())).await?;
```

**步骤 3：接收 requestId**
```rust
let response = ws.next().await.ok_or("No response")?;
let response_json: Value = serde_json::from_str(&response?.to_text()?)?;

// 预期返回：
{
    "type": "res",
    "id": "pair-req-123",
    "ok": true,
    "payload": {
        "requestId": "oc_abc123",
        "status": "pending",
        "expiresAt": "2026-04-05T11:21:00Z"
    }
}
```

**步骤 4：轮询等待批准**
```rust
loop {
    let event = ws.next().await.ok_or("Connection closed")?;
    let event_json: Value = serde_json::from_str(&event?.to_text()?)?;
    
    // 检查是否是配对批准事件
    if event_json["type"] == "event" 
        && event_json["event"] == "device.pair.resolved" 
    {
        if event_json["payload"]["status"] == "approved" {
            // 配对成功！
            let device_token = event_json["payload"]["deviceToken"]
                .as_str()
                .ok_or("No deviceToken")?
                .to_string();
            
            return Ok(device_token);
        } else {
            return Err("配对被拒绝".into());
        }
    }
    
    // 检查超时（5 分钟）
    if elapsed_time > Duration::from_minutes(5) {
        return Err("配对超时".into());
    }
    
    sleep(Duration::from_secs(2)).await;
}
```

**步骤 5：保存 Token 并添加实例**
```rust
// 保存设备令牌（后续连接复用）
save_device_token(&ip, &device_token);

// 添加实例到数据库
add_instance(Instance {
    ip,
    port,
    token: device_token,  // 自动获取，无需用户输入！
    ..
});
```

---

### 3.3 UI 设计

#### 主界面（发现 Gateway）

```
┌─────────────────────────────────────────┐
│     添加远程 Gateway 实例                  │
├─────────────────────────────────────────┤
│                                         │
│  🔍 正在扫描局域网...                   │
│                                         │
│  发现的 Gateway：                       │
│  ┌─────────────────────────────────┐   │
│  │ 🖥️ Desktop-PC                   │   │
│  │    192.168.1.100:18789          │   │
│  ├─────────────────────────────────┤   │
│  │ 💻 MacBook-Pro                  │   │
│  │    192.168.1.101:18789          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  或手动输入：                           │
│  [IP 地址：192.168.x.x               ]  │
│  [端口：18789                        ]  │
│                                         │
│  [🔄 重新扫描]  [➕ 手动添加]            │
│                                         │
└─────────────────────────────────────────┘
```

#### 配对等待界面

```
┌─────────────────────────────────────────┐
│  ⏳ 等待配对批准                         │
├─────────────────────────────────────────┤
│                                         │
│  请在 Gateway 主机运行以下命令：         │
│                                         │
│  openclaw devices approve oc_abc123    │
│                                         │
│  ───────────────────────────────────    │
│                                         │
│  配对码 5 分钟后过期                     │
│  已等待：30 秒                          │
│                                         │
│  [取消]                                  │
│                                         │
└─────────────────────────────────────────┘
```

#### 成功界面

```
┌─────────────────────────────────────────┐
│  ✅ 添加成功                             │
├─────────────────────────────────────────┤
│                                         │
│  Gateway: Desktop-PC                    │
│  地址：192.168.1.100:18789             │
│                                         │
│  设备令牌已保存，后续连接自动使用        │
│                                         │
│  [确定]                                  │
│                                         │
└─────────────────────────────────────────┘
```

---

### 3.4 验收标准

- [ ] 能够自动发现同一局域网内的 Gateway
- [ ] 显示友好的 Gateway 名称（不是冷冰冰的 IP）
- [ ] 点击 Gateway 后自动发起配对
- [ ] 显示清晰的配对指令（`openclaw devices approve <requestId>`）
- [ ] 配对成功后自动获取 Token（无需用户输入）
- [ ] 配对超时（5 分钟）后有明确提示
- [ ] 支持手动输入 Gateway 地址（备选方案）
- [ ] Token 保存到本地，后续连接自动使用

---

### 3.5 开发建议

**阶段 1：实现手动输入 + 配对**
1. 先实现手动输入地址
2. 实现 WebSocket 配对流程
3. 验证 Token 自动获取

**阶段 2：实现 Bonjour 发现**
1. 集成 mdns-sd 库
2. 实现自动发现
3. 优化 UI 显示

**阶段 3：实现 Tailscale 发现（可选）**
1. 调用 Tailscale CLI
2. 获取 MagicDNS 名称
3. 跨网络发现

---

## 4. 实例添加验证流程

### 3.1 标准流程

```
用户输入 Gateway 地址 + Token
    ↓
1. GET /health → 检查 Gateway 是否在线
    ├─ 失败 → 返回错误："无法连接到 Gateway"
    └─ 成功 → 继续
    ↓
2. POST /tools/invoke → 验证 Token 是否正确
    ├─ 401/403 → 返回错误："管理 Token 错误"
    └─ 200 → 验证通过
    ↓
3. 保存到数据库
    ↓
4. 根据 IP 判断实例类型
    ├─ 本地 (127.0.0.1/localhost) → 提示"✅ 添加成功"
    └─ 远程 (其他 IP) → 提示"⚠️ 添加成功，需要设备配对"
```

### 3.2 返回结果示例

**本地实例：**
```json
{
  "success": true,
  "instance_id": "inst-abc123",
  "message": "✅ 实例已添加，可以立即使用",
  "instance_type": "local"
}
```

**远程实例：**
```json
{
  "success": true,
  "instance_id": "inst-def456",
  "message": "⚠️ 实例已添加，需要设备配对",
  "warning": "请在 Gateway 主机运行：\nopenclaw devices list\nopenclaw devices approve <requestId>",
  "instance_type": "remote"
}
```

---

## 5. 用户操作指南

### 5.1 获取 Gateway Token

**方法 A：查看 Gateway 日志（推荐）**

```bash
# Windows
notepad C:\Users\你的用户名\AppData\Local\Temp\openclaw\openclaw-最新日期.log

# 查找包含 "--token" 的行
```

**方法 B：使用 CLI 生成（如果没有 token）**

```bash
openclaw doctor --generate-gateway-token
```

### 5.2 添加实例

1. 打开 OCM Manager（http://localhost:5176）
2. 登录（如果需要）
3. 点击"添加实例"
4. 输入 Gateway 地址：
   - 本地实例：`127.0.0.1`
   - 内网实例：`192.168.x.x`（其他电脑的 IP）
   - 远程实例：Tailscale IP 或 SSH 隧道地址
5. 输入端口（默认 18789）
6. 输入管理 Token（从 4.1 获取）
7. 点击"添加"

### 5.3 根据提示操作

**本地实例：**
```
✅ 实例已添加，可以立即使用
```

**远程实例：**
```
⚠️ 实例已添加，需要设备配对

请在 Gateway 主机运行以下命令：

1. openclaw devices list
2. openclaw devices approve <requestId>

批准后即可正常使用。
```

---

## 6. 技术实现

### 6.1 后端实现（Rust - Tauri Commands）

**文件：** `src-tauri/src/commands/instance.rs`

#### 核心函数：`test_openclaw_connection`

```rust
/// 测试连接到 OpenCLAW 实例并验证 Token
fn test_openclaw_connection(endpoint: &str, admin_token: &str) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    // 步骤 1：检查 Gateway 是否在线（公开端点，不需要认证）
    let health_url = format!("{}/health", endpoint.trim_end_matches('/'));
    let health_resp = client
        .get(&health_url)
        .send()
        .map_err(|e| {
            if e.is_timeout() {
                format!("连接超时（10 秒）：{}\n\n请检查：\n1. 设备是否在线\n2. 网络是否通畅\n3. 防火墙是否开放端口", endpoint)
            } else if e.is_connect() {
                format!("无法连接到设备：{}\n\n请检查：\n1. IP 地址/端口是否正确\n2. OpenCLAW 是否正在运行\n3. 设备是否可访问", endpoint)
            } else {
                format!("连接失败：{}\n\n错误详情：{}", endpoint, e)
            }
        })?;
    
    if !health_resp.status().is_success() {
        return Err(format!("Gateway 返回错误状态：{}", health_resp.status()));
    }
    
    // 步骤 2：验证 Token 是否正确（使用 /tools/invoke 端点）
    let invoke_url = format!("{}/tools/invoke", endpoint.trim_end_matches('/'));
    let invoke_resp = client
        .post(&invoke_url)
        .header("Authorization", format!("Bearer {}", admin_token))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "tool": "sessions_list",
            "args": {}
        }))
        .send()
        .map_err(|e| format!("验证 Token 失败：{}", e))?;
    
    // 401/403 表示 Token 错误
    if invoke_resp.status() == reqwest::StatusCode::UNAUTHORIZED 
        || invoke_resp.status() == reqwest::StatusCode::FORBIDDEN {
        return Err("管理 Token 错误，请检查后重试".to_string());
    }
    
    // 其他错误状态
    if !invoke_resp.status().is_success() {
        return Err(format!("API 返回错误状态：{}", invoke_resp.status()));
    }
    
    Ok(())
}
```

### 6.2 前端实现（React + TypeScript）

**文件：** `apps/web/src/modules/instances/InstancesPage.tsx`

#### 统一添加界面

```typescript
interface AddInstanceForm {
  name: string;
  host_ip: string;        // 支持任意 IP（127.0.0.1 或 192.168.x.x）
  admin_port: number;
  admin_token: string;
  config_id?: string;
  skill_ids?: string[];
  department_id?: string;
  skip_test?: boolean;
}
```

---

## 7. 故障排除

### 7.1 问题 1：添加时提示"管理 Token 错误"

**可能原因：**
1. Token 输入错误（配置文件里的 token 可能不生效）
2. Gateway 没有配置认证
3. Gateway 版本太旧

**解决方法：**
```bash
# 1. 查看 Gateway 实际使用的 token
wmic process where "name='node.exe'" get CommandLine

# 2. 用 curl 测试 token
curl -s -X POST http://127.0.0.1:18789/tools/invoke ^
  -H "Authorization: Bearer 你的 token" ^
  -d '{"tool": "sessions_list"}'

# 3. 如果返回 401，换一个 token 重试
```

### 7.2 问题 2：添加时提示"无法连接到 Gateway"

**可能原因：**
1. Gateway 没有运行
2. IP 地址或端口错误
3. 防火墙阻止连接

**解决方法：**
```bash
# 1. 检查 Gateway 是否运行
openclaw gateway status

# 2. 测试健康检查端点
curl http://127.0.0.1:18789/health

# 3. 检查端口监听
netstat -ano | findstr :18789
```

### 7.3 问题 3：远程实例添加成功但无法使用

**可能原因：** 没有进行设备配对

**解决方法：**
```bash
# 在 Gateway 主机上运行
openclaw devices list
openclaw devices approve <requestId>
```

### 7.4 问题 4：Token 总是变化

**原因：** Gateway 每次启动生成新 token

**解决方法：**
- 方案 A：修改 Gateway 启动脚本，使用固定 token
- 方案 B：OCM Manager 自动检测当前 token（推荐）

---

## 8. 官方文档参考

- [Gateway 认证机制](https://docs.openclaw.ai/zh-CN/gateway/authentication)
- [工具调用 HTTP API](https://docs.openclaw.ai/zh-CN/gateway/tools-invoke-http-api)
- [设备配对](https://docs.openclaw.ai/zh-CN/gateway/pairing)
- [远程访问](https://docs.openclaw.ai/zh-CN/gateway/remote)
- [配置参考](https://docs.openclaw.ai/zh-CN/gateway/configuration-reference)
- [Doctor 命令](https://docs.openclaw.ai/zh-CN/gateway/doctor)
- [安全性](https://docs.openclaw.ai/zh-CN/gateway/security)

---

## ⚠️ 重要注意事项

1. **不要混淆项目**
   - OCM Manager 是管理工具
   - Gateway 是被管理的实例
   - 两者的代码和配置是独立的

2. **认证 token 不是 admin_token**
   - Gateway 没有 `admin_token` 概念
   - 正确的名称是 `gateway.auth.token`
   - HTTP API 使用 `Authorization: Bearer <token>` header

3. **/health 是公开端点**
   - 用于健康检查，不需要认证
   - 任何人都可以访问
   - 不能用来验证 token

4. **/tools/invoke 需要认证**
   - 用于调用工具
   - 需要 `Authorization: Bearer <token>` header
   - 可以用来验证 token 是否正确

5. **本地连接自动信任**
   - 127.0.0.1 或 localhost 的连接自动批准
   - 不需要设备配对
   - 远程连接需要配对

6. **Token 可能动态变化 ⭐**
   - Gateway 可能每次启动生成新 token
   - 配置文件的 token 可能不生效
   - 优先使用 Gateway 日志里的 token

---

## 🎯 最佳实践

1. **添加实例前先测试连通性**
   ```bash
   curl http://<gateway-ip>:18789/health
   ```

2. **远程访问优先使用 SSH 隧道或 Tailscale**
   - 最安全
   - 不需要暴露 Gateway 到公网
   - 官方推荐

3. **自动检测 Gateway Token**
   - 不要让用户手动输入
   - OCM Manager 应该自动获取当前 token

4. **使用 Bonjour 自动发现（同一局域网）**
   - 显示友好的设备名称
   - 自动发起配对
   - Token 自动获取

5. **设备配对后保存 Token**
   - 后续连接自动使用
   - 避免重复配对

6. **为不同环境使用不同实例**
   - 开发环境：本地实例
   - 生产环境：远程实例（有独立的 Gateway）

---

## 📝 更新历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2026-04-05 | 初始版本 |
| v2.0 | 2026-04-05 | 添加架构设计内容 |
| v3.0 | 2026-04-05 | ⭐ 添加 Gateway Token 管理机制发现 |
| v4.0 | 2026-04-05 | ⭐⭐ 添加远程实例自动发现与配对机制 |

---

**文档结束**
