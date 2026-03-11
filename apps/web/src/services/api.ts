// API service for backend communication

const API_BASE_URL = 'http://localhost:3456/api';

// Generic fetch function with error handling
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Environment check API
export const envAPI = {
  checkEnvironment: () => {
    return fetchAPI('/env/check');
  },
  fixEnvironment: (item: string) => {
    return fetchAPI('/env/fix', {
      method: 'POST',
      body: JSON.stringify({ item }),
    });
  },
};

// Token monitoring API
export const tokenAPI = {
  getStats: (params?: { start?: string; end?: string; instanceId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchAPI(`/token/stats${query ? `?${query}` : ''}`);
  },
  getHistory: (params?: { date?: string; instanceId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchAPI(`/token/history${query ? `?${query}` : ''}`);
  },
  parseLogs: () => {
    return fetchAPI('/token/parse', {
      method: 'POST',
    });
  },
};

// Skills API
export const skillsAPI = {
  scanSkills: (path: string) => {
    return fetchAPI('/skills/scan', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },
  listSkills: () => {
    return fetchAPI('/skills/list');
  },
  installSkill: (skillId: string) => {
    return fetchAPI('/skills/install', {
      method: 'POST',
      body: JSON.stringify({ skillId }),
    });
  },
  uninstallSkill: (skillId: string) => {
    return fetchAPI('/skills/uninstall', {
      method: 'POST',
      body: JSON.stringify({ skillId }),
    });
  },
};

// Keys API
export const keysAPI = {
  saveKey: (id: string, value: string) => {
    return fetchAPI('/keys', {
      method: 'POST',
      body: JSON.stringify({ id, value }),
    });
  },
  getKeys: () => {
    return fetchAPI('/keys');
  },
  deleteKey: (id: string) => {
    return fetchAPI(`/keys/${id}`, {
      method: 'DELETE',
    });
  },
};

// Prices API
export const pricesAPI = {
  getPrices: () => {
    return fetchAPI('/prices');
  },
  updatePrices: (prices: Record<string, { input: number; output: number }>) => {
    return fetchAPI('/prices', {
      method: 'PUT',
      body: JSON.stringify(prices),
    });
  },
};

// Errors API
export const errorsAPI = {
  getError: (code: string) => {
    return fetchAPI(`/errors/${code}`);
  },
  reportError: (error: any) => {
    return fetchAPI('/errors/report', {
      method: 'POST',
      body: JSON.stringify(error),
    });
  },
};

// Deployment API
export const deployAPI = {
  checkEnvironment: (mode: 'windows' | 'wsl2' | 'docker') => {
    return fetchAPI('/deploy/check', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },
  fixEnvironment: (mode: 'windows' | 'wsl2' | 'docker', item: string) => {
    return fetchAPI('/deploy/fix', {
      method: 'POST',
      body: JSON.stringify({ mode, item }),
    });
  },
  deploy: (mode: 'windows' | 'wsl2' | 'docker', config: { install_path?: string }) => {
    return fetchAPI('/deploy', {
      method: 'POST',
      body: JSON.stringify({ mode, config }),
    });
  },
};

// Health check
export const healthAPI = {
  checkHealth: () => {
    return fetch(`${API_BASE_URL.replace('/api', '')}/health`);
  },
};
