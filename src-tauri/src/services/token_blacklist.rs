// Token 黑名单服务
use std::collections::HashMap;
use std::time::{Duration, Instant};
use sha2::{Sha256, Digest};
use std::sync::{Arc, RwLock};

/// 黑名单原因
#[derive(Debug, Clone, PartialEq)]
pub enum BlacklistReason {
    UserLogout,
    UserDeleted,
    SecurityBreach,
    ManualRevocation,
    Expired,
}

/// Token 黑名单记录
#[derive(Debug, Clone)]
pub struct TokenBlacklistRecord {
    pub token_hash: String,
    pub reason: BlacklistReason,
    pub created_at: Instant,
    pub expires_at: Option<Instant>,
    pub revoked_by: Option<String>,
}

/// Token 黑名单服务
pub struct TokenBlacklistService {
    records: Arc<RwLock<HashMap<String, TokenBlacklistRecord>>>,
    cleanup_interval: Duration,
}

impl TokenBlacklistService {
    /// 创建新的 Token 黑名单服务
    pub fn new() -> Self {
        Self {
            records: Arc::new(RwLock::new(HashMap::new())),
            cleanup_interval: Duration::from_secs(3600), // 每小时清理一次
        }
    }

    /// 设置清理间隔
    pub fn with_cleanup_interval(mut self, interval: Duration) -> Self {
        self.cleanup_interval = interval;
        self
    }

    /// 计算 SHA256 哈希
    fn compute_hash(token: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// 将黑名单添加到列表
    pub fn blacklist_token(&self, token: &str, reason: BlacklistReason, revoked_by: Option<String>) {
        let token_hash = Self::compute_hash(token);
        let expires_at = match reason {
            BlacklistReason::Expired => None,
            _ => Some(Instant::now() + Duration::from_secs(86400)), // 默认 24 小时
        };

        let record = TokenBlacklistRecord {
            token_hash: token_hash.clone(),
            reason,
            created_at: Instant::now(),
            expires_at,
            revoked_by,
        };

        let mut records = self.records.write().unwrap();
        records.insert(token_hash, record);
    }

    /// 检查 Token 是否在黑名单中
    pub fn is_blacklisted(&self, token: &str) -> bool {
        let token_hash = Self::compute_hash(token);
        
        let records = self.records.read().unwrap();
        if let Some(record) = records.get(&token_hash) {
            // 检查是否过期
            if let Some(expires_at) = record.expires_at {
                if Instant::now() > expires_at {
                    return false; // 已过期
                }
            }
            return true;
        }
        false
    }

    /// 从黑名单中移除 Token
    pub fn remove_from_blacklist(&self, token: &str) -> bool {
        let token_hash = Self::compute_hash(token);
        let mut records = self.records.write().unwrap();
        records.remove(&token_hash).is_some()
    }

    /// 获取黑名单统计
    pub fn get_stats(&self) -> (usize, usize) {
        let records = self.records.read().unwrap();
        let total = records.len();
        
        let expired = records.values()
            .filter(|r| {
                if let Some(expires_at) = r.expires_at {
                    Instant::now() > expires_at
                } else {
                    false
                }
            })
            .count();

        (total, total - expired)
    }

    /// 清理过期的 Token
    pub fn cleanup_expired(&self) -> usize {
        let now = Instant::now();
        let mut records = self.records.write().unwrap();
        
        let expired_keys: Vec<String> = records.iter()
            .filter(|(_, r)| {
                if let Some(expires_at) = r.expires_at {
                    now > expires_at
                } else {
                    false
                }
            })
            .map(|(k, _)| k.clone())
            .collect();

        let count = expired_keys.len();
        for key in expired_keys {
            records.remove(&key);
        }

        count
    }

    /// 获取所有黑名单记录
    pub fn get_all_records(&self) -> Vec<(String, String, String, String)> {
        let now = Instant::now();
        let records = self.records.read().unwrap();
        records.iter()
            .map(|(hash, record)| {
                let reason_str = match record.reason {
                    BlacklistReason::UserLogout => "user_logout".to_string(),
                    BlacklistReason::UserDeleted => "user_deleted".to_string(),
                    BlacklistReason::SecurityBreach => "security_breach".to_string(),
                    BlacklistReason::ManualRevocation => "manual_revocation".to_string(),
                    BlacklistReason::Expired => "expired".to_string(),
                };
                let expires_at_str = record.expires_at
                    .map(|t| {
                        if now > t {
                            "expired".to_string()
                        } else {
                            format!("{}s", t.duration_since(now).as_secs())
                        }
                    })
                    .unwrap_or("never".to_string());
                
                (hash.clone(), reason_str, expires_at_str, record.revoked_by.clone().unwrap_or_default())
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_hash() {
        let hash1 = TokenBlacklistService::compute_hash("test-token");
        let hash2 = TokenBlacklistService::compute_hash("test-token");
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // SHA256 为 64 个十六进制字符
    }

    #[test]
    fn test_blacklist_and_check() {
        let service = TokenBlacklistService::new();
        let token = "test-secret-token";
        
        // 添加到黑名单
        service.blacklist_token(token, BlacklistReason::UserLogout, None);
        
        // 检查是否在黑名单中
        assert!(service.is_blacklisted(token));
        
        // 移除
        assert!(service.remove_from_blacklist(token));
        
        // 不应在黑名单中
        assert!(!service.is_blacklisted(token));
    }

    #[test]
    fn test_cleanup_expired() {
        let service = TokenBlacklistService::new();
        let token = "expired-token";
        
        // 添加到黑名单，设置过期时间
        let token_hash = TokenBlacklistService::compute_hash(token);
        
        {
            let mut records = service.records.write().unwrap();
            records.insert(token_hash.clone(), TokenBlacklistRecord {
                token_hash: token_hash.clone(),
                reason: BlacklistReason::Expired,
                created_at: Instant::now(),
                expires_at: Some(Instant::now() - Duration::from_secs(1)), // 已过期
                revoked_by: None,
            });
        }

        // 清理
        let cleaned = service.cleanup_expired();
        assert_eq!(cleaned, 1);
    }
}
