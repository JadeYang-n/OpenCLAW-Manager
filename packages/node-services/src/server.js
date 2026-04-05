'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const path = require('path');

// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.resolve(__dirname, '../../../data/logs/node-service.log'),
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 3,
    }),
  ],
});

// ─── Services ────────────────────────────────────────────────────────────────
const envCheckService = require('./services/envCheck');
const deployService   = require('./services/deploy');
const securityScan    = require('./services/securityScan');
const skillsManager   = require('./services/skillsManager');
const logParser       = require('./services/logParser');
const keyManager      = require('./services/keyManager');

// ─── App ─────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3456;

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Service status
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'running',
    node_service: 'active',
    timestamp: new Date().toISOString(),
  });
});

// Environment check
app.get('/api/env/check', async (req, res, next) => {
  try {
    const result = await envCheckService.checkEnvironment();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Deploy
app.post('/api/deploy', async (req, res, next) => {
  try {
    const options = req.body || {};
    const result = await deployService.deploy(options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Security scan – full scan
app.get('/api/security/scan', async (_req, res, next) => {
  try {
    const result = await securityScan.fullScan();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Legacy security check (kept for backward compat)
app.get('/api/security/check', async (_req, res, next) => {
  try {
    const result = await securityScan.securityCheck();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Skills list
app.get('/api/skills', async (_req, res, next) => {
  try {
    const skills = skillsManager.listSkills();
    const stats  = skillsManager.getSkillStats();
    res.json({ skills, stats });
  } catch (err) {
    next(err);
  }
});

// Logs
app.get('/api/logs', async (req, res, next) => {
  try {
    const { level, startTime, endTime, limit } = req.query;
    const entries = await logParser.parseLogs({
      level,
      startTime,
      endTime,
      limit: limit ? parseInt(limit, 10) : 100,
    });
    res.json({ entries });
  } catch (err) {
    next(err);
  }
});

// Latest logs (shortcut)
app.get('/api/logs/latest', async (req, res, next) => {
  try {
    const count = req.query.count ? parseInt(req.query.count, 10) : 50;
    const entries = await logParser.getLatestLogs(count);
    res.json({ entries });
  } catch (err) {
    next(err);
  }
});

// Key management
app.get('/api/keys', async (_req, res, next) => {
  try {
    const keys = await keyManager.listKeys();
    res.json({ keys });
  } catch (err) {
    next(err);
  }
});

app.post('/api/keys', async (req, res, next) => {
  try {
    const { id, value } = req.body;
    if (!id || !value) {
      return res.status(400).json({ error: 'id and value are required' });
    }
    const result = await keyManager.saveKey(id, value);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/keys/:id', async (req, res, next) => {
  try {
    const result = await keyManager.deleteKey(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Error Handler ───────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}\n${err.stack}`);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Node.js service running on port ${PORT}`);
});

module.exports = app;
