# OCM Agent Skill

**技能名称：** OCM Agent
**版本：** 1.0.0
**作者：** OpenCLAW Team
**描述：** OpenCLAW Manager 代理插件，用于向管理平台上报实例状态、Token用量和Skill元信息。

## 功能

- **心跳上报：** 每5分钟向Manager上报实例状态
- **用量统计：** 收集并上报Token消耗数据
- **Skill同步：** 上报实例中的Skill元信息
- **自动注册：** 首次运行时自动注册到Manager平台

## 配置

```yaml
name: ocm-agent
description: OpenCLAW Manager Agent
version: 1.0.0
author: OpenCLAW Team

# 上报配置
config:
  manager_url: "http://localhost:8080/api/v1"
  heartbeat_interval: 300  # 5分钟
  instance_token: ""
  instance_id: ""

# 执行命令
commands:
  - name: report
    description: 上报数据到Manager
    script: report.js
    args:
      - type: string
        name: action
        description: 上报类型 (heartbeat/usage/skills)
      - type: string
        name: manager_url
        description: Manager API地址
      - type: string
        name: instance_token
        description: 实例令牌
```