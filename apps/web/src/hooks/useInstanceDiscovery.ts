// 实例发现服务 API Hooks
import { create } from 'zustand';

/**
 * 状态类型
 */
interface InstanceDiscoveryState {
  isDiscovering: boolean;
  discoveredInstances: Array<{
    ip: string;
    host: string;
    port: number;
    platform: 'windows' | 'linux' | 'macos' | 'unknown';
    status: 'online' | 'offline' | 'unknown';
    version?: string;
    instance_name?: string;
    discovery_time: string;
  }>;
  discoveryStats: {
    total_scanned: number;
    online_instances: number;
    offline_hosts: number;
    discovery_duration_ms: number;
  };
}

/**
 * 操作类型
 */
interface InstanceDiscoveryActions {
  startDiscovery: (subnet?: string, timeout_ms?: number, concurrent?: number) => Promise<void>;
  stopDiscovery: () => void;
  clearResults: () => void;
}

/**
 * Store
 */
export const useInstanceDiscoveryStore = create<InstanceDiscoveryState & InstanceDiscoveryActions>((set, get) => ({
  isDiscovering: false,
  discoveredInstances: [],
  discoveryStats: {
    total_scanned: 0,
    online_instances: 0,
    offline_hosts: 0,
    discovery_duration_ms: 0,
  },

  startDiscovery: async (subnet, timeout_ms, concurrent) => {
    set({ isDiscovering: true });
    
    try {
      const response = await fetch('/api/instances/discover', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Instance discovery failed');
      }

      const data = await response.json();
      
      set({
        discoveredInstances: data.instances || [],
        discoveryStats: data.stats || {
          total_scanned: 0,
          online_instances: 0,
          offline_hosts: 0,
          discovery_duration_ms: 0,
        },
      });
    } catch (error) {
      console.error('Instance discovery error:', error);
      // TODO: Error handling
    } finally {
      set({ isDiscovering: false });
    }
  },

  stopDiscovery: () => {
    // TODO: Implement discovery cancellation
  },

  clearResults: () => {
    set({
      discoveredInstances: [],
      discoveryStats: {
        total_scanned: 0,
        online_instances: 0,
        offline_hosts: 0,
        discovery_duration_ms: 0,
      },
    });
  },
}));
