# 开发任务清单 - OpenCLAW Manager

> 创建时间：2026-03-09
> 状态：进行中

---

## ✅ 已完成

### 文档更新
- [x] 修改项目交接文档（明确核心定位和三种部署方式）
- [x] 添加人格管理功能设计
- [x] 添加定时任务功能设计
- [x] 更新产品路线图

### 一键部署重构
- [x] 创建 DeployModeSelector 组件（部署方式选择）
- [x] 创建 EnvCheckMatrix 组件（环境检测矩阵）
- [x] 创建 DeployWizard 组件（部署向导整合）
- [x] 更新 SetupPage 使用新组件
- [x] 创建 TypeScript 类型定义

---

## 🔄 进行中

### 一键部署后端支持
- [ ] 更新 setup.rs 添加 DeployMode 枚举
- [ ] 实现 check_environment(mode) 命令（支持三种部署方式）
- [ ] 实现 fix_environment(mode, item) 命令
- [ ] 实现 deploy_openclaw(mode, config) 命令
- [ ] 添加环境安装包内置或下载逻辑

---

## 📋 待开发

### Phase 1: 人格管理模块
- [ ] 创建 personality.rs 后端命令
  - [ ] list_personalities()
  - [ ] load_personality(id)
  - [ ] save_personality(personality)
  - [ ] apply_template(template_id)
  - [ ] export_personality(id)
  - [ ] import_personality(zip_path)
- [ ] 创建前端组件
  - [ ] PersonalityPage.tsx
  - [ ] PersonalityEditor.tsx
  - [ ] TemplateGallery.tsx
  - [ ] PersonalityCard.tsx
- [ ] 预设人格模板
  - [ ] 办公助手
  - [ ] 代码助手
  - [ ] 创意写作
  - [ ] 数据分析

### Phase 2: 定时任务模块
- [ ] 创建 cron.rs 后端命令
  - [ ] list_cron_jobs()
  - [ ] create_cron_job(job)
  - [ ] update_cron_job(id, job)
  - [ ] delete_cron_job(id)
  - [ ] toggle_cron_job(id, enabled)
  - [ ] get_cron_history(id)
- [ ] 创建前端组件
  - [ ] CronPage.tsx
  - [ ] CronForm.tsx
  - [ ] CronExpression.tsx（Cron 表达式生成器）
  - [ ] CronHistory.tsx
  - [ ] CronCard.tsx
- [ ] 预设任务模板
  - [ ] 每日成本报告（每天 9:00）
  - [ ] 每周安全扫描（每周一 8:00）
  - [ ] 每小时心跳（每小时）
  - [ ] 内存清理（每天凌晨 3:00）

### Phase 3: 完善和优化
- [ ] 测试三种部署方式的完整流程
- [ ] 环境安装包内置（减少用户跳转官网）
- [ ] 一键部署按钮置灰逻辑（环境未就绪时不可点击）
- [ ] 部署进度动画优化
- [ ] 错误提示优化
- [ ] 链接点击功能验证（openUrl）
- [ ] 错误传递一致性修复

---

## 📝 技术要点

### 部署方式检测矩阵

| 检测项 | Windows 原生 | WSL2 | Docker |
|-------|-------------|------|--------|
| Node.js 20+ | ✅ | ✅ | ❌ |
| Git | ✅ | ✅ | ❌ |
| pnpm | ✅ | ✅ | ❌ |
| WSL2 功能 | ❌ | ✅ | ❌ |
| Ubuntu 发行版 | ❌ | ✅ | ❌ |
| Docker Desktop | ❌ | ❌ | ✅ |
| Docker Compose | ❌ | ❌ | ✅ |

### 后端命令签名（Rust）

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub enum DeployMode {
    Windows,
    Wsl2,
    Docker
}

#[tauri::command]
fn check_environment(mode: DeployMode) -> Result<EnvCheckReport, String>

#[tauri::command]
fn fix_environment(mode: DeployMode, item_name: String) -> Result<bool, String>

#[tauri::command]
fn deploy_openclaw(mode: DeployMode, config: DeployConfig) -> Result<DeployResult, String>
```

### 前端状态机

```typescript
enum DeployStep {
  SELECT_MODE = 'select_mode',
  CHECKING = 'checking',
  FIXING = 'fixing',
  READY = 'ready',
  DEPLOYING = 'deploying',
  COMPLETED = 'completed'
}
```

---

## 🎯 开发优先级

**P0 - 核心重构（必须完成）**
1. 后端 setup.rs 更新（支持三种部署方式）
2. 环境检测逻辑实现
3. 一键修复功能实现
4. 完整流程测试

**P1 - 新增功能（重要）**
1. 人格管理模块基础功能
2. 定时任务模块基础功能
3. 人格模板库
4. 定时任务预设模板

**P2 - 体验优化（锦上添花）**
1. 人格导入/导出
2. 定时任务执行日志
3. 部署进度动画优化
4. 环境安装包内置

---

## 📌 注意事项

1. **用户绝大多数是小白** - 需要在部署方式选择时清晰说明优缺点
2. **环境安装包尽量内置** - 减少用户跳转官网的步骤
3. **一键部署按钮置灰** - 环境未就绪前不可点击
4. **明确进度反馈** - 所有操作需要有明确的进度和错误提示
5. **测试规范** - 必须用 `pnpm tauri dev` 测试，浏览器打开只有前端

---

*最后更新：2026-03-09 15:45*
