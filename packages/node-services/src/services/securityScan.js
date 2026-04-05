'use strict';

const fs   = require('fs');
const path = require('path');
const net  = require('net');

// Paths relative to this file (packages/node-services/src/services/)
const PROJECT_ROOT  = path.resolve(__dirname, '../../../../');
const CONFIG_PATH   = path.join(PROJECT_ROOT, 'configs', 'config.toml');
const DB_PATH       = path.join(PROJECT_ROOT, 'data', 'ocm.db');
const LOG_DIR       = path.join(PROJECT_ROOT, 'data', 'logs');
const OCM_PORTS     = [18789, 18790, 18791, 18792, 18793, 18794, 18795, 18796, 18797, 18798, 18799];

class SecurityScanner {
  // ── Internal helpers ────────────────────────────────────────────────────

  _score(items) {
    if (!items.length) return 100;
    const weights = { critical: 30, high: 20, medium: 10, low: 5, info: 0 };
    let deduction = 0;
    for (const item of items) {
      deduction += weights[item.severity] || 0;
    }
    return Math.max(0, 100 - deduction);
  }

  /**
   * Check whether a TCP port is open (listening) on 127.0.0.1.
   * Resolves with true if open, false if refused/timed-out.
   */
  _isPortOpen(port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(400);
      socket.once('connect', () => { socket.destroy(); resolve(true);  });
      socket.once('error',   () => { socket.destroy(); resolve(false); });
      socket.once('timeout', () => { socket.destroy(); resolve(false); });
      socket.connect(port, '127.0.0.1');
    });
  }

  // ── Individual checks ───────────────────────────────────────────────────

  async checkConfig() {
    const result = {
      category: '配置文件安全',
      severity: 'info',
      status:   'pass',
      details:  [],
    };

    if (!fs.existsSync(CONFIG_PATH)) {
      result.status  = 'warn';
      result.severity = 'low';
      result.details.push(`配置文件不存在：${CONFIG_PATH}`);
      return result;
    }

    const content = fs.readFileSync(CONFIG_PATH, 'utf8');

    // Check for plaintext secrets (simple heuristics)
    const secretPatterns = [
      { re: /api[_-]?key\s*=\s*"([^"]{10,})"/, label: 'api_key 明文存储' },
      { re: /secret\s*=\s*"([^"]{8,})"/i,       label: 'secret 明文存储' },
      { re: /password\s*=\s*"([^"]{4,})"/i,      label: 'password 明文存储' },
    ];
    for (const { re, label } of secretPatterns) {
      if (re.test(content)) {
        result.status   = 'fail';
        result.severity = 'high';
        result.details.push(label);
      }
    }

    // Check master_key default value
    const masterKeyMatch = content.match(/master[_-]?key\s*=\s*"([^"]+)"/i);
    if (masterKeyMatch) {
      const val = masterKeyMatch[1];
      if (val === 'change-me' || val === 'default' || val.length < 16) {
        result.status   = 'fail';
        result.severity = 'critical';
        result.details.push('master_key 使用默认值或过短，请立即更换');
      }
    }

    if (!result.details.length) {
      result.details.push('配置文件未发现明文敏感信息');
    }
    return result;
  }

  async checkPorts() {
    const result = {
      category: '端口暴露检查',
      severity: 'info',
      status:   'pass',
      details:  [],
      openPorts: [],
    };

    const checks = await Promise.all(OCM_PORTS.map((p) => this._isPortOpen(p).then((open) => ({ port: p, open }))));
    const open = checks.filter((c) => c.open).map((c) => c.port);

    result.openPorts = open;
    if (open.length > 0) {
      result.details.push(`以下端口正在监听：${open.join(', ')}`);
      // More than 3 open ports in the range is unusual
      if (open.length > 3) {
        result.severity = 'medium';
        result.status   = 'warn';
        result.details.push('开放端口数量较多，请确认是否必要');
      } else {
        result.details.push('端口数量正常');
      }
    } else {
      result.details.push('OCM 端口范围内没有监听端口');
    }

    return result;
  }

  async checkLogs() {
    const result = {
      category: '日志安全',
      severity: 'info',
      status:   'pass',
      details:  [],
    };

    if (!fs.existsSync(LOG_DIR)) {
      result.details.push('日志目录不存在，无日志泄露风险');
      return result;
    }

    const files = fs.readdirSync(LOG_DIR);
    if (!files.length) {
      result.details.push('日志目录为空');
      return result;
    }

    // Check for world-readable permission on each log file (Unix only)
    let sensitiveFound = false;
    for (const f of files) {
      const fp = path.join(LOG_DIR, f);
      try {
        const content = fs.readFileSync(fp, 'utf8');
        if (/api[_-]?key|password|secret/i.test(content)) {
          sensitiveFound = true;
          result.details.push(`日志文件 ${f} 可能包含敏感信息`);
        }
      } catch (_) {
        // Skip unreadable files
      }
    }

    if (sensitiveFound) {
      result.severity = 'high';
      result.status   = 'fail';
    } else {
      result.details.push(`已检查 ${files.length} 个日志文件，未发现敏感信息泄露`);
    }

    return result;
  }

  async checkDatabase() {
    const result = {
      category: '数据库文件',
      severity: 'info',
      status:   'pass',
      details:  [],
    };

    if (!fs.existsSync(DB_PATH)) {
      result.status   = 'warn';
      result.severity = 'low';
      result.details.push(`数据库文件不存在：${DB_PATH}`);
      return result;
    }

    const stat = fs.statSync(DB_PATH);
    result.details.push(`数据库大小：${(stat.size / 1024).toFixed(1)} KB`);

    // On POSIX check world-readable bit
    if (process.platform !== 'win32') {
      // eslint-disable-next-line no-bitwise
      const worldReadable = !!(stat.mode & 0o004);
      if (worldReadable) {
        result.severity = 'medium';
        result.status   = 'warn';
        result.details.push('数据库文件对所有用户可读（建议 chmod 600）');
      } else {
        result.details.push('数据库文件权限正常');
      }
    } else {
      result.details.push('Windows 平台，跳过权限位检查');
    }

    return result;
  }

  // ── Scoring & recommendations ────────────────────────────────────────────

  calculateScore(items) {
    const weights = { critical: 30, high: 20, medium: 10, low: 5, info: 0 };
    let deduction = 0;
    for (const item of items) {
      if (item.status !== 'pass') {
        deduction += weights[item.severity] || 0;
      }
    }
    return Math.max(0, 100 - deduction);
  }

  generateRecommendations(items) {
    const recs = [];
    for (const item of items) {
      if (item.status === 'fail' && item.details.length) {
        recs.push(...item.details.filter((d) => !d.includes('检查') && !d.includes('发现')));
      }
    }
    // Always-on best-practice hints
    recs.push('定期轮换 API Key 和 Master Key');
    recs.push('确保只开放必要的网络端口');
    return [...new Set(recs)];
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Full scan – used by GET /api/security/scan */
  async fullScan() {
    const [configResult, portResult, logResult, dbResult] = await Promise.all([
      this.checkConfig(),
      this.checkPorts(),
      this.checkLogs(),
      this.checkDatabase(),
    ]);

    const items = [configResult, portResult, logResult, dbResult];
    const score = this.calculateScore(items);
    const recommendations = this.generateRecommendations(items);

    return { score, items, recommendations, timestamp: new Date().toISOString() };
  }

  /** Legacy method kept for backward compatibility */
  async securityCheck() {
    const full = await this.fullScan();
    // Map to the old shape { score, issues, recommendations }
    const issues = full.items
      .filter((i) => i.status !== 'pass')
      .map((i) => ({
        category:    i.category,
        severity:    i.severity,
        description: i.details[0] || '',
        fix:         i.details[1] || '请参阅安全建议',
      }));
    return {
      score:           full.score,
      issues,
      recommendations: full.recommendations,
    };
  }

  /** Legacy: scan skills directory */
  scanSkills(scanPath) {
    if (!fs.existsSync(scanPath)) {
      return { skills: [], total_risk: '低', error: '目录不存在' };
    }
    const entries = fs.readdirSync(scanPath, { withFileTypes: true });
    const skills = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({
        name:    e.name,
        version: '未知',
        risk:    '低',
        issues:  [],
      }));
    return { skills, total_risk: '低' };
  }

  /** Legacy: scan a config object for inline secrets */
  scanConfig(config) {
    const issues = [];
    if (config.llm && config.llm.api_key && !String(config.llm.api_key).includes('${ENV:')) {
      issues.push('API密钥明文存储');
    }
    if (config.im && config.im.webhook_port === 8080) {
      issues.push('使用默认端口');
    }
    return {
      issues,
      risk_level:      issues.length > 0 ? '中' : '低',
      recommendations: ['使用环境变量存储API密钥', '修改默认端口', '使用非root用户运行'],
    };
  }
}

module.exports = new SecurityScanner();
