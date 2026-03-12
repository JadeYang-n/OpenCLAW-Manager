```markdown
# OpenCLAW-Manager
OpenCLAW Multi-Instance Enterprise Control Platform

<div align="center">

**AI Agent 时代的企业级管控平台**
**Enterprise-Grade Control Platform for the AI Agent Era**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-Alpha-orange.svg)](https://github.com/YOUR_USERNAME/ocm-manager/releases)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8DB?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-stable-DEA584?logo=rust)](https://www.rust-lang.org/)

**⚠️ Alpha 版本警告**：本项目目前处于 **Alpha 阶段**，不是生产就绪版本。代码会**迅速且持续更新**，API 和功能可能随时变化。适合早期采用者和开发者尝鲜，**不建议用于生产环境**。
**⚠️ Alpha Version Warning**: This project is currently in **Alpha stage** and is not production-ready. The code will be **updated rapidly and continuously**, and APIs and features may change at any time. Suitable for early adopters and developers to try out, **not recommended for production environments**.

[English](#english) | [简体中文](#简体中文)

</div>

---

## 🚀 为什么需要 OpenCLAW Manager？
## 🚀 Why Do We Need OpenCLAW Manager?

OpenCLaw 是强大的个人 AI 助理框架，但**企业使用时面临三大痛点**：
OpenCLaw is a powerful personal AI assistant framework, but **enterprises face three major pain points when using it**:

| 痛点 | 场景 | 后果 |
|------|------|------|
| **多实例难管理** | 客服/销售/内部支持各有 OpenCLaw 实例 | 运维分散，配置不一致 |
| **权限不可控** | 员工误操作/恶意操作 | 数据泄露，服务中断 |
| **成本不透明** | Token 消耗无法分摊到部门 | 财务无法核算，浪费严重 |
| **Pain Point** | Scenario | Consequence |
|------|------|------|
| **Difficult Multi-Instance Management** | Customer service/sales/internal support each have their own OpenCLaw instances | Decentralized operation and maintenance, inconsistent configurations |
| **Uncontrollable Permissions** | Employee misoperation/malicious operation | Data leakage, service interruption |
| **Opaque Costs** | Token consumption cannot be allocated to departments | Financial accounting impossible, severe waste |

**OpenCLAW Manager 就是为了解决这些问题而生** —— 做 AI Agent 时代的 K8s。
**OpenCLAW Manager was born to solve these problems** —— serving as the K8s for the AI Agent era.

---

## ✨ 核心特性
## ✨ Core Features

### 🏢 多实例统一管控
### 🏢 Unified Multi-Instance Management
- ✅ 同时管理 **3-100+ 个 OpenCLaw 实例** | ✅ Manage **3-100+ OpenCLaw instances** simultaneously
- ✅ 批量操作（重启/升级/配置同步） | ✅ Batch operations (restart/upgrade/configuration synchronization)
- ✅ 状态总览（在线/离线/降级一目了然） | ✅ Status overview (online/offline/degraded status at a glance)
- ✅ 灰度发布 + 自动回滚 | ✅ Canary release + automatic rollback

### 🔐 企业级权限系统（5 角色）
### 🔐 Enterprise-Grade Permission System (5 Roles)
| 角色 | 典型用户 | 核心权限 |
|------|---------|---------|
| **超级管理员** | CTO/技术总监 | 所有权限 + 用户管理 |
| **运维管理员** | 运维负责人 | 实例管理 + 部署 + 监控 + 安全 |
| **部门管理员** | 部门主管 | 查看本部门 + 管理成员 |
| **普通员工** | 一般员工 | 仅查看个人数据 |
| **审计员** | 财务/合规 | 审计日志 + 成本报表 |
| **Role** | Typical User | Core Permissions |
|------|---------|---------|
| **Super Admin** | CTO/Technical Director | Full permissions + user management |
| **Ops Admin** | Operations Manager | Instance management + deployment + monitoring + security |
| **Department Admin** | Department Supervisor | View own department + manage members |
| **Regular Employee** | General Staff | View personal data only |
| **Auditor** | Finance/Compliance | Audit logs + cost reports |

### 📊 部门级数据隔离
### 📊 Department-Level Data Isolation
- ✅ 实例按部门归属 | ✅ Instances belong to specific departments
- ✅ Token 消耗按部门统计 | ✅ Token consumption statistics by department
- ✅ 部门管理员只能看到本部门数据 | ✅ Department admins can only view their department's data
- ✅ 成本分摊报表（支持导出 Excel） | ✅ Cost allocation reports (Excel export supported)

### 🔒 安全审计合规
### 🔒 Security Audit & Compliance
- ✅ **HMAC 签名审计日志**（防篡改） | ✅ **HMAC-signed audit logs** (tamper-proof)
- ✅ 操作追溯（谁、何时、做了什么） | ✅ Operation traceability (who, when, what actions were taken)
- ✅ API Key 加密存储（AES-256-GCM） | ✅ API Key encrypted storage (AES-256-GCM)
- ✅ 双因素认证（TOTP） | ✅ Two-factor authentication (TOTP)
- ✅ 风险操作分级确认（L/M/H） | ✅ Risk operation level confirmation (L/M/H)

### 💰 Token 成本分析
### 💰 Token Cost Analysis
- ✅ 实时 Token 消耗监控 | ✅ Real-time Token consumption monitoring
- ✅ 按部门/业务线分摊 | ✅ Allocation by department/business line
- ✅ 异常检测（空闲实例告警） | ✅ Anomaly detection (idle instance alerts)
- ✅ 成本优化建议 | ✅ Cost optimization suggestions

### 🛠️ Skills 管理
### 🛠️ Skills Management
- ✅ 支持从 **[ClawHub 官网](https://clawhub.ai)** 一键安装 Skills | ✅ One-click installation of Skills from **[ClawHub Official Website](https://clawhub.ai)**
- ✅ 支持从 **[Anthropic 官方 Skills 仓库](https://github.com/anthropics/skills)** 导入 | ✅ Import from **[Anthropic Official Skills Repository](https://github.com/anthropics/skills)**
- ✅ Skills 版本管理和更新 | ✅ Skills version management and updates

### 🖥️ 双形态部署
### 🖥️ Dual-Form Deployment
- ✅ **Tauri 桌面应用**（Windows/macOS/Linux） | ✅ **Tauri Desktop App** (Windows/macOS/Linux)
- ✅ **Web 控制台**（浏览器访问） | ✅ **Web Console** (browser access)

## 📸 功能预览
## 📸 Feature Preview

![实例管理 Instance Management](https://github.com/JadeYang-n/OpenCLAW-Manager/blob/master/1.png)

![仪表盘 Dashboard](https://github.com/JadeYang-n/OpenCLAW-Manager/blob/master/2.png)

![部署向导 Deployment Wizard](https://github.com/JadeYang-n/OpenCLAW-Manager/blob/master/3.png)

![配置管理 Configuration Management](https://github.com/JadeYang-n/OpenCLAW-Manager/blob/master/4.png)

![skills管理 Skills Management](https://github.com/JadeYang-n/OpenCLAW-Manager/blob/master/5.png)

![Token 分析 Token Analysis](https://github.com/JadeYang-n/OpenCLAW-Manager/blob/master/6.png)

![用户管理 User Management](https://github.com/JadeYang-n/OpenCLAW-Manager/blob/master/7.png)

---

## 🚀 快速开始
## 🚀 Quick Start

### 方式一：下载桌面应用（推荐）
### Method 1: Download Desktop App (Recommended)

**Windows:**
```powershell
# 下载安装包（Alpha 版本）
# Download installer (Alpha version)
# https://github.com/openclaw-manager/openclaw-manager/releases/latest/download/OpenCLAW.Manager_x64-setup.exe
```

**macOS:**
```bash
# 下载 .dmg（Alpha 版本）
# Download .dmg (Alpha version)
# https://github.com/openclaw-manager/openclaw-manager/releases/latest/download/OpenCLAW.Manager.dmg
```

**Linux:**
```bash
# .AppImage
wget https://github.com/openclaw-manager/openclaw-manager/releases/latest/download/OpenCLAW.Manager.AppImage
chmod +x OpenCLAW.Manager.AppImage
./OpenCLAW.Manager.AppImage
```

### 方式二：Docker 部署
### Method 2: Docker Deployment

```bash
# 一键启动（开发环境）
# One-click start (development environment)
docker run -d \
  -p 3000:3000 \
  -v openclaw-manager-data:/app/data \
  --name openclaw-manager \
  ghcr.io/openclaw-manager/openclaw-manager:alpha

# 访问 http://localhost:3000
# Access http://localhost:3000
# 默认账号：admin / 密码：admin123（首次登录强制修改）
# Default account: admin / Password: admin123 (forced modification on first login)
```

### 方式三：源码编译
### Method 3: Compile from Source

```bash
# 克隆仓库
# Clone repository
git clone https://github.com/YOUR_USERNAME/ocm-manager.git
cd openclaw-manager

# 安装依赖
# Install dependencies
pnpm install

# 开发模式（桌面应用）
# Development mode (desktop app)
pnpm tauri dev

# 构建生产版本
# Build production version
pnpm tauri build
```

---

## 📋 系统要求
## 📋 System Requirements

| 部署方式 | CPU | 内存 | 磁盘 | 支持实例数 |
|---------|-----|------|------|-----------|
| **桌面应用** | 2 核 | 4GB | 2GB | ≤10 个 |
| **Docker (基础)** | 2 核 | 4GB | 5GB | ≤10 个 |
| **Docker (标准)** | 4 核 | 8GB | 20GB | ≤50 个 |
| **Docker (企业)** | 8 核 | 16GB | 50GB | ≤100+ 个 |
| **Deployment Method** | CPU | Memory | Disk | Supported Instance Count |
|---------|-----|------|------|-----------|
| **Desktop App** | 2 Cores | 4GB | 2GB | ≤10 |
| **Docker (Basic)** | 2 Cores | 4GB | 5GB | ≤10 |
| **Docker (Standard)** | 4 Cores | 8GB | 20GB | ≤50 |
| **Docker (Enterprise)** | 8 Cores | 16GB | 50GB | ≤100+ |

**数据库:**
**Database:**
- 开发/小规模：SQLite（内置） | Development/Small-scale: SQLite (built-in)
- 生产环境：PostgreSQL 17+（推荐 TimescaleDB 插件） | Production: PostgreSQL 17+ (TimescaleDB extension recommended)

---

## 🗺️ 开发路线图
## 🗺️ Development Roadmap

### ✅ v1.0 - 基础权限（Alpha 已发布）
### ✅ v1.0 - Basic Permissions (Alpha Released)
- [√] 用户登录/登出（JWT 认证） | [√] User login/logout (JWT authentication)
- [√] 5 角色权限系统 | [√] 5-role permission system
- [√] 实例管理 CRUD | [√] Instance management CRUD
- [√] 操作审计日志 | [√] Operation audit logs
- [√] Token 分析页面 | [√] Token analysis page

### 🔄 v1.5 - 部门隔离（开发中）
### 🔄 v1.5 - Department Isolation (In Development)
- [√] 部门管理 API | [√] Department management API
- [√] 数据库设计 | [√] Database design
- [√] 实例 - 部门绑定 UI | [√] Instance - Department binding UI
- [ ] 用户 - 部门绑定 UI | [ ] User - Department binding UI
- [ ] Token 分析 - 部门视图 | [ ] Token analysis - Department view

### 📋 v2.0 - 完整 RBAC（计划中）
### 📋 v2.0 - Full RBAC (Planned)
- [ ] 自定义角色 | [ ] Custom roles
- [ ] 细粒度权限（按钮级） | [ ] Granular permissions (button-level)
- [ ] SSO 单点登录（LDAP/AD） | [ ] SSO single sign-on (LDAP/AD)
- [ ] 工作流审批 | [ ] Workflow approval

---

## 🔧 技术栈
## 🔧 Technology Stack

| 层级 | 技术选型 |
|------|---------|
| **桌面框架** | Tauri v2 + React 19 + TypeScript |
| **后端语言** | Rust (Axum + SQLx + Tokio) |
| **主数据库** | PostgreSQL 17 |
| **时序数据** | TimescaleDB |
| **缓存** | Redis 7 |
| **前端图表** | Recharts + ECharts |
| **认证** | JWT + TOTP (2FA) |
| **加密** | AES-256-GCM |
| **Layer** | Technology Selection |
|------|---------|
| **Desktop Framework** | Tauri v2 + React 19 + TypeScript |
| **Backend Language** | Rust (Axum + SQLx + Tokio) |
| **Primary Database** | PostgreSQL 17 |
| **Time-Series Data** | TimescaleDB |
| **Caching** | Redis 7 |
| **Frontend Charts** | Recharts + ECharts |
| **Authentication** | JWT + TOTP (2FA) |
| **Encryption** | AES-256-GCM |

---

## 📊 与同类竞品对比
## 📊 Comparison with Competitors

| 功能 | OpenCLAW Manager | 同类工具 A | 同类工具 B | 同类工具 C |
|------|-----------------|-----------|-----------|-----------|
| **多实例管理** | ✅ 3-100+ 个 | ⚠️ 有限 | ❌ 单实例 | ⚠️ 有限 |
| **批量操作** | ✅ | ❌ | ❌ | ❌ |
| **权限系统** | ✅ 5 角色 + 部门 | ⚠️ 基础 | ❌ 无 | ✅ RBAC |
| **部门隔离** | ✅ | ❌ | ❌ | ❌ |
| **审计日志** | ✅ HMAC 签名 | ⚠️ 基础 | ⚠️ 任务审计 | ✅ HMAC |
| **成本分析** | ✅ Token 分摊 | ❌ | ❌ | ❌ |
| **桌面应用** | ✅ Tauri | ❌ | ❌ | ❌ |
| **开源协议** | MIT | GPLv3 | MIT | AGPL 3.0 |
| **Feature** | OpenCLAW Manager | Competitor A | Competitor B | Competitor C |
|------|-----------------|-----------|-----------|-----------|
| **Multi-Instance Management** | ✅ 3-100+ | ⚠️ Limited | ❌ Single Instance | ⚠️ Limited |
| **Batch Operations** | ✅ | ❌ | ❌ | ❌ |
| **Permission System** | ✅ 5 Roles + Departments | ⚠️ Basic | ❌ None | ✅ RBAC |
| **Department Isolation** | ✅ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ HMAC Signed | ⚠️ Basic | ⚠️ Task Audit | ✅ HMAC |
| **Cost Analysis** | ✅ Token Allocation | ❌ | ❌ | ❌ |
| **Desktop App** | ✅ Tauri | ❌ | ❌ | ❌ |
| **Open Source License** | MIT | GPLv3 | MIT | AGPL 3.0 |

**关键差异化：**
**Key Differentiators:**
- 🏆 **唯一支持多实例统一管控**（3-100+ 个） | 🏆 **Only supports unified multi-instance management** (3-100+)
- 🏆 **唯一支持部门级数据隔离**（中大型企业必需） | 🏆 **Only supports department-level data isolation** (essential for medium/large enterprises)
- 🏆 **唯一支持 Token 成本分摊**（财务/CFO 关注） | 🏆 **Only supports Token cost allocation** (focus for finance/CFO)
- 🏆 **MIT 协议**（商业友好，AGPL 要求开源修改） | 🏆 **MIT License** (commercially friendly, AGPL requires open-sourcing modifications)

> 💡 注：同类工具 A/B/C 代表市场上主流的 OpenCLaw 管理方案，具体数据基于公开文档和实际测试。
> 💡 Note: Competitors A/B/C represent mainstream OpenCLaw management solutions on the market, with specific data based on public documentation and actual testing.

---

## ⚠️ Alpha 版本说明
## ⚠️ Alpha Version Notes

**本项目目前处于 Alpha 阶段，请知悉以下风险：**
**This project is currently in Alpha stage, please be aware of the following risks:**

| 风险 | 说明 | 建议 |
|------|------|------|
| **API 不稳定** | API 可能随时变化 | 不要依赖特定 API 版本 |
| **功能不完整** | 部分功能可能缺失或有 Bug | 仅用于测试和开发 |
| **数据迁移** | 未来版本可能需要数据迁移 | 定期备份重要数据 |
| **文档滞后** | 文档可能跟不上代码更新 | 查看最新提交和 Issues |
| **生产风险** | 不适合生产环境 | 生产环境请等待 Beta/RC 版本 |
| **Risk** |描述| Recommendation |
|------|------|------|
| **Unstable API** | APIs may change at any time | Do not rely on specific API versions |
| **Incomplete Features** | Some features may be missing or have bugs | Use only for testing and development |
| **Data Migration** | Future versions may require data migration | Regularly back up important data |
| **Outdated Documentation** | Documentation may not keep up with code updates | Check the latest commits and Issues |
| **Production Risks** | Not suitable for production environments | Wait for Beta/RC versions for production use |

**更新频率：** 预计每周 1-2 次更新，持续迭代至 1.0.* 版本。
**Update Frequency:** Expected 1-2 updates per week, continuous iteration until version 1.0.*.

---

## 🔐 安全说明
## 🔐 Security Notes

### 默认安全配置
### Default Security Configuration
- ✅ 双因素认证（管理员强制开启） | ✅ Two-factor authentication (mandatory for admins)
- ✅ 审计日志（HMAC 签名，只追加） | ✅ Audit logs (HMAC-signed, append-only)
- ✅ API Key 加密存储（AES-256-GCM） | ✅ API Key encrypted storage (AES-256-GCM)
- ✅ HTTPS 部署（Let's Encrypt） | ✅ HTTPS deployment (Let's Encrypt)
- ✅ 会话过期（30 分钟无操作） | ✅ Session expiration (30 minutes of inactivity)

### 风险操作分级
### Risk Operation Classification
| 等级 | 操作类型 | 确认要求 |
|------|---------|---------|
| **L 低风险** | 只读操作 | 无需确认 |
| **M 中风险** | 修改配置/重启 | 用户确认 |
| **H 高风险** | 删除/修改 API Key | 二次确认 + 审批 |
| **Level** | Operation Type | Confirmation Requirement |
|------|---------|---------|
| **L Low Risk** | Read-only operations | No confirmation required |
| **M Medium Risk** | Modify configuration/restart | User confirmation required |
| **H High Risk** | Delete/modify API Key | Secondary confirmation + approval required |

### 漏洞报告
### Vulnerability Reporting
发现安全问题？请通过以下方式报告： | Found a security issue? Please report it via:
- 📧 Email: 1762961769@qq.com
- 🔒 [SECURITY.md](SECURITY.md) 查看详细流程 | 🔒 [SECURITY.md](SECURITY.md) View detailed process

---

## 📬 联系作者
## 📬 Contact the Author

目前项目由**独立开发者**维护，欢迎反馈和建议！
The project is currently maintained by **an independent developer**, feedback and suggestions are welcome!

| 渠道 | 说明 |
|------|------|
| **GitHub Issues** | Bug 报告/功能建议（仓库创建后启用）：[点击提交](https://github.com/JadeYang-n/OpenCLAW-Manager/issues) |
| **Email** | 1762961769@qq.com |
| **Channel** |描述|
|------|------|
| **GitHub Issues** | Bug reports/feature suggestions (enabled after repository creation): [Click to submit](https://github.com/JadeYang-n/OpenCLAW-Manager/issues) |
| **Email** | 1762961769@qq.com |

---

## 📄 开源协议
## 📄 Open Source License

本项目采用 **MIT 协议** 开源 —— 完全免费，可商用，无限制。
This project is open-sourced under the **MIT License** — completely free, commercially usable, and unrestricted.

---

## 🙏 致谢
## 🙏 Acknowledgments

- [OpenCLaw](https://github.com/openclaw/openclaw) —— 强大的 AI 助理框架 | Powerful AI assistant framework
- [Tauri](https://tauri.app/) —— 现代化的桌面应用框架 | Modern desktop application framework
- [Axum](https://github.com/tokio-rs/axum) —— 优秀的 Rust Web 框架 | Excellent Rust web framework
- [ClawHub](https://clawhub.com) —— OpenCLaw Skills 市场 | OpenCLaw Skills marketplace
- [Anthropic Skills](https://github.com/anthropics/skills) —— Anthropic 官方 Skills 仓库 | Anthropic official Skills repository

---

<div align="center">

**⚠️ Alpha 版本 | 迅速持续更新中 | 敬请期待 Beta 版本**
**⚠️ Alpha Version | Rapid and continuous updates | Beta version coming soon**

Made with ❤️ by OpenCLAW Manager Contributors

</div>
```
