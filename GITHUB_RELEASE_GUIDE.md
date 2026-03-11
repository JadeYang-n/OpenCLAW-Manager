# GitHub 发布指南

**创建时间**: 2026-03-11  
**版本**: v1.6.0 Alpha

---

## 📋 发布步骤

### 第一步：登录 GitHub

1. 访问 https://github.com
2. 登录你的 GitHub 账号
3. 如果没有账号，先注册一个

---

### 第二步：创建新仓库

1. 点击右上角 **+** → **New repository**
2. 填写以下信息：
   - **Repository name**: `ocm-manager`
   - **Description**: `OpenCLAW Manager - OpenCLAW 实例管理与技能编排平台`
   - **Visibility**: Public（公开）或 Private（私有）根据你的需求
   - **Initialize this repository with**: ❌ **不要勾选**（我们已经有了本地仓库）
3. 点击 **Create repository**

---

### 第三步：关联远程仓库

创建好仓库后，GitHub 会显示仓库地址。在命令行执行：

```bash
cd "C:\Users\vip\.openclaw-autoclaw\workspace\OpenCLAW Manager\ocm-manager"

# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/ocm-manager.git

# 验证
git remote -v
```

---

### 第四步：推送代码到 GitHub

```bash
# 推送到 GitHub
git push -u origin master

# 等待上传完成（根据网络情况，可能需要几分钟）
```

---

### 第五步：创建 Release

1. 在 GitHub 仓库页面，点击右侧 **Releases** → **Create a new release**
2. 填写以下信息：
   - **Tag version**: `v1.6.0-alpha`
   - **Release title**: `OpenCLAW Manager v1.6.0 Alpha`
   - **Description**: 复制下面的内容

---

## 📝 Release 描述模板

```markdown
# OpenCLAW Manager v1.6.0 Alpha

🎉 **首个 Alpha 版本发布！**

这是 OpenCLAW Manager 的首个公开版本，标志着核心功能已基本完成。

## ✨ 主要功能

### Phase 2 - 部门隔离系统
- 部门管理 CRUD
- 用户 - 部门多对多关联
- 实例 - 部门多对多关联
- 数据按部门和角色自动过滤

### Phase 2.5 - Token 分析增强
- 部门维度成本统计
- 成本占比可视化
- 按时间/按部门查看

### Phase 2.5 - Skills 管理
- 本地 Skills 自动检测
- Anthropic 官方 Skills 仓库集成
- ClawHub 指引
- 一键安装到实例

### Phase 2.5 - 配置管理
- 配置模板 CRUD
- 实例关联配置

### Phase 2.5 - 中英文语言切换
- 设置页面切换语言
- 翻译字典（~136 项）
- 本地持久化

## 🛠️ 技术栈

- **后端**: Rust + Tauri 2.0
- **前端**: React 18 + TypeScript + Tailwind CSS
- **数据库**: SQLite

## 📦 安装说明

### 开发环境启动

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/ocm-manager.git
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

## 📊 系统要求

- **OS**: Windows 10/11 (推荐) / WSL2 / Docker
- **Node.js**: >= 18.x
- **pnpm**: >= 8.x
- **Rust**: >= 1.75

## 🚀 路线图

### Phase 3 (v2.0) - SSO 单点登录
- SAML 2.0 集成
- OAuth 2.0 集成
- LDAP/Active Directory 集成

### Phase 4 (v2.5) - RBAC 增强
- 细粒度权限控制
- 权限模板

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🙏 致谢

感谢所有贡献者和测试用户！

---

**Full Changelog**: https://github.com/YOUR_USERNAME/ocm-manager/commits/v1.6.0-alpha
```

3. 点击 **Publish release**

---

### 第六步：验证发布

1. 访问仓库页面，确认代码已上传
2. 访问 Releases 页面，确认 Release 已创建
3. 检查文件是否完整

---

## 🔗 快速链接

创建完成后，你的仓库地址将是：
```
https://github.com/YOUR_USERNAME/ocm-manager
```

Release 地址：
```
https://github.com/YOUR_USERNAME/ocm-manager/releases/tag/v1.6.0-alpha
```

---

## ❓ 常见问题

### Q: 推送时提示权限错误？
A: 确保你已登录 GitHub，并且是仓库的所有者或有写入权限。

### Q: 推送速度很慢？
A: 第一次推送包含所有文件，可能需要几分钟。可以使用以下命令查看进度：
```bash
git push --progress
```

### Q: 想修改 Release 描述？
A: 在 Releases 页面点击编辑按钮即可修改。

### Q: 想添加二进制文件？
A: 在 Release 页面可以上传编译好的 .exe 安装包（后续版本）。

---

## 📞 需要帮助？

如果在发布过程中遇到问题，可以：
1. 查看 GitHub Docs: https://docs.github.com
2. 查看本仓库的 ISSUE

---

**祝发布顺利！** 🎉
