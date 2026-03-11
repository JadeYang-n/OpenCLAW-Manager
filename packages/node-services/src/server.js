import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import logParser from './services/logParser.js';
import keyManager from './services/keyManager.js';
import envCheck from './services/envCheck.js';
import securityScan from './services/securityScan.js';
import skillsManager from './services/skillsManager.js';

const app = express();
const PORT = process.env.PORT || 3456;

// 中间件
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Token 监控相关路由
app.get('/api/token/stats', (req, res) => {
  const { start, end, instanceId } = req.query;
  // 模拟返回统计数据
  res.json({
    today: 1245,
    todayCost: 1.56,
    monthly: 23456,
    monthlyCost: 29.32,
    budget: 100,
    remaining: 70.68
  });
});

app.get('/api/token/history', (req, res) => {
  const { date, instanceId } = req.query;
  // 模拟返回历史记录
  res.json([
    {
      id: '1',
      instanceId: instanceId || 'default',
      timestamp: '2026-03-05 10:30:00',
      model: 'gpt-4o',
      promptTokens: 120,
      completionTokens: 245,
      totalTokens: 365,
      cost: 0.006
    },
    {
      id: '2',
      instanceId: instanceId || 'default',
      timestamp: '2026-03-05 09:15:00',
      model: 'claude-sonnet-4',
      promptTokens: 85,
      completionTokens: 160,
      totalTokens: 245,
      cost: 0.003
    }
  ]);
});

app.post('/api/token/parse', (req, res) => {
  // 触发日志解析任务
  logParser.parseLogs();
  res.json({ status: 'ok', message: 'Parsing started' });
});

// 密钥管理相关路由
app.post('/api/keys', (req, res) => {
  const { id, value } = req.body;
  keyManager.saveKey(id, value);
  res.json({ status: 'ok' });
});

app.get('/api/keys', (req, res) => {
  const keys = keyManager.getKeys();
  res.json(keys);
});

app.delete('/api/keys/:id', (req, res) => {
  const { id } = req.params;
  keyManager.deleteKey(id);
  res.json({ status: 'ok' });
});

// 环境检测相关路由
app.get('/api/env/check', (req, res) => {
  const report = envCheck.checkEnvironment();
  res.json(report);
});

app.post('/api/env/fix', (req, res) => {
  const { item } = req.body;
  envCheck.fixEnvironment(item);
  res.json({ status: 'ok' });
});

// Skills 相关路由
app.post('/api/skills/scan', (req, res) => {
  const { path } = req.body;
  const report = securityScan.scanSkills(path);
  res.json(report);
});

app.get('/api/skills/list', (req, res) => {
  const skills = skillsManager.listSkills();
  res.json(skills);
});

app.post('/api/skills/install', (req, res) => {
  const { skillId } = req.body;
  skillsManager.installSkill(skillId);
  res.json({ status: 'ok' });
});

app.post('/api/skills/uninstall', (req, res) => {
  const { skillId } = req.body;
  skillsManager.uninstallSkill(skillId);
  res.json({ status: 'ok' });
});

// 价格表相关路由
app.get('/api/prices', (req, res) => {
  // 模拟返回价格表
  res.json({
    'claude-sonnet-4': { input: 3, output: 15 },
    'claude-opus-4': { input: 15, output: 75 },
    'gpt-4o': { input: 5, output: 15 },
    'deepseek-chat': { input: 1, output: 2 },
    'qwen-max': { input: 0.5, output: 1 }
  });
});

app.put('/api/prices', (req, res) => {
  const prices = req.body;
  // 模拟更新价格表
  res.json({ status: 'ok' });
});

// 错误知识库相关路由
app.get('/api/errors/:code', (req, res) => {
  const { code } = req.params;
  // 模拟返回错误解释
  res.json({
    errorCode: code,
    errorMessage: 'Authentication failed: invalid API key',
    explanationZh: 'API 密钥认证失败，可能是密钥错误或已过期',
    solutionZh: '1. 检查 API Key 是否正确\n2. 在控制台重新生成密钥\n3. 确认账户余额充足',
    updatedAt: '2026-03-01'
  });
});

app.post('/api/errors/report', (req, res) => {
  const error = req.body;
  // 模拟上报错误
  res.json({ status: 'ok' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Node.js service running on port ${PORT}`);
});

export default app;