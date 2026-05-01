# OCM Token Collector

轻量级 Token 用量采集脚本，部署在员工电脑上，自动扫描 OpenCLAW 会话文件并上报到 Manager。

## 架构

```
员工电脑                                    OCM Manager
┌──────────────────────┐                  ┌─────────────────┐
│  Scheduled Task      │  POST /api/v1/   │                 │
│  (启动时运行, 持续)   │── agent/usage ──►│  token_usage 表 │
│                      │                  │                 │
│  token-collector.ps1 │                  │                 │
│  ├── 扫描 JSONL 文件  │                  │                 │
│  ├── 解析 usage 数据  │                  │                 │
│  ├── 去重 (state)    │                  │                 │
│  └── POST 上报       │                  │                 │
└──────────────────────┘                  └─────────────────┘
```

## 文件说明

| 文件 | 用途 |
|------|------|
| `collector-config.json` | 配置模板（Manager URL + Instance Token） |
| `token-collector.ps1` | 主采集脚本（PowerShell 5.1+，Windows 自带） |
| `install-collector.ps1` | 安装脚本（创建 Windows 计划任务，需管理员） |
| `collector-state.json` | 运行后生成，记录已上报的 responseId（去重用） |
| `collector.log` | 运行后生成，日志文件 |

## 快速开始

### 1. 获取 Instance Token

在 Manager 后端查询实例的 admin_token：

```bash
# Manager 服务器上运行
curl http://localhost:8080/api/v1/instances -H "Authorization: Bearer <JWT>"
# 找到对应实例的 admin_token 字段
```

### 2. 配置

编辑 `collector-config.json`：

```json
{
  "manager_url": "http://192.168.1.100:8080",
  "instance_token": "从 Manager 获取的 admin_token",
  "collection_interval_seconds": 60,
  "state_file": "collector-state.json",
  "log_file": "collector.log"
}
```

### 3. 测试运行

```powershell
# 先跑一次看看能不能上报
powershell -ExecutionPolicy Bypass -File token-collector.ps1 -Once
```

### 4. 安装为开机自启

```powershell
# 以管理员身份运行
powershell -ExecutionPolicy Bypass -File install-collector.ps1
```

安装后脚本会在系统启动时自动运行，每 60 秒扫描一次会话文件。

### 5. 卸载

```powershell
# 以管理员身份运行
Unregister-ScheduledTask -TaskName "OCM-TokenCollector" -Confirm:$false
# 然后删除整个 collector 目录
```

## 工作原理

1. **扫描**：查找 `~/.openclaw/agents/*/sessions/*.jsonl` 和 `~/.openclaw-autoclaw/agents/*/sessions/*.jsonl`
2. **解析**：从 JSONL 行中提取 usage 数据（totalTokens, input, output）
3. **去重**：通过 responseId 去重，已上报的不重复发送
4. **上报**：POST 到 Manager `/api/v1/agent/usage`，使用 `X-Instance-Token` 认证
5. **状态持久化**：已上报的 responseId 保存到 collector-state.json

## 要求

- Windows 10/11
- PowerShell 5.1+（系统自带）
- 无需安装 Node.js、Python 或其他依赖
- 员工电脑上已安装并运行 OpenCLAW/AutoClaw

## 故障排查

### 日志位置

```powershell
Get-Content collector.log -Tail 50
```

### 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `Config not found` | 配置文件缺失 | 确认 collector-config.json 在同一目录 |
| `Connection refused` | Manager 不可达 | 检查 manager_url 和网络连通性 |
| `401 Unauthorized` | Token 无效 | 检查 instance_token 是否正确 |
| `No new usage entries` | 没有新数据 | 正常，说明没有新的对话发生 |

### 手动触发一次采集

```powershell
powershell -ExecutionPolicy Bypass -File token-collector.ps1 -Once
```

### 查看计划任务状态

```powershell
Get-ScheduledTask -TaskName "OCM-TokenCollector" | Get-ScheduledTaskInfo
```
