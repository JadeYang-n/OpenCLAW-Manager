'use strict';

const { parentPort, workerData } = require('worker_threads');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const { logDir } = workerData || {};

// Same regex as logParser.js
const LOG_LINE_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(TRACE|DEBUG|INFO|WARN|ERROR)\s+([^:]+):\s+(.*)$/;

/**
 * Parse all .log* files in the given directory and return structured entries.
 * @param {string} dir - Absolute path to log directory
 * @returns {Promise<Array>}
 */
async function parseLogs(dir) {
  if (!dir || !fs.existsSync(dir)) {
    return [];
  }

  const entries   = fs.readdirSync(dir);
  const logFiles  = entries
    .filter((f) => f.includes('.log'))
    .map((f) => path.join(dir, f));

  const allEntries = [];

  for (const filePath of logFiles) {
    if (!fs.existsSync(filePath)) continue;

    const rl = readline.createInterface({
      input:     fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const m = LOG_LINE_RE.exec(line.trim());
      if (!m) continue;
      allEntries.push({
        timestamp: m[1],
        level:     m[2],
        target:    m[3].trim(),
        message:   m[4].trim(),
        file:      path.basename(filePath),
      });
    }
  }

  return allEntries;
}

// ── Entry point ───────────────────────────────────────────────────────────────
(async () => {
  try {
    const entries = await parseLogs(logDir);

    // Sort newest first
    entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    parentPort.postMessage({
      status:         'completed',
      processedLines: entries.length,
      entries:        entries.slice(0, 500), // cap at 500 to avoid large IPC messages
    });
  } catch (err) {
    parentPort.postMessage({
      status: 'error',
      error:  err.message,
    });
    process.exit(1);
  }
})();
