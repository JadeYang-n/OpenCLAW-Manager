# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目概述

**OpenCLAW Manager** - OpenCLAW 多实例企业级管控平台，定位为 "AI Agent 时代的 K8s"。

- **前端**: React 19 + Vite + TypeScript + TailwindCSS
- **后端**: Rust + Actix-web (REST API)
- **桌面应用**: Tauri 2.0
- **数据库**: SQLite (r2d2 连接池)
- **认证**: JWT + AES-256-GCM 加密

---

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 方式 1：Tauri 桌面应用开发
pnpm tauri dev

# 方式 2：分别启动前后端
# 终端 1 - 后端 (src/server)
cd src/server
cargo run --release

# 终端 2 - 前端 (apps/web)
cd apps/web
pnpm dev
```

### 构建发布

```bash
# Tauri 桌面应用
pnpm tauri build

# 仅后端
cd src/server
cargo build --release

# 仅前端
cd apps/web
pnpm build
```

### 初始账号

首次启动后端时自动创建默认管理员账号（用户名：`admin`）。
> ⚠️ 生产环境请修改默认密码。

---

## 项目结构

```
ocm-manager/
├── apps/web/              # React 前端
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   ├── modules/       # 功能模块
│   │   ├── services/      # API 服务
│   │   ├── stores/        # Zustand 状态管理
│   │   └── utils/         # 工具函数
│   └── package.json
├── src/
│   ├── server/            # Rust Actix-web 后端
│   │   ├── src/
│   │   └── Cargo.toml
│   └── tauri/             # Tauri 桌面应用
│       ├── src/
│       └── Cargo.toml
├── packages/              # 共享包
├── configs/               # 配置文件
├── scripts/               # 构建脚本
└── pnpm-workspace.yaml
```

---

## 核心功能

| 模块 | 状态 | 说明 |
|------|------|------|
| 多实例管理 | ✅ | OpenCLaw 实例 CRUD、状态监控 |
| 权限系统 | ✅ | 5 角色 RBAC（超管/运维/部门/员工/审计） |
| 部门隔离 | ✅ | 实例/Token 按部门归属 |
| Token 分析 | ✅ | 成本分摊、CSV 导出（已验证可用） |
| 审计日志 | ✅ | HMAC 签名、操作追溯 |
| Skills 管理 | ✅ | 列表/调用可用，WebSocket + HTTP API + CLI 三级降级策略 |
| 部署向导 | ✅ | 环境检测 → 修复 → 部署全流程（`/setup/deploy` 路由已接入） |
| Agent 上报 | ✅ | 注册/心跳/用量/Skill 上报管道已打通（token 存储 + 字段对齐已修复） |
| Tauri 桌面 | 🔄 | 开发中 |

---

## 常用命令

```bash
# 清理构建缓存
cargo clean
pnpm clean

# 代码检查
cargo clippy
pnpm lint

# 格式化
cargo fmt
pnpm format
```

---

## 环境配置

1. 复制 `.env.example` 为 `.env`
2. 运行 `scripts/generate-key.ps1` 生成 `OPENCLAW_MASTER_KEY`
3. 配置数据库路径（默认 SQLite）

---

## 注意事项

- **Alpha 版本**: 核心功能已实现，部分模块待测试
- **编译警告**: 6 个（2 deprecated API + 3 个 value never read，不影响运行）
- **前端包大小**: 945KB，需优化代码分割
- **生产环境**: 请修改默认密码

---

## 问题排查

```bash
# 查看后端日志
cd src/server
cargo run --release -- --log-level debug

# 查看 Tauri 日志
pnpm tauri dev --verbose
```

---

## 相关仓库

- GitHub: https://github.com/JadeYang-n/OpenCLAW-Manager
- OpenCLAW: https://github.com/openclaw/openclaw
