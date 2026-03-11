# OpenCLAW Manager

<div align="center">

**AI Agent 时代的企业级管控平台 —— 做 AI Agent 时代的 K8s**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-Alpha-orange.svg)](https://github.com/openclaw-manager/openclaw-manager/releases)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8DB?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-stable-DEA584?logo=rust)](https://www.rust-lang.org/)

**⚠️ Alpha 版本警告**：本项目目前处于 **Alpha 阶段**，不是生产就绪版本。代码会**迅速且持续更新**，API 和功能可能随时变化。适合早期采用者和开发者尝鲜，**不建议用于生产环境**。

[English](#english) | [简体中文](#简体中文)

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

## ✨ 核心特性

### 🏢 多实例统一管控
- ✅ 同时管理 **3-100+ 个 OpenCLaw 实例**
- ✅ 批量操作（重启/升级/配置同步）
- ✅ 状态总览（在线/离线/降级一目了然）
- ✅ 灰度发布 + 自动回滚

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
- ✅ 查看员只能看到本部门数据
- ✅ 成本分摊报表（支持导出 Excel）

### 🔒 安全审计合规
- ✅ **HMAC 签名审计日志**（防篡改）
- ✅ 操作追溯（谁、何时、做了什么）
- ✅ API Key 加密存储（AES-256-GCM）
- ✅ 双因素认证（TOTP）
- ✅ 风险操作分级确认（L/M/H）

### 💰 Token 成本分析
- ✅ 实时 Token 消耗监控
- ✅ 按部门/业务线分摊
- ✅ 异常检测（空闲实例告警）
- ✅ 成本优化建议

### 🛠️ Skills 管理
- ✅ 支持从 **[ClawHub 官网](https://clawhub.com)** 一键安装 Skills
- ✅ 支持从 **[Anthropic 官方 Skills 仓库](https://github.com/anthropics/skills)** 导入
- ✅ Skills 版本管理和更新

### 🖥️ 双形态部署
- ✅ **Tauri 桌面应用**（Windows/macOS/Linux）
- ✅ **Web 控制台**（浏览器访问）

---

## 📸 功能预览

| | |
|---|---|
| ![工作台](docs/images/1.png) | ![实例管理](docs/images/2.png) |
| *图 1: 工作台 - 全局运营概览* | *图 2: 实例管理 - 多实例统一管控* |
| ![Token 分析](docs/images/3.png) | ![审计日志](docs/images/4.png) |
| *图 3: Token 分析 - 成本详细分析* | *图 4: 审计日志 - 操作追溯* |
| ![部门管理](docs/images/5.png) | ![权限设置](docs/images/6.png) |
| *图 5: 部门管理 - 数据隔离* | *图 6: 权限设置 - 角色管理* |
| ![Skills 管理](docs/images/7.png) | |
| *图 7: Skills 管理 - 从 ClawHub/Anthropic 安装* | |

---

## 🚀 快速开始

### 方式一：下载桌面应用（推荐）

**Windows:**
```powershell
# 下载安装包（Alpha 版本）
# https://github.com/openclaw-manager/openclaw-manager/releases/latest/download/OpenCLAW.Manager_x64-setup.exe
```

**macOS:**
```bash
# 下载 .dmg（Alpha 版本）
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

```bash
# 一键启动（开发环境）
docker run -d \
  -p 3000:3000 \
  -v openclaw-manager-data:/app/data \
  --name openclaw-manager \
  ghcr.io/openclaw-manager/openclaw-manager:alpha

# 访问 http://localhost:3000
# 默认账号：admin / 密码：admin123（首次登录强制修改）
```

### 方式三：源码编译

```bash
# 克隆仓库
git clone https://github.com/openclaw-manager/openclaw-manager.git
cd openclaw-manager

# 安装依赖
pnpm install

# 开发模式（桌面应用）
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

---

## 📋 系统要求

| 部署方式 | CPU | 内存 | 磁盘 | 支持实例数 |
|---------|-----|------|------|-----------|
| **桌面应用** | 2 核 | 4GB | 2GB | ≤10 个 |
| **Docker (基础)** | 2 核 | 4GB | 5GB | ≤10 个 |
| **Docker (标准)** | 4 核 | 8GB | 20GB | ≤50 个 |
| **Docker (企业)** | 8 核 | 16GB | 50GB | ≤100+ 个 |

**数据库:**
- 开发/小规模：SQLite（内置）
- 生产环境：PostgreSQL 17+（推荐 TimescaleDB 插件）

---

## 🗺️ 开发路线图

### ✅ v1.0 - 基础权限（Alpha 已发布）
- [x] 用户登录/登出（JWT 认证）
- [x] 5 角色权限系统
- [x] 实例管理 CRUD
- [x] 操作审计日志
- [x] Token 分析页面

### 🔄 v1.5 - 部门隔离（开发中）
- [x] 部门管理 API
- [x] 数据库设计
- [ ] 实例 - 部门绑定 UI
- [ ] 用户 - 部门绑定 UI
- [ ] Token 分析 - 部门视图

### 📋 v2.0 - 完整 RBAC（计划中）
- [ ] 自定义角色
- [ ] 细粒度权限（按钮级）
- [ ] SSO 单点登录（LDAP/AD）
- [ ] 工作流审批

---

## 🔧 技术栈

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

---

## 📊 与同类竞品对比

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

**关键差异化：**
- 🏆 **唯一支持多实例统一管控**（3-100+ 个）
- 🏆 **唯一支持部门级数据隔离**（中大型企业必需）
- 🏆 **唯一支持 Token 成本分摊**（财务/CFO 关注）
- 🏆 **MIT 协议**（商业友好，AGPL 要求开源修改）

> 💡 注：同类工具 A/B/C 代表市场上主流的 OpenCLaw 管理方案，具体数据基于公开文档和实际测试。

---

## ⚠️ Alpha 版本说明

**本项目目前处于 Alpha 阶段，请知悉以下风险：**

| 风险 | 说明 | 建议 |
|------|------|------|
| **API 不稳定** | API 可能随时变化 | 不要依赖特定 API 版本 |
| **功能不完整** | 部分功能可能缺失或有 Bug | 仅用于测试和开发 |
| **数据迁移** | 未来版本可能需要数据迁移 | 定期备份重要数据 |
| **文档滞后** | 文档可能跟不上代码更新 | 查看最新提交和 Issues |
| **生产风险** | 不适合生产环境 | 生产环境请等待 Beta/RC 版本 |

**更新频率：** 预计每周 1-2 次更新，持续迭代至 Beta 版本。

---

## 🔐 安全说明

### 默认安全配置
- ✅ 双因素认证（管理员强制开启）
- ✅ 审计日志（HMAC 签名，只追加）
- ✅ API Key 加密存储（AES-256-GCM）
- ✅ HTTPS 部署（Let's Encrypt）
- ✅ 会话过期（30 分钟无操作）

### 风险操作分级
| 等级 | 操作类型 | 确认要求 |
|------|---------|---------|
| **L 低风险** | 只读操作 | 无需确认 |
| **M 中风险** | 修改配置/重启 | 用户确认 |
| **H 高风险** | 删除/修改 API Key | 二次确认 + 审批 |

### 漏洞报告
发现安全问题？请通过以下方式报告：
- 📧 Email: 1762961769@qq.com
- 🔒 [SECURITY.md](SECURITY.md) 查看详细流程

---

## 📬 联系作者

目前项目由**独立开发者**维护，欢迎反馈和建议！

| 渠道 | 说明 |
|------|------|
| **GitHub Issues** | Bug 报告/功能建议（仓库创建后启用） |
| **Email** | 1762961769@qq.com |

---

## 📄 开源协议

本项目采用 **MIT 协议** 开源 —— 完全免费，可商用，无限制。

```
MIT License

Copyright (c) 2026 OpenCLAW Manager Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🙏 致谢

- [OpenCLaw](https://github.com/openclaw/openclaw) —— 强大的 AI 助理框架
- [Tauri](https://tauri.app/) —— 现代化的桌面应用框架
- [Axum](https://github.com/tokio-rs/axum) —— 优秀的 Rust Web 框架
- [ClawHub](https://clawhub.com) —— OpenCLaw Skills 市场
- [Anthropic Skills](https://github.com/anthropics/skills) —— Anthropic 官方 Skills 仓库

---

<div align="center">

**⚠️ Alpha 版本 | 迅速持续更新中 | 敬请期待 Beta 版本**

Made with ❤️ by OpenCLAW Manager Contributors

</div>
