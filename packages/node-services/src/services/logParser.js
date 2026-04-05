'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const { Worker } = require('worker_threads');

// Rust tracing-subscriber log line format:
//   2026-03-26T10:30:00.123456Z  INFO ocm_manager: message here
const LOG_LINE_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(TRACE|DEBUG|INFO|WARN|ERROR)\s+([^:]+):\s+(.*)$/;

class LogParser {
  constructor() {
    // Resolve log directory relative to this file:
    // __dirname = packages/node-services/src/services
    // data/logs  = ../../../../data/logs  (project root / data / logs)
    this.logDir = path.resolve(__dirname, '../../../../data/logs');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Scan the log directory and return absolute paths of all .log* files,
   * sorted newest-first (by mtime).
   */
  async getLogFiles() {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }
    const entries = fs.readdirSync(this.logDir);
    const files = entries
      .filter((f) => f.includes('.log'))
      .map((f) => {
        const fullPath = path.join(this.logDir, f);
        const stat = fs.statSync(fullPath);
        return { path: fullPath, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .map((f) => f.path);
    return files;
  }

  /**
   * Parse a single log line into a structured object.
   * Returns null for lines that don't match the expected format.
   */
  _parseLine(line) {
    const m = LOG_LINE_RE.exec(line.trim());
    if (!m) return null;
    return {
      timestamp: m[1],
      level:     m[2],
      target:    m[3].trim(),
      message:   m[4].trim(),
    };
  }

  /**
   * Read a single file and yield parsed entries, applying optional filters.
   */
  async _readFile(filePath, { level, startTime, endTime } = {}) {
    if (!fs.existsSync(filePath)) return [];

    const entries = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const entry = this._parseLine(line);
      if (!entry) continue;

      if (level && entry.level !== level.toUpperCase()) continue;
      if (startTime && entry.timestamp < startTime) continue;
      if (endTime   && entry.timestamp > endTime)   continue;

      entries.push(entry);
    }

    return entries;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Parse log files with optional filtering.
   * @param {Object} options
   * @param {string} [options.level]      - Filter by log level (INFO, WARN, …)
   * @param {string} [options.startTime]  - ISO timestamp lower bound
   * @param {string} [options.endTime]    - ISO timestamp upper bound
   * @param {number} [options.limit=100]  - Max entries to return
   */
  async parseLogs(options = {}) {
    const { level, startTime, endTime, limit = 100 } = options;

    const files = await this.getLogFiles();
    const allEntries = [];

    for (const filePath of files) {
      if (allEntries.length >= limit) break;
      const entries = await this._readFile(filePath, { level, startTime, endTime });
      allEntries.push(...entries);
    }

    // Return the most-recent entries up to limit
    return allEntries.slice(-limit);
  }

  /**
   * Return the latest N log entries across all log files.
   * @param {number} count - Number of entries to return
   */
  async getLatestLogs(count = 50) {
    const files = await this.getLogFiles();
    const allEntries = [];

    for (const filePath of files) {
      const entries = await this._readFile(filePath);
      allEntries.push(...entries);
    }

    // Sort by timestamp descending and take the most recent
    allEntries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return allEntries.slice(0, count);
  }

  // ── Worker-thread integration (optional async bulk parse) ────────────────

  /**
   * Start log parsing in a worker thread.
   * The worker sends a message back to the main thread via parentPort.
   */
  startWorker() {
    if (this.worker) return; // already running
    const workerPath = path.join(__dirname, '../workers/logWorker.js');
    this.worker = new Worker(workerPath, {
      workerData: { logDir: this.logDir },
    });
    this.worker.on('message', (msg) => {
      if (msg && msg.entries) {
        this._lastWorkerResult = msg;
      }
    });
    this.worker.on('error', (err) => {
      console.error('[LogParser] worker error:', err.message);
    });
    this.worker.on('exit', () => {
      this.worker = null;
    });
  }

  stopWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

module.exports = new LogParser();
