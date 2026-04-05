# OpenCLAW Manager v2.0.0 Beta 发布说明

**发布日期**: 2026-03-18  
**版本**: v2.0.0 Beta  
**类型**: 公开测试版

---

## 🎉 亮点功能

### 🔐 SSO 单点登录（全新）

**OAuth 2.0 支持**：
- ✅ GitHub OAuth（开发者团队首选）
- ✅ Google OAuth（G Suite 企业）
- ✅ Azure AD OAuth（Microsoft 365 企业）
- ✅ 可视化的 OAuth 配置管理界面
- ✅ 一键测试连接功能

**SAML 2.0 支持**：
- ✅ Okta SAML 配置
- ✅ Azure AD SAML 配置
- ✅ OneLogin SAML 配置
- ✅ SAML 配置测试工具

**Token 管理**：
- ✅ 双 Token 机制（Access Token + Refresh Token）
- ✅ Access Token 有效期：24 小时
- ✅ Refresh Token 有效期：7 天
- ✅ 自动 Token 刷新

---

### 🛡️ 安全增强

**密码加密**：
- ✅ bcrypt 密码哈希（取代明文存储）
- ✅ 盐值自动生成
- ✅ 符合 OWASP 最佳实践

**权限控制**：
- ✅ 5 角色权限体系（Admin/Operator/Developer/Employee/Viewer）
- ✅ 基于角色的访问控制（RBAC）
- ✅ 资源级权限检查

**审计日志**：
- ✅ 所有敏感操作记录
- ✅ 登录/登出追踪
- ✅ 配置变更审计

---

### 📊 核心功能完善

**用户管理**：
- ✅ 完整的用户 CRUD 操作
- ✅ 部门分配
- ✅ 角色管理
- ✅ 批量导入/导出

**实例管理**：
- ✅ OpenCLAW 实例部署
- ✅ 实例监控
- ✅ 资源使用统计

**Token 分析**：
- ✅ Token 使用量统计
- ✅ 成本分析
- ✅ 趋势图表

**Skills 管理**：
- ✅ Skills 上传/下载
- ✅ 版本管理
- ✅ 安全检查

---

## 📦 安装包

### Windows

**MSI 安装包**（推荐）：
```
文件名：ocm-manager_0.1.0_x64_en-US.msi
大小：14.2 MB
架构：x64
```

**下载**：[GitHub Releases](https://github.com/JadeYang-n/OpenCLAW-Manager/releases/tag/v2.0.0-beta)

### 源码

**获取源码**：
```bash
git clone https://github.com/JadeYang-n/OpenCLAW-Manager.git
cd OpenCLAW-Manager/ocm-manager
```

**开发环境运行**：
```bash
# 安装依赖
pnpm install

# 前端开发模式
pnpm --filter ocm-web dev

# 后端开发模式（新终端）
cd src-tauri
cargo run
```

**构建生产版本**：
```bash
pnpm tauri build
```

---

## 🔧 技术栈

**前端**：
- React 18 + TypeScript
- Tailwind CSS
- Vite 5
- Tauri 2.0

**后端**：
- Rust
- Tauri 2.0
- SQLite
- JWT (jsonwebtoken)
- bcrypt

**架构**：
- 前后端分离
- 本地优先（Local-first）
- 离线可用

---

## 📖 文档

### SSO 配置指南

详细配置步骤请参考：[SSO_SETUP_GUIDE.md](docs/SSO_SETUP_GUIDE.md)

**快速开始**：
1. 以管理员身份登录
2. 进入 **安全与设置** → **SSO 单点登录**
3. 点击 **OAuth 配置** 或 **SAML 配置**
4. 按照指南配置你的 IdP
5. 测试连接
6. 启用 SSO 登录

### 其他文档

- [完整技术架构.md](docs/完整技术架构.md)
- [部署成功后的步骤.md](docs/部署成功后的步骤.md)
- [开源运营指南.md](docs/开源运营指南.md)

---

## ⚠️ 已知问题

### Beta 限制

1. **SAML 响应验证**：部分 IdP 的 Attribute 映射需要手动配置
2. **OAuth 用户创建**：首次 SSO 登录时自动创建用户，但需要预先配置默认角色
3. **Token 刷新**：刷新失败时需要重新登录（已在优化中）

### 计划改进

- [ ] 支持更多 OAuth 提供商（GitLab、Bitbucket 等）
- [ ] SAML JIT（Just-in-Time）用户配置
- [ ] 多 IdP 故障转移
- [ ] MFA（多因素认证）
- [ ] SSO 登录审计报表

---

## 🐛 问题反馈

遇到问题？请通过以下方式反馈：

1. **GitHub Issues**: https://github.com/JadeYang-n/OpenCLAW-Manager/issues
2. **Discord**: https://discord.com/invite/clawd
3. **邮件**: support@openclaw.ai

**反馈时请提供**：
- OpenCLAW Manager 版本号
- 操作系统版本
- 错误截图或日志
- 复现步骤

---

## 🙏 致谢

感谢所有贡献者和测试用户！

特别感谢：
- Tauri 团队
- React 社区
- Rust 社区

---

## 📝 更新日志

### v2.0.0 Beta (2026-03-18)

**新增**：
- ✨ SSO 单点登录（OAuth 2.0 + SAML 2.0）
- ✨ OAuth 配置管理界面
- ✨ SAML 配置管理界面
- ✨ Token 双机制（Access + Refresh）
- ✨ bcrypt 密码加密
- ✨ 完整的用户管理 API
- ✨ 审计日志系统

**修复**：
- 🐛 修复前端编译错误
- 🐛 修复 TypeScript 类型问题
- 🐛 修复 UI 组件缺失问题
- 🐛 修复后端权限检查

**优化**：
- ⚡ 优化构建速度
- ⚡ 优化 Token 刷新逻辑
- ⚡ 优化数据库查询

**文档**：
- 📖 SSO 配置指南
- 📖 技术架构文档
- 📖 部署指南

---

**Happy Coding! 🚀**

---

*OpenCLAW Manager - 让 AI 管理更简单*
