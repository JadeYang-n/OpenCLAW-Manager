# OpenCLAW Manager v1.6.0 Alpha - Release Notes

**发布日期**: 2026-03-11  
**版本**: v1.6.0 Alpha  
**GitHub Release**: `v1.6.0-alpha`

---

## 🎉 首次公开发布

这是 OpenCLAW Manager 的首个 Alpha 版本，标志着核心功能已基本完成，可以开始内部测试和小范围试用。

---

## ✨ 新功能

### 1. 部门隔离系统 (Phase 2)

**完整实现多部门数据隔离**:
- 部门管理 CRUD（创建/读取/更新/删除）
- 用户可归属多个部门
- 实例可绑定多个部门
- 数据按部门和角色自动过滤

**权限矩阵**:
| 角色 | 实例数据 | Token 数据 | 审计日志 |
|------|---------|-----------|---------|
| admin/operator | 全部 | 全部 | 全部 |
| dept_admin | 本部门 | 本部门 | 本部门 + 个人 |
| employee | 本部门 | 本部门 | 仅个人 |
| auditor | 本部门 | 本部门 | 全部（只读） |

### 2. Token 分析增强

**部门维度成本分析**:
- 按时间查看 Token 用量
- 按部门查看成本占比
- 可视化进度条展示

### 3. Skills 管理系统（重构版）

**本地 Skills 检测**:
- 自动扫描 `%LOCALAPPDATA%\OpenCLAW\skills\` 目录
- 读取 `skill.json` 元数据
- 一键安装到实例

**Skills 获取渠道**:
1. **Skill-creator**（推荐）- Anthropic 官方 Skill 创建工具
2. **Anthropic Skills 仓库** - https://github.com/anthropics/skills
3. **ClawHub** - https://clawhub.com（API 待开放）

**内置示例 Skills**:
- `skill-creator` - Skill 创建工具（占位符）
- `skill-demo-test` - 测试用示例 Skill

### 4. 配置管理

**完整配置模板系统**:
- 配置模板 CRUD
- 实例关联配置
- 创建实例时可选择配置

### 5. 中英文语言切换

**国际化支持**:
- 设置页面切换语言
- 翻译字典（~136 项）
- 本地持久化（localStorage）

**已翻译**:
- ✅ Skills 管理（完全本地化）
- ✅ 导航菜单
- ✅ 通用词汇
- ✅ 部署向导

---

## 🐛 Bug 修复

1. **空白屏问题** - 修复 Layout 组件导入错误
2. **环境检测流程** - 重构为部署向导子流程
3. **创建实例错误** - 修复参数传递方式
4. **Skills 安装逻辑** - 从数据库标记改为本地检测

---

## 📦 安装说明

### 系统要求
- **OS**: Windows 10/11 (推荐) / WSL2 / Docker
- **Node.js**: >= 18.x
- **pnpm**: >= 8.x
- **Rust**: >= 1.75

### Windows 安装
```bash
# 下载 Release 包
# 运行 OpenCLAW.Manager.Setup.exe
# 按照安装向导完成安装
```

### 开发环境启动
```bash
# 克隆仓库
git clone https://github.com/openclaw/ocm-manager.git
cd ocm-manager

# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri dev

# 访问 http://localhost:5174
```

### 测试账号
```
用户名：admin
密码：admin123
```

---

## 📊 技术栈

- **后端**: Rust + Tauri 2.0
- **前端**: React 18 + TypeScript + Tailwind CSS
- **数据库**: SQLite (bundled)
- **认证**: JWT + AES-GCM 加密

---

## 🗄️ 数据库结构

**14 张核心表**:
- users, roles, tokens, audit_logs
- departments, user_departments, instance_departments
- instances, configs, instance_configs
- skills_installed, instance_skills

---

## 🔧 已知问题

### 前端警告（不影响功能）
以下 TypeScript 警告是未使用变量，不影响编译和运行：
- DeploymentPage.tsx
- EnvironmentCheck.tsx
- MyUsagePage.tsx
- InstancesPage.tsx

**计划**: 在 v1.6.1 中清理这些警告。

---

## 📝 更新日志

### v1.6.0 Alpha (2026-03-11)
- ✨ 新增部门隔离系统
- ✨ 新增 Token 分析部门维度
- ✨ 新增 Skills 本地检测
- ✨ 新增配置管理
- ✨ 新增中英文语言切换
- 🐛 修复空白屏问题
- 🐛 修复 Skills 安装逻辑
- 🐛 修复环境检测流程

### v1.5.0 (2026-03-05)
- ✨ Phase 2 部门隔离功能

### v1.0.0 (2026-02)
- ✨ Phase 1 基础权限系统

---

## 🚀 路线图

### Phase 3 (v2.0) - SSO 单点登录
- SAML 2.0 集成
- OAuth 2.0 集成
- LDAP/Active Directory 集成

### Phase 4 (v2.5) - RBAC 增强
- 细粒度权限控制
- 权限模板
- 权限审计

### 其他计划
- 更多页面翻译
- Anthropic Skills 实际下载
- 实例详情页
- 主题功能（浅色/深色）

---

## 📄 许可证

**License**: MIT  
**Copyright**: © 2026 OpenCLAW Team

---

## 🙏 致谢

感谢所有贡献者和测试用户！

---

**发布维护**: 羊一  
**联系方式**: internal@openclaw.local
