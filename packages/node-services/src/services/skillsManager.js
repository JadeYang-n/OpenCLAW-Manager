'use strict';

const path = require('path');
let Database;

try {
  Database = require('better-sqlite3');
} catch (_e) {
  Database = null;
}

// DB path: packages/node-services/src/services/ → ../../../../data/ocm.db
const DB_PATH = path.resolve(__dirname, '../../../../data/ocm.db');

class SkillsManager {
  constructor() {
    this._db = null;
  }

  /** Lazily open the database (read-only). Returns null when unavailable. */
  _getDb() {
    if (this._db) return this._db;
    if (!Database) return null;

    const fs = require('fs');
    if (!fs.existsSync(DB_PATH)) return null;

    try {
      this._db = new Database(DB_PATH, { readonly: true });
      return this._db;
    } catch (err) {
      console.error('[SkillsManager] Cannot open database:', err.message);
      return null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * List all installed skills ordered by install date (newest first).
   * Falls back to an empty array when the DB is unavailable.
   */
  listSkills() {
    const db = this._getDb();
    if (!db) return this._fallbackSkills();

    try {
      // Check if the table exists first
      const tableExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='skills_installed'")
        .get();

      if (!tableExists) return [];

      return db
        .prepare('SELECT * FROM skills_installed ORDER BY installed_at DESC')
        .all();
    } catch (err) {
      console.error('[SkillsManager] listSkills error:', err.message);
      return [];
    }
  }

  /**
   * Return aggregate stats: total, enabled, disabled.
   */
  getSkillStats() {
    const db = this._getDb();
    if (!db) {
      const skills = this._fallbackSkills();
      return { total: skills.length, enabled: skills.length, disabled: 0 };
    }

    try {
      const tableExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='skills_installed'")
        .get();

      if (!tableExists) return { total: 0, enabled: 0, disabled: 0 };

      const total   = db.prepare('SELECT COUNT(*) AS count FROM skills_installed').get();
      const enabled = db.prepare('SELECT COUNT(*) AS count FROM skills_installed WHERE enabled = 1').get();
      const t = total.count;
      const e = enabled.count;
      return { total: t, enabled: e, disabled: t - e };
    } catch (err) {
      console.error('[SkillsManager] getSkillStats error:', err.message);
      return { total: 0, enabled: 0, disabled: 0 };
    }
  }

  /**
   * Get a single skill by its id column.
   */
  getSkillById(id) {
    const db = this._getDb();
    if (!db) {
      return this._fallbackSkills().find((s) => s.id === id) || null;
    }

    try {
      return db.prepare('SELECT * FROM skills_installed WHERE id = ?').get(id) || null;
    } catch (err) {
      console.error('[SkillsManager] getSkillById error:', err.message);
      return null;
    }
  }

  // ── Legacy compatibility methods (kept for old callers) ─────────────────

  getSkillInfo(skillId) {
    return this.getSkillById(skillId);
  }

  installSkill(skillId) {
    console.log(`[SkillsManager] installSkill called for: ${skillId} (handled by Rust layer)`);
    return { success: false, message: 'Install must be triggered via Tauri command' };
  }

  uninstallSkill(skillId) {
    console.log(`[SkillsManager] uninstallSkill called for: ${skillId} (handled by Rust layer)`);
    return { success: false, message: 'Uninstall must be triggered via Tauri command' };
  }

  updateSkill(skillId) {
    console.log(`[SkillsManager] updateSkill called for: ${skillId} (handled by Rust layer)`);
    return { success: false, message: 'Update must be triggered via Tauri command' };
  }

  // ── Fallback data (no DB) ────────────────────────────────────────────────

  _fallbackSkills() {
    return [
      {
        id:          'file-ops',
        name:        '文件操作',
        version:     '1.0.0',
        description: '提供文件读写、搜索等功能',
        author:      'OpenCLAW Team',
        enabled:     1,
        risk_level:  '低',
      },
      {
        id:          'browser-automation',
        name:        '浏览器自动化',
        version:     '1.1.0',
        description: '控制浏览器进行网页操作',
        author:      'OpenCLAW Team',
        enabled:     1,
        risk_level:  '中',
      },
    ];
  }
}

module.exports = new SkillsManager();
