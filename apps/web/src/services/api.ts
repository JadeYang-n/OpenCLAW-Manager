// API service for backend communication (B/S 架构 - v5.7)
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = 'http://localhost:8080/api/v1';

// Generic fetch function with error handling
export async function fetchAPI<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    // Get token from auth store
    const token = useAuthStore.getState().getToken()
    
    // 确保 endpoint 以 / 开头
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      throw new Error('Unauthorized. Please login again.')
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Skills API (版本控制)
export const skillsAPI = {
  getSkills: () => {
    return fetchAPI('/skills');
  },
  getSkill: (id: string) => {
    return fetchAPI(`/skills/${id}`);
  },
  createSkill: (data: { name: string; description: string; content: string; department_id: string; created_by?: string }) => {
    return fetchAPI('/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateSkill: (id: string, data: { content: string; version_note?: string; change_summary?: string }) => {
    return fetchAPI(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteSkill: (id: string) => {
    return fetchAPI(`/skills/${id}`, {
      method: 'DELETE',
    });
  },
  getSkillVersions: (id: string) => {
    return fetchAPI(`/skills/${id}/versions`);
  },
  rollbackSkill: (id: string, versionId: string) => {
    return fetchAPI(`/skills/${id}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ version_id: versionId }),
    });
  },
};

// Deployment API
export const deployAPI = {
  detectEnvironment: (mode: 'windows' | 'wsl2' | 'docker') => {
    return fetchAPI('/deploy/detect', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },
  startDeployment: (mode: 'windows' | 'wsl2' | 'docker', config: { install_path?: string }) => {
    return fetchAPI('/deploy/start', {
      method: 'POST',
      body: JSON.stringify({ mode, config }),
    });
  },
  getDeploymentStatus: (jobId: string) => {
    return fetchAPI(`/deploy/status/${jobId}`);
  },
  cancelDeployment: (jobId: string) => {
    return fetchAPI(`/deploy/cancel/${jobId}`, {
      method: 'POST',
    });
  },
  rollbackDeployment: (jobId: string) => {
    return fetchAPI(`/deploy/rollback/${jobId}`, {
      method: 'POST',
    });
  },
  uninstallDeployment: () => {
    return fetchAPI('/deploy/uninstall', {
      method: 'POST',
    });
  },
};

// Health check
export const healthAPI = {
  checkHealth: () => {
    return fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
  },
};

// Instances API
export const instancesAPI = {
  getInstances: () => {
    return fetchAPI('/instances');
  },
  getInstance: (id: string) => {
    return fetchAPI(`/instances/${id}`);
  },
  createInstance: (data: {
    name: string;
    host_ip: string;
    admin_port: number;
    admin_token: string;
    config_id?: string;
    skill_ids?: string[];
    department_id?: string;
    skip_test?: boolean;
  }) => {
    return fetchAPI('/instances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateInstance: (id: string, data: { enabled?: boolean }) => {
    return fetchAPI(`/instances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteInstance: (id: string) => {
    return fetchAPI(`/instances/${id}`, {
      method: 'DELETE',
    });
  },
  scanLocalInstances: () => {
    return fetchAPI('/instances/scan', {
      method: 'POST',
    });
  },
  addLocalInstance: (data: { port: number; admin_token?: string; token?: string }) => {
    return fetchAPI('/instances/local', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  addRemoteInstance: (data: { gateway_ip: string; gateway_port?: number }) => {
    return fetchAPI('/instances/remote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getPairingStatus: (pairing_id: string) => {
    return fetchAPI(`/instances/pairing/${pairing_id}`, {
      method: 'GET',
    });
  },
  discoverGateways: () => {
    return fetchAPI('/instances/discover', {
      method: 'GET',
    });
  },
};

// Config API
export const configAPI = {
  getConfigs: () => {
    return fetchAPI('/configs');
  },
  getConfig: (id: string) => {
    return fetchAPI(`/configs/${id}`);
  },
  createConfig: (data: { name: string; data: Record<string, unknown> }) => {
    return fetchAPI('/configs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateConfig: (id: string, data: { name?: string; data?: Record<string, unknown> }) => {
    return fetchAPI(`/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteConfig: (id: string) => {
    return fetchAPI(`/configs/${id}`, {
      method: 'DELETE',
    });
  },
};

// Audit Logs API
export const auditLogsAPI = {
  getAuditLogs: (params?: { limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchAPI(`/audit-logs${query ? `?${query}` : ''}`);
  },
  createAuditLog: (data: Record<string, unknown>) => {
    return fetchAPI('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  exportAuditLogs: (data: Record<string, unknown>) => {
    return fetchAPI('/audit-logs/export', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Token usage API
export const tokenUsageAPI = {
  getTokenUsage: () => {
    return fetchAPI('/gateway/token/usage');
  },
  getStats: () => fetchAPI('/gateway/token/usage/stats'),
  getTokenUsageStats: () => {
    return fetchAPI('/gateway/token/usage/stats');
  },
  createTokenUsage: (data: Record<string, unknown>) => {
    return fetchAPI('/gateway/token/usage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// User API
export const userAPI = {
  login: (data: { username: string; password: string }) => {
    return fetchAPI('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  logout: () => {
    return fetchAPI('/users/logout', {
      method: 'POST',
    });
  },
  getUsers: () => {
    return fetchAPI('/users');
  },
  createUser: (data: { username: string; password: string; email: string; full_name: string; role: string; department_id?: string }) => {
    return fetchAPI('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getUser: (id: string) => {
    return fetchAPI(`/users/${id}`);
  },
  updateUser: (id: string, data: { email: string; full_name: string; role: string }) => {
    return fetchAPI(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteUser: (id: string) => {
    return fetchAPI(`/users/${id}`, {
      method: 'DELETE',
    });
  },
  updateRole: (id: string, data: { role: string }) => {
    return fetchAPI(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Department API
export const departmentAPI = {
  getDepartments: () => {
    return fetchAPI('/departments');
  },
  createDepartment: (data: { name: string; description: string }) => {
    return fetchAPI('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getDepartment: (id: string) => {
    return fetchAPI(`/departments/${id}`);
  },
  updateDepartment: (id: string, data: { name: string; description: string }) => {
    return fetchAPI(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteDepartment: (id: string) => {
    return fetchAPI(`/departments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Security API
export const securityAPI = {
  checkPassword: (data: { password: string }) => {
    return fetchAPI('/security/check-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  checkPorts: (data: { ports: number[] }) => {
    return fetchAPI('/security/check-ports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  checkConfig: (data: Record<string, unknown>) => {
    return fetchAPI('/security/check-config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};