# Skill 管理功能详细需求文档

**版本：** v1.0  
**最后更新：** 2026-04-05  
**作者：** 架构师（AI）  
**适用范围：** OCM Manager Skill 管理模块

---

## 📋 目录

1. [产品定位与核心价值](#1-产品定位与核心价值)
2. [功能概述](#2-功能概述)
3. [用户角色与权限](#3-用户角色与权限)
4. [完整业务流程](#4-完整业务流程)
5. [技术实现方案](#5-技术实现方案)
6. [数据库设计](#6-数据库设计)
7. [API 接口设计](#7-api-接口设计)
8. [前端界面设计](#8-前端界面设计)
9. [安全审核机制](#9-安全审核机制)
10. [调用统计与激励](#10-调用统计与激励)
11. [验收标准](#11-验收标准)

---

## 1. 产品定位与核心价值

### 1.1 问题背景

**企业现状：**
- 员工各自开发好用的 Skill，但散落在个人电脑中
- 其他员工想用但看不到、找不到
- 分享 Skill 担心被抄袭、被窃取
- 缺乏激励机制，员工没有动力分享和维护

### 1.2 核心价值

> **公司能用，但看不到；员工能交，但不泄密**

**具体体现：**
- ✅ Skill 内容不离开作者电脑（远程调用，不暴露源码）
- ✅ 其他人只能用，不能看（除非有审核权限）
- ✅ 调用统计可追溯（作为奖金/升职依据）
- ✅ 安全审核有保障（自动 + 人工）

---

## 2. 功能概述

### 2.1 功能模块

| 模块 | 功能 | 说明 |
|------|------|------|
| **Skill 提交** | 提交元数据 | 名称、简介、实例 ID、版本等（不提交内容） |
| **安全审核** | 自动审核 | 检查恶意代码、后门、数据窃取 |
| **安全审核** | 人工审核 | 管理员确认功能正常 |
| **Skill 商店** | 浏览/搜索 | 按分类/部门/标签筛选 |
| **Skill 商店** | 可见性控制 | 全公司/部门/指定人员 |
| **远程调用** | 路由执行 | 路由到作者 Gateway 执行 |
| **权限控制** | 白名单 | 用户/部门/角色控制 |
| **调用统计** | 使用记录 | 次数、Token、成本、评分 |
| **激励系统** | 排行榜 | 奖金建议、升职依据 |

### 2.2 核心流程

```
1. 员工创建 Skill (本地)
   ↓
2. 提交元数据 (不提交内容)
   ↓
3. 安全审核 (自动 + 人工)
   ↓
4. 上架商店 (可见性控制)
   ↓
5. 远程调用 (路由到作者)
   ↓
6. 激励统计 (次数/Token)
```

---

## 3. 用户角色与权限

### 3.1 角色权限表

| 角色 | Skill 提交 | Skill 审核 | 可见范围 | 调用权限 | 统计查看 |
|------|-----------|-----------|---------|---------|---------|
| **普通员工** | ✅ 自己的 | ❌ | 自己的 + 公开的 | 有权限的 | 仅自己的 |
| **部门负责人** | ✅ 自己的 | ✅ 本部门 | 本部门 + 公开的 | 本部门全部 | 本部门汇总 |
| **管理员** | ✅ | ✅ 全部 | 全部 | 全部 | 全局 |
| **运维** | ❌ | ❌ | 公开的 | 公开的 | ❌ |
| **财务/审计** | ✅ 自己的 | ❌ | 公开的 | 有权限的 | 全局只读 |

---

## 4. 完整业务流程

### 4.1 Skill 提交流程

```typescript
interface SkillSubmission {
  name: string;           // "sales-bot"
  description: string;    // "自动回复销售咨询"
  version: string;        // "v1.0"
  instance_id: string;    // "employee-a-pc"
  category: string;       // "销售工具"
  tags: string[];         // ["销售", "自动回复", "客服"]
  visibility: {
    scope: 'public' | 'department' | 'private';
    allowed_departments?: string[];
    allowed_users?: string[];
    allowed_roles?: string[];
  };
}
```

### 4.2 安全审核流程

```rust
struct AutoReviewChecklist {
    // 1. 恶意代码检测
    check_malicious_code: bool,      // rm -rf, curl | bash
    check_data_exfiltration: bool,   // 窃取公司机密
    check_backdoor: bool,            // 后门程序
    
    // 2. 外部调用检测
    check_external_apis: bool,       // 外部 API 调用
    check_network_access: bool,      // 网络访问
    
    // 3. 权限检测
    check_elevated_ops: bool,        // 提权操作
}
```

### 4.3 远程调用流程

```rust
async fn invokeSkill(skillId: &str, params: Any, userId: &str) {
  // 1. 获取 Skill 元数据
  let skill = db.getSkill(skillId).await;
  
  // 2. 检查权限
  if !canInvokeSkill(userId, skill) {
    throw new Error('无权限使用此 Skill');
  }
  
  // 3. 远程调用（Skill 在作者实例中）
  let result = gateway.invoke(
    skill.instance_id,
    'skills_run',
    { skill_name: skill.name, params }
  ).await;
  
  // 4. 记录调用统计
  db.recordSkillUsage({
    skill_id: skillId,
    user_id: userId,
    tokens_used: result.tokens,
    duration_ms: result.duration,
  }).await;
  
  return result;
}
```

---

## 5. 技术实现方案

### 5.1 整体架构

```
┌─────────────────────────────────────────┐
│            OCM Manager                   │
│  ┌─────────────────────────────────┐    │
│  │  前端 (React)                    │    │
│  │  - Skill 提交/商店/审核/统计     │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  后端 (Rust + Actix-web)        │    │
│  │  - Skill 控制器/审核/统计服务    │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  数据库 (SQLite)                 │    │
│  │  - skills/skill_usage 等表       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
              ↓ WebSocket
┌─────────────────────────────────────────┐
│         员工 Gateway 实例                 │
│  ┌─────────────────────────────────┐    │
│  │  skills/sales-bot/SKILL.md      │    │
│  │  (明文，远程调用时执行)          │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 5.2 核心组件

| 组件 | 文件位置 | 职责 |
|------|---------|------|
| Skill 控制器 | `src/server/src/controllers/skill_controller.rs` | Skill CRUD、提交、审核 |
| 审核服务 | `src/server/src/services/skill_review.rs` | 自动审核、沙箱测试 |
| 统计服务 | `src/server/src/services/skill_stats.rs` | 调用统计、激励计算 |
| 权限中间件 | `src/server/src/middleware/auth.rs` | 权限检查 |

---

## 6. 数据库设计

### 6.1 skills 表

```sql
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT 'v1.0',
    instance_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    owner_department_id TEXT,
    category TEXT,
    tags TEXT,  -- JSON 数组
    
    -- 可见性控制
    visibility_scope TEXT NOT NULL DEFAULT 'public',
    visibility_config TEXT,  -- JSON
    
    -- 状态
    status TEXT NOT NULL DEFAULT 'pending_review',
    is_published BOOLEAN DEFAULT FALSE,
    is_disabled BOOLEAN DEFAULT FALSE,
    
    -- 审核信息
    auto_review_passed BOOLEAN,
    auto_review_risk_level TEXT,
    approved_by TEXT,
    approved_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (instance_id) REFERENCES instances(id)
);
```

### 6.2 skill_usage 表

```sql
CREATE TABLE skill_usage (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (skill_id) REFERENCES skills(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 7. API 接口设计

### 7.1 Skill 提交与管理

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `POST /api/v1/skills/submit` | POST | 登录用户 | 提交 Skill 元数据 |
| `GET /api/v1/skills/my` | GET | 登录用户 | 获取自己的 Skill |
| `PUT /api/v1/skills/{id}` | PUT | 所有者 | 更新 Skill |
| `DELETE /api/v1/skills/{id}` | DELETE | 所有者/管理员 | 删除 Skill |

### 7.2 Skill 审核

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `GET /api/v1/skills/review/pending` | GET | 管理员/部门负责人 | 待审核列表 |
| `POST /api/v1/skills/{id}/review/approve` | POST | 管理员/部门负责人 | 批准 |
| `POST /api/v1/skills/{id}/review/reject` | POST | 管理员/部门负责人 | 拒绝 |

### 7.3 Skill 商店

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `GET /api/v1/skills/store` | GET | 登录用户 | 浏览商店 |
| `POST /api/v1/skills/store/{id}/invoke` | POST | 有权限用户 | 调用 Skill |
| `POST /api/v1/skills/store/{id}/rate` | POST | 已调用用户 | 评分 |

### 7.4 调用统计

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `GET /api/v1/skills/{id}/stats` | GET | 所有者/管理员/财务 | 获取统计 |
| `GET /api/v1/skills/stats/leaderboard` | GET | 登录用户 | 排行榜 |
| `GET /api/v1/skills/stats/incentive` | GET | 管理员/财务 | 激励建议 |

---

## 8. 前端界面设计

### 8.1 Skill 提交界面
- 基本信息：名称、版本、分类、简介、实例 ID
- 可见性控制：全公司/部门/指定人员
- 标签管理

### 8.2 Skill 商店界面
- 搜索/筛选：分类、部门、标签
- Skill 卡片：名称、作者、评分、调用次数
- 权限控制：有权限→使用，无权限→申请

### 8.3 审核界面
- 自动审核报告：风险等级、问题列表
- Skill 预览（只读，管理员可见）
- 审核操作：通过/拒绝/要求修改

### 8.4 统计仪表板
- 总览：总调用次数、Token 消耗、活跃 Skill
- 排行榜：热门 Skill Top 10
- 激励建议：奖金建议

---

## 9. 安全审核机制

### 9.1 自动审核规则

**恶意代码检测：**
- `rm -rf` → Critical
- `curl | bash` → High
- `eval()` → High
- 窃取密码模式 → High

### 9.2 沙箱测试

高风险 Skill 在沙箱中运行，检测：
- 是否有异常网络请求
- 是否尝试访问敏感文件
- 是否有资源滥用行为

---

## 10. 调用统计与激励

### 10.1 统计指标

```rust
struct SkillUsageStats {
    total_calls: u64,           // 总调用次数
    total_tokens: u64,          // 总 Token 消耗
    unique_users: u64,          // 独立用户数
    avg_rating: f32,            // 平均评分
    success_rate: f32,          // 成功率
    incentive_score: f32,       // 激励分数
}
```

### 10.2 激励分数计算

```rust
fn calculate_incentive_score(stats: &SkillUsageStats) -> f32 {
    let usage_score = (stats.total_calls as f32).ln() * 10.0 * 0.4;
    let quality_score = stats.avg_rating * 20.0 * 0.3;
    let efficiency_score = (1.0 - (stats.avg_duration_ms / 1000.0).min(1.0)) * 30.0 * 0.3;
    usage_score + quality_score + efficiency_score
}
```

---

## 11. 验收标准

### P0（必须实现）

- [ ] Skill 提交流程（元数据 + 可见性控制）
- [ ] 自动安全审核
- [ ] 人工审核流程
- [ ] Skill 商店浏览
- [ ] 远程调用 Skill
- [ ] 调用统计记录

### P1（重要）

- [ ] 权限控制系统
- [ ] 排行榜
- [ ] 激励建议
- [ ] 搜索/筛选功能

### P2（可选）

- [ ] 沙箱测试
- [ ] 统计数据导出
- [ ] Skill 版本管理

---

**文档结束**
