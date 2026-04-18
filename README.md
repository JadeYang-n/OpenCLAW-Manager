# OpenCLAW-Manager
OpenCLAW 多实例企业级管控平台

<div align="center">

**AI Agent 时代的企业级管控平台**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v1.0.0--Alpha-orange.svg)](https://github.com/JadeYang-n/OpenCLAW-Manager)
[![Actix](https://img.shields.io/badge/Actix-web-009639?logo=rust)](https://actix.rs/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-stable-DEA584?logo=rust)](https://www.rust-lang.org/)

**⚠️ Alpha 版本警告**：本项目目前处于 **Alpha 阶段**，核心功能已实现，但尚未完整测试。适合开发者和早期采用者尝鲜，**不建议用于生产环境**。

</div>

---

## 🚀 为什么需要 OpenCLAW Manager？

OpenCLaw 是强大的个人 AI 助理框架，但**企业使用时面临三大痛点**：

| 痛点 | 场景 | 后果 |
|------|------|------|
| **多实例难管理** | 客服/销售/内部支持各有 OpenCLaw 实例 | 运维分散，配置不一致 |
| **权限不可控** | 员工误操作/恶意操作 | 数据泄露，服务中断 |
| **成本不透明** | Token 消耗无法分摊到部门 | 财务无法核算，浪费严重 |

**OpenCLAW Manager 就是为了解决这些问题而生** —— 做 AI Agent 时代的 K8s。

---

## ✨ 核心特性（v1.0.0 Alpha）

### 🏢 多实例统一管控
- ✅ 同时管理 **多个 OpenCLaw 实例**
- ✅ 实例状态监控（在线/离线）
- ✅ 本地实例扫描
- ✅ 局域网 Gateway 发现
- ✅ 远程 Gateway 添加（需配对）

### 🔐 企业级权限系统（5 角色）
| 角色 | 典型用户 | 核心权限 |
|------|---------|---------|
| **超级管理员** | CTO/技术总监 | 所有权限 + 用户管理 |
| **运维管理员** | 运维负责人 | 实例管理 + 部署 + 监控 + 安全 |
| **部门管理员** | 部门主管 | 查看本部门 + 管理成员 |
| **普通员工** | 一般员工 | 仅查看个人数据 |
| **审计员** | 财务/合规 | 审计日志 + 成本报表 |

### 📊 部门级数据隔离
- ✅ 实例按部门归属
- ✅ Token 消耗按部门统计
- ✅ 部门管理员只能看到本部门数据
- ✅ 成本分摊报表

### 🔒 安全审计合规
- ✅ 审计日志（操作追溯）
- ✅ API Key 加密存储（AES-256-GCM）
- ✅ 风险操作分级确认

### 💰 Token 成本分析
- ✅ 实时 Token 消耗监控
- ✅ 按部门/业务线分摊
- ✅ 每日趋势图表
- ✅ 详细使用记录（时间、实例、模型、Token 数、成本）
- ✅ 导出 CSV 功能

### 🛠️ Skills 管理（代码已实现，待测试）
- ✅ Skill 上传/编辑/删除
- ✅ Skill 版本控制
- ✅ Skill 审核（自动 + 人工）
- ✅ Skill 商店
- ✅ Skill 远程调用
- ✅ Skill 授权管理

### 🖥️ 双形态部署
- ✅ **Web 控制台**（浏览器访问）
- 🔄 **Tauri 桌面应用**（开发中）

---

## 📸 功能预览

![实例管理](https://raw.githubusercontent.com/JadeYang-n/OpenCLAW-Manager/master/1.png)
![仪表盘](https://raw.githubusercontent.com/JadeYang-n/OpenCLAW-Manager/master/2.png)
![部署向导](https://raw.githubusercontent.com/JadeYang-n/OpenCLAW-Manager/master/3.png)
![配置管理](https://raw.githubusercontent.com/JadeYang-n/OpenCLAW-Manager/master/4.png)
![Skills 管理](https://raw.githubusercontent.com/JadeYang-n/OpenCLAW-Manager/master/5.png)
![Token 分析](https://raw.githubusercontent.com/JadeYang-n/OpenCLAW-Manager/master/6.png)
![用户管理](https://raw.githubusercontent.com/JadeYang-n/OpenCLAW-Manager/master/7.png)

---

## 🚀 快速开始

### 方式一：源码编译（推荐）

```bash
# 克隆仓库
git clone https://github.com/JadeYang-n/OpenCLAW-Manager.git
cd OpenCLAW-Manager/ocm-manager

# 安装依赖

# 后端
cd src/server
cargo build --release

# 前端
cd apps/web
pnpm install
```

### 启动服务

```bash
# 终端 1：启动后端
cd src/server
cargo run --release

# 终端 2：启动前端
cd apps/web
pnpm dev

# 访问 http://localhost:5173
```

### 初始账号

- 用户名：`admin`
- 密码：`admin123`

**⚠️ 首次登录后请立即修改密码**

---

## 📋 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|---------|---------|
| **CPU** | 2 核 | 4 核 |
| **内存** | 4GB | 8GB |
| **磁盘** | 2GB | 10GB |
| **操作系统** | Windows 10 / macOS 10.15 / Linux | Windows 11 / macOS 12+ / Ubuntu 22.04+ |

**数据库:** SQLite（内置，无需单独安装）

---

## 🗺️ 开发路线图

### ✅ v1.0 - 基础权限（Alpha 已发布）
- [x] 用户登录/登出（JWT 认证）
- [x] 5 角色权限系统
- [x] 实例管理 CRUD
- [x] 操作审计日志
- [x] Token 分析页面

### ✅ v2.0 - Beta 版本（当前版本）
- [x] 部门管理 API
- [x] 数据库设计
- [x] 实例 - 部门绑定 UI
- [x] Token 分析 - 部门视图
- [x] Gateway 在线状态检测
- [x] Gateway 自动配置
- [x] Token 计费功能

### 🔄 v2.5 - 完善测试（计划中）
- [ ] Skill 管理完整测试
- [ ] 部署向导完整测试
- [ ] 多角色权限测试
- [ ] LAN 自动发现测试
- [ ] 远程配对测试

### 📋 v3.0 - 完整 RBAC（未来版本）
- [ ] 自定义角色
- [ ] 细粒度权限（按钮级）
- [ ] SSO 单点登录（LDAP/AD）
- [ ] 工作流审批

---

## 🔧 技术栈

| 层级 | 技术选型 |
|------|---------|
| **前端框架** | React 19 + Vite + TypeScript |
| **后端框架** | Rust + Actix-web |
| **数据库** | SQLite (支持连接池) |
| **认证** | JWT |
| **加密** | AES-256-GCM |
| **图表** | Recharts |

---

## 📊 与同类竞品对比

| 功能 | OpenCLAW Manager | 同类工具 A | 同类工具 B | 同类工具 C |
|------|-----------------|-----------|-----------|-----------|
| **多实例管理** | ✅ 支持 | ⚠️ 有限 | ❌ 单实例 | ⚠️ 有限 |
| **权限系统** | ✅ 5 角色 + 部门 | ⚠️ 基础 | ❌ 无 | ✅ RBAC |
| **部门隔离** | ✅ | ❌ | ❌ | ❌ |
| **审计日志** | ✅ | ⚠️ 基础 | ⚠️ 任务审计 | ✅ HMAC |
| **成本分析** | ✅ Token 分摊 | ❌ | ❌ | ❌ |
| **开源协议** | MIT | GPLv3 | MIT | AGPL 3.0 |

**关键差异化：**
- 🏆 **唯一支持部门级数据隔离**（中大型企业必需）
- 🏆 **唯一支持 Token 成本分摊**（财务/CFO 关注）
- 🏆 **MIT 协议**（商业友好，AGPL 要求开源修改）

> 💡 注：同类工具 A/B/C 代表市场上主流的 OpenCLaw 管理方案，具体数据基于公开文档和实际测试。

---

## ⚠️ Alpha 版本说明

**本项目目前处于 Alpha 阶段，请知悉以下情况：**

| 状态 | 说明 | 建议 |
|------|------|------|
| **核心功能** | 已实现，部分通过测试 | 可用于本地开发测试 |
| **部分功能** | 已实现但未测试（Skills 管理等） | 待完整测试 |
| **已知 Bug** | 编译警告 222 个（不影响运行） | 建议修复 |
| **前端包大小** | 945KB（需优化代码分割） | 加载速度待优化 |

**更新频率：** 持续迭代中

**⚠️ Alpha Version Notes**

**This project is currently in Alpha stage, please be aware of the following:**

| Status | Description | Recommendation |
|--------|-------------|----------------|
| **Core Features** | Implemented, partially tested | Can be used for local development testing |
| **Some Features** | Implemented but not tested (Skill management, etc.) | Pending complete testing |
| **Known Issues** | 222 compilation warnings (no impact on runtime) | Recommended to fix |
| **Frontend Bundle Size** | 945KB (needs code splitting optimization) | Loading speed needs improvement |

**Update Frequency:** Continuous iteration

---

## 🔐 安全说明

### 默认安全配置
- ✅ 审计日志（只追加）
- ✅ API Key 加密存储（AES-256-GCM）
- ✅ 会话过期（30 分钟无操作）

### 漏洞报告
发现安全问题？请通过以下方式报告：
- 📧 Email: 1762961769@qq.com
- 🔒 [GitHub Issues](https://github.com/JadeYang-n/OpenCLAW-Manager/issues)

---

## 📬 联系作者

目前项目由**独立开发者**维护，欢迎反馈和建议！

| 渠道 | 说明 |
|------|------|
| **GitHub Issues** | Bug 报告/功能建议：[点击提交](https://github.com/JadeYang-n/OpenCLAW-Manager/issues) |
| **Email** | 1762961769@qq.com |

---

## 📄 开源协议

本项目采用 **MIT 协议** 开源 —— 完全免费，可商用，无限制。

---

## 🙏 致谢

- [OpenCLaw](https://github.com/openclaw/openclaw) —— 强大的 AI 助理框架
- [Actix-web](https://actix.rs/) —— 优秀的 Rust Web 框架
- [React](https://react.dev/) —— 现代化前端框架

---

<div align="center">

**⚠️ Beta 版本 | 持续更新中 | 欢迎反馈**

Made with ❤️ by OpenCLAW Manager Contributors

</div>
