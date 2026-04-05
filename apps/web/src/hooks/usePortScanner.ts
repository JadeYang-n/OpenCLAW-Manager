// 端口扫描服务 API Hooks
import { create } from 'zustand';

/**
 * 状态类型
 */
interface PortScannerState {
  isScanning: boolean;
  scanResults: Array<{
    ip: string;
    port: number;
    service: string;
    status: 'open' | 'closed' | 'filtered';
    scanned_at: string;
  }>;
  scanStats: {
    total_ports: number;
    open_ports: number;
    closed_ports: number;
    filtered_ports: number;
    scan_duration_ms: number;
  };
}

/**
 * 操作类型
 */
interface PortScannerActions {
  startScan: (ip: string, mode: 'quick' | 'full' | 'custom', ports?: number[]) => Promise<void>;
  stopScan: () => void;
  clearResults: () => void;
}

/**
 * Store
 */
export const usePortScannerStore = create<PortScannerState & PortScannerActions>((set) => ({
  isScanning: false,
  scanResults: [],
  scanStats: {
    total_ports: 0,
    open_ports: 0,
    closed_ports: 0,
    filtered_ports: 0,
    scan_duration_ms: 0,
  },

  startScan: async (ip, mode, ports) => {
    set({ isScanning: true });
    
    try {
      const response = await fetch('/api/port-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ip,
          mode,
          ports,
        }),
      });

      if (!response.ok) {
        throw new Error('Port scan failed');
      }

      const data = await response.json();
      
      set({
        scanResults: data.results || [],
        scanStats: data.stats || {
          total_ports: 0,
          open_ports: 0,
          closed_ports: 0,
          filtered_ports: 0,
          scan_duration_ms: 0,
        },
      });
    } finally {
      set({ isScanning: false });
    }
  },

  stopScan: () => {
    // TODO: Implement scan cancellation
  },

  clearResults: () => {
    set({
      scanResults: [],
      scanStats: {
        total_ports: 0,
        open_ports: 0,
        closed_ports: 0,
        filtered_ports: 0,
        scan_duration_ms: 0,
      },
    });
  },
}));
