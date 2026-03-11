class KeyManager {
  constructor() {
    this.serviceName = 'OpenClaw Manager';
    this.useMock = true;
    this.mockKeys = [
      { id: 'OpenAI API Key', value: '***' },
      { id: '飞书 App Secret', value: '***' }
    ];
  }

  async saveKey(id, value) {
    try {
      console.log(`Key saved: ${id}`);
    } catch (error) {
      console.error('Error saving key:', error);
    }
  }

  async getKey(id) {
    try {
      return '***';
    } catch (error) {
      console.error('Error getting key:', error);
      return null;
    }
  }

  async deleteKey(id) {
    try {
      console.log(`Key deleted: ${id}`);
    } catch (error) {
      console.error('Error deleting key:', error);
    }
  }

  async getKeys() {
    try {
      return this.mockKeys;
    } catch (error) {
      console.error('Error getting keys:', error);
      return this.mockKeys;
    }
  }
}

export default new KeyManager();