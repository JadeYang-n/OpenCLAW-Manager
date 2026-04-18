# 安全说明 (Security Policy)

**⚠️ 重要警告**：OpenCLAW Manager 目前处于 **Alpha 阶段**，安全功能尚未完善。在生产环境使用前，请仔细阅读本安全说明，尤其是 Windows 部署相关风险。

---

## 📋 目录

1. [Windows 部署风险](#-windows-部署风险)
2. [OpenCLaw 本地部署风险](#openclaw-本地部署风险)
3. [安全最佳实践](#安全最佳实践)
4. [漏洞报告流程](#漏洞报告流程)
5. [安全更新政策](#安全更新政策)

---

## ⚠️ Windows 部署风险

### 风险 1：文件系统权限过于宽松

**问题描述：**
Windows 默认文件系统权限（NTFS）比 Linux 更宽松，可能导致：
- 其他用户访问你的配置文件和 API Key
- 恶意软件读取敏感数据
- 权限提升攻击

**缓解措施：**
```powershell
# 1. 将数据目录移动到专用文件夹
# 默认：C:\Users\你的用户名\AppData\Roaming\openclaw-manager

# 2. 设置 NTFS 权限（管理员权限运行）
icacls "C:\Users\你的用户名\AppData\Roaming\openclaw-manager" /inheritance:r
icacls "C:\Users\你的用户名\AppData\Roaming\openclaw-manager" /grant "%USERNAME%:(OI)(CI)F"

# 3. 验证权限
icacls "C:\Users\你的用户名\AppData\Roaming\openclaw-manager"
```

**建议：** 如果可能，**优先选择 Linux 或 macOS 部署**。

---

### 风险 2：Windows Defender/杀毒软件误报

**问题描述：**
- Tauri 打包的应用可能被误报为恶意软件
- 自动化脚本可能触发杀毒软件警报

**缓解措施：**
```powershell
# 1. 添加排除项（Windows Defender）
Add-MpPreference -ExclusionPath "C:\Program Files\OpenCLAW Manager"
Add-MpPreference -ExclusionPath "$env:APPDATA\openclaw-manager"

# 2. 验证应用签名
# 下载后检查数字签名（未来版本会提供）
```

**建议：** 从官方 GitHub Releases 下载，不要运行来路不明的二进制文件。

---

### 风险 3：Windows 自动更新冲突

**问题描述：**
- Windows 自动更新可能重启系统，中断 OpenCLaw 服务
- 更新后可能破坏网络配置或防火墙规则

**缓解措施：**
```powershell
# 1. 设置活跃时间（防止工作时重启）
# 设置 → 更新和安全 → 更改活跃时间

# 2. 配置防火墙规则（允许 OpenCLaw 端口）
netsh advfirewall firewall add rule name="OpenCLAW Manager" dir=in action=allow protocol=TCP localport=3000
```

---

### 风险 4：凭据管理器不安全

**问题描述：**
- Windows 凭据管理器可能被恶意软件访问
- 存储的 API Key 可能被提取

**缓解措施：**
- ✅ 启用 BitLocker 全盘加密
- ✅ 使用 Windows Hello 或强密码
- ✅ 定期更换 API Key
- ✅ 不要以明文存储 API Key（本项目已加密）

---

## 🔒 OpenCLaw 本地部署风险

### 风险 1：AI Agent 直接访问本地文件

**问题描述：**
OpenCLaw Skills 可能请求访问你的文件系统，存在以下风险：
- 读取敏感文件（密码、密钥、个人数据）
- 修改或删除重要文件
- 上传文件到外部服务器

**缓解措施：**
```toml
# 在 OpenCLaw 配置中限制文件访问范围 (~/.openclaw/config.toml)

[security]
# 只允许访问指定目录
allowed_directories = [
    "~/Documents/openclaw-workspace",
    "~/Projects"
]

# 禁止访问的目录
denied_directories = [
    "~/.ssh",
    "~/.aws",
    "~/.config/gcloud",
    "~/Desktop",
    "~/Downloads"
]

# 禁止执行危险命令
denied_commands = [
    "rm -rf /",
    "del /F /S /Q",
    "format",
    "shutdown"
]
```

**建议：**
1. **永远不要**让 OpenCLaw 直接访问主目录（`~` 或 `C:\Users\你的用户名`）
2. 创建专用工作目录，只授权该目录
3. 定期审计 Skills 权限

---

### 风险 2：API Key 泄露

**问题描述：**
- OpenCLaw 需要 LLM API Key（如 Anthropic、OpenAI）
- 如果泄露，攻击者可以：
  - 盗用你的 API 额度（可能产生高额费用）
  - 访问你的对话历史
  - 以你的名义调用 API

**缓解措施：**
1. ✅ **使用本项目加密存储**（AES-256-GCM）
2. ✅ **设置 API 预算上限**（在 LLM 提供商控制台）
3. ✅ **定期轮换 API Key**
4. ✅ **启用 API 使用告警**
5. ❌ **不要**将 API Key 提交到 Git
6. ❌ **不要**在日志中打印 API Key

```bash
# 检查 API Key 是否意外提交
git log --all --full-history --source -S "sk-" --pretty=format:"%h %s"
```

---

### 风险 3：Skills 恶意代码

**问题描述：**
从第三方安装的 Skills 可能包含恶意代码：
- 窃取 API Key 或其他凭据
- 执行未授权的网络请求
- 植入后门

**缓解措施：**
1. ✅ **仅从可信来源安装 Skills**：
   - [ClawHub 官网](https://clawhub.com)（官方审核）
   - [Anthropic 官方 Skills 仓库](https://github.com/anthropics/skills)
2. ✅ **审查 Skills 代码**（如果是开源的）
3. ✅ **限制 Skills 权限**（网络访问、文件访问）
4. ❌ **不要**安装来路不明的 Skills

```bash
# 查看已安装的 Skills
# （未来版本会提供审计命令）
openclaw skills list --verbose
```

---

### 风险 4：网络暴露风险

**问题描述：**
如果将 OpenCLaw Gateway 暴露到公网，可能面临：
- 未授权访问
- DDoS 攻击
- API 滥用

**缓解措施：**
```toml
# OpenClaw 配置 (~/.openclaw/config.toml)

[gateway]
# 只绑定本地地址（默认）
host = "127.0.0.1"
port = 18789

# 如果需要远程访问，使用隧道（更安全）
# 不要直接暴露端口到公网！
```

**如果需要远程访问：**
1. ✅ 使用 **Cloudflare Tunnel**（免费）
2. ✅ 使用 **Tailscale**（免费，点对点加密）
3. ✅ 使用 **Ngrok**（有免费额度）
4. ❌ **不要**直接端口映射到公网

---

## ✅ 安全最佳实践

### 部署前检查清单

- [ ] 已阅读本安全说明
- [ ] 了解 Windows 部署风险（如适用）
- [ ] 设置了强密码（12 位以上，包含大小写、数字、符号）
- [ ] 启用了双因素认证（2FA）
- [ ] 配置了防火墙规则
- [ ] 备份了重要数据
- [ ] 了解如何查看审计日志

### 日常运维检查清单

- [ ] 每周查看审计日志
- [ ] 每月轮换 API Key
- [ ] 每季度审查已安装 Skills
- [ ] 及时更新到最新版本
- [ ] 监控 Token 使用异常

### 事件响应

**如果怀疑安全泄露：**

1. **立即更改所有 API Key**（LLM 提供商控制台）
2. **重置管理员密码**
3. **查看审计日志**（识别异常操作）
4. **撤销可疑 Sessions**
5. **报告漏洞**（见下方流程）

---

## 🐛 漏洞报告流程

### 如何报告

发现安全漏洞？请通过以下方式报告：

**📧 Email:** 1762961769@qq.com

**邮件标题格式：**
```
[安全漏洞] 简短描述 - 严重程度（高/中/低）
```

**邮件内容应包含：**
1. 漏洞描述（详细但简洁）
2. 复现步骤
3. 影响范围
4. 建议修复方案（可选）
5. 你的联系方式（可选）

### 响应承诺

| 严重程度 | 响应时间 | 修复时间 |
|---------|---------|---------|
| **严重**（数据泄露、远程代码执行） | 24 小时内 | 7 天内 |
| **中等**（权限绕过、信息泄露） | 48 小时内 | 14 天内 |
| **低**（轻微信息泄露、配置问题） | 7 天内 | 30 天内 |

### 公开披露政策

- 我们会在修复后公开致谢（经你同意）
- 在修复前**请勿公开披露**漏洞细节
- 我们可能在安全公告中描述漏洞（不包含利用细节）

---

## 🔄 安全更新政策

### 更新频率

- **严重漏洞**：立即发布热修复版本
- **普通漏洞**：随常规版本发布（预计每周 1-2 次）
- **安全增强**：随大版本发布

### 如何获取安全更新

```bash
# 桌面应用
# 检查更新：设置 → 关于 → 检查更新
# 或下载最新版本

# Docker
docker pull ghcr.io/openclaw-manager/openclaw-manager:alpha

# 源码
git pull origin main
pnpm install
pnpm tauri build
```

### 版本命名

- **Alpha**（当前阶段）：`v1.0.0-alpha` - 核心功能已实现，尚未完整测试
- ~~Beta~~：`v2.0.0-beta` - 安全功能基本完善（计划中）
- **RC**：`v1.0.0-rc.x` - 安全功能完善，接近生产就绪
- **Stable**：`v1.x.x` - 生产就绪

---

## 📚 参考资源

### OpenCLaw 安全
- [OpenCLaw 官方安全说明](https://github.com/openclaw/openclaw/blob/main/SECURITY.md)
- [OpenCLaw 配置最佳实践](https://docs.openclaw.ai/security)

### Windows 安全
- [Windows 安全基线](https://docs.microsoft.com/en-us/windows/security/)
- [BitLocker 加密指南](https://docs.microsoft.com/en-us/windows/security/information-protection/bitlocker/)

### 通用安全
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

## ⚠️ 免责声明

**Beta 版本警告：**

本项目处于 Beta 阶段，核心功能已实现并测试通过，但仍有部分功能待完善。按"原样"提供，不提供任何明示或暗示的保证。使用本项目产生的任何风险由用户自行承担。

在法律允许的最大范围内，作者和贡献者不对以下情况承担责任：
- 数据泄露或丢失
- API Key 泄露导致的费用
- 系统损坏或服务中断
- 任何直接或间接损失

**生产环境使用前，请等待 Beta 或稳定版本。**

---

**最后更新：** 2026-04-18  
**版本：** v1.0.0-Alpha
