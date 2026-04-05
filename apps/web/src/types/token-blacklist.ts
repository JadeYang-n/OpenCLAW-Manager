// Token 黑名单相关类型定义

/**
 * 黑名单原因
 */
export type BlacklistReason = 
  | 'user_logout' 
  | 'user_deleted' 
  | 'security_breach' 
  | 'manual_revocation' 
  | 'expired';

/**
 * Token 黑名单记录
 */
export interface TokenBlacklist {
  id: string;
  token_hash: string; // SHA256 哈希
  reason: BlacklistReason;
  created_at: string;
  expires_at?: string;
  revoked_by?: string;
}

/**
 * 黑名单统计
 */
export interface BlacklistStats {
  total_blacklisted: number;
  expired_count: number;
  active_count: number;
 cleanup_last_run?: string;
}

/**
 * 添加黑名单请求
 */
export interface AddBlacklistRequest {
  token_hash: string;
  reason: BlacklistReason;
  expires_at?: string;
}
