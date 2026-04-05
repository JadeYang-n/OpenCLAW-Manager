// Token 黑名单 API Hooks
import { create } from 'zustand';
import { toast } from 'react-hot-toast';

/**
 * 状态类型
 */
interface TokenBlacklistState {
  isProcessing: boolean;
  blacklistedTokens: Array<{
    token_hash: string;
    reason: 'user_logout' | 'user_deleted' | 'security_breach' | 'manual_revocation' | 'expired';
    created_at: string;
    expires_at?: string;
    revoked_by?: string;
  }>;
  blacklistStats: {
    total_blacklisted: number;
    expired_count: number;
    active_count: number;
    cleanup_last_run?: string;
  };
}

/**
 * 操作类型
 */
interface TokenBlacklistActions {
  addTokenToBlacklist: (token_hash: string, reason: string, expires_at?: string) => Promise<void>;
  removeTokenFromBlacklist: (token_hash: string) => Promise<void>;
  cleanupExpired: () => Promise<void>;
  refreshList: () => Promise<void>;
}

/**
 * Store
 */
export const useTokenBlacklistStore = create<TokenBlacklistState & TokenBlacklistActions>((set, get) => ({
  isProcessing: false,
  blacklistedTokens: [],
  blacklistStats: {
    total_blacklisted: 0,
    expired_count: 0,
    active_count: 0,
  },

  addTokenToBlacklist: async (token_hash, reason, expires_at) => {
    set({ isProcessing: true });

    try {
      const response = await fetch('/api/tokens/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token_hash,
          reason,
          expires_at,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add token to blacklist');
      }

      await get().refreshList();
    } catch (error) {
      console.error('Add token to blacklist error:', error);
      toast.error('添加 Token 到黑名单失败：' + error);
    } finally {
      set({ isProcessing: false });
    }
  },

  removeTokenFromBlacklist: async (token_hash) => {
    set({ isProcessing: true });

    try {
      const response = await fetch(`/api/tokens/blacklist/${token_hash}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove token from blacklist');
      }

      await get().refreshList();
    } catch (error) {
      console.error('Remove token from blacklist error:', error);
      toast.error('从黑名单移除 Token 失败：' + error);
    } finally {
      set({ isProcessing: false });
    }
  },

  cleanupExpired: async () => {
    set({ isProcessing: true });

    try {
      const response = await fetch('/api/tokens/blacklist/cleanup', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup expired tokens');
      }

      await get().refreshList();
    } catch (error) {
      console.error('Cleanup expired tokens error:', error);
      toast.error('清理过期 Token 失败：' + error);
    } finally {
      set({ isProcessing: false });
    }
  },

  refreshList: async () => {
    try {
      const response = await fetch('/api/tokens/blacklist');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch blacklist');
      }

      const data = await response.json();

      set({
        blacklistedTokens: data.tokens || [],
        blacklistStats: data.stats || {
          total_blacklisted: 0,
          expired_count: 0,
          active_count: 0,
        },
      });
    } catch (error) {
      console.error('Refresh blacklist error:', error);
      toast.error('刷新黑名单失败：' + error);
    }
  },
}));