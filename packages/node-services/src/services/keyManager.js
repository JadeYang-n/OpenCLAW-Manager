'use strict';

let keytar;
try {
  keytar = require('keytar');
} catch (_e) {
  // keytar native module may not be built; fall back to in-memory store
  keytar = null;
}

const SERVICE_NAME = 'OpenCLAW-Manager';

// In-memory fallback when keytar is unavailable (dev/test only)
const memStore = new Map();

class KeyManager {
  /**
   * Save (or update) a key in the system keychain.
   * @param {string} id - Account / key identifier
   * @param {string} value - The secret value to store
   */
  async saveKey(id, value) {
    if (keytar) {
      await keytar.setPassword(SERVICE_NAME, id, value);
    } else {
      memStore.set(id, value);
    }
    return { success: true, id };
  }

  /**
   * Retrieve a key from the system keychain.
   * @param {string} id - Account / key identifier
   * @returns {string|null} The stored secret, or null if not found
   */
  async getKey(id) {
    if (keytar) {
      return await keytar.getPassword(SERVICE_NAME, id);
    }
    return memStore.get(id) || null;
  }

  /**
   * Delete a key from the system keychain.
   * @param {string} id - Account / key identifier
   */
  async deleteKey(id) {
    if (keytar) {
      const deleted = await keytar.deletePassword(SERVICE_NAME, id);
      return { success: deleted };
    }
    const had = memStore.has(id);
    memStore.delete(id);
    return { success: had };
  }

  /**
   * List all stored key identifiers (accounts) for this service.
   * @returns {Array<{id: string, hasValue: boolean}>}
   */
  async listKeys() {
    if (keytar) {
      const credentials = await keytar.findCredentials(SERVICE_NAME);
      return credentials.map((c) => ({
        id: c.account,
        hasValue: true,
      }));
    }
    return Array.from(memStore.keys()).map((k) => ({ id: k, hasValue: true }));
  }
}

module.exports = new KeyManager();
