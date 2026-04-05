// 端口扫描相关类型定义

/**
 * 扫描模式
 */
export type ScanMode = 'quick' | 'full' | 'custom';

/**
 * 扫描结果
 */
export interface PortScanResult {
  id: string;
  ip: string;
  port: number;
  service: string;
  status: 'open' | 'closed' | 'filtered';
  product?: string;
  version?: string;
  scanned_at: string;
}

/**
 * 扫描请求
 */
export interface PortScanRequest {
  ip: string;
  mode: ScanMode;
  ports?: number[];
}

/**
 * 扫描统计
 */
export interface PortScanStats {
  total_ports: number;
  open_ports: number;
  closed_ports: number;
  filtered_ports: number;
  scan_duration_ms: number;
}
