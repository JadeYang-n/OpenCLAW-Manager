// 实例发现相关类型定义

/**
 * 平台类型
 */
export type PlatformType = 'windows' | 'linux' | 'macos' | 'unknown';

/**
 * 实例状态
 */
export type InstanceStatus = 'online' | 'offline' | 'unknown';

/**
 * 发现的实例
 */
export interface DiscoveredInstance {
  id: string;
  ip: string;
  host: string;
  port: number;
  platform: PlatformType;
  status: InstanceStatus;
  version?: string;
  instance_name?: string;
  Discovery_time: string;
}

/**
 * 发现请求
 */
export interface DiscoveryRequest {
  subnet?: string; // 默认 192.168.1.0/24
  timeout_ms?: number; // 默认 1000ms
  concurrent?: number; // 默认 10
}

/**
 * 发现统计
 */
export interface DiscoveryStats {
  total_scanned: number;
  online_instances: number;
  offline_hosts: number;
  discovery_duration_ms: number;
}
