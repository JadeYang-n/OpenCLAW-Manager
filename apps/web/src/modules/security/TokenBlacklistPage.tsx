// Token 黑名单管理页面
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTokenBlacklistStore } from '@/hooks/useTokenBlacklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, RefreshCw, Trash2, ShieldAlert, Clock, UserX, Lock
} from 'lucide-react';

export default function TokenBlacklistPage() {
  const [tokenHash, setTokenHash] = useState('');
  const [reason, setReason] = useState('user_logout');
  const [expiresIn, setExpiresIn] = useState('24');

  const { 
    isProcessing, 
    blacklistedTokens, 
    blacklistStats, 
    addTokenToBlacklist, 
    removeTokenFromBlacklist,
    cleanupExpired 
  } = useTokenBlacklistStore();

  const handleAddToken = async () => {
    if (!tokenHash) {
      toast('请输入 Token Hash');
      return;
    }
    await addTokenToBlacklist(
      tokenHash,
      reason,
      expiresIn ? new Date(Date.now() + parseInt(expiresIn) * 3600000).toISOString() : undefined
    );
    setTokenHash('');
    toast.success('✅ Token 已添加到黑名单');
  };

  const handleRemoveToken = async (hash: string) => {
    if (confirm('确定要移除该 Token 的黑名单吗？')) {
      await removeTokenFromBlacklist(hash);
    }
  };

  const reasonLabels: Record<string, string> = {
    user_logout: '用户登出',
    user_deleted: '用户删除',
    security_breach: '安全漏洞',
    manual_revocation: '手动吊销',
    expired: '已过期',
  };

  const getReasonBadgeVariant = (reason: string) => {
    switch (reason) {
      case 'security_breach':
        return 'destructive';
      case 'user_deleted':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Token 黑名单管理</h1>
          <p className="text-muted-foreground mt-2">管理被吊销的 JWT Token</p>
        </div>
        <Button variant="outline" onClick={cleanupExpired} disabled={isProcessing}>
          <Clock className="w-4 h-4 mr-2" />
          清理过期 Token
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-primary/5 rounded-lg p-6">
          <div className="text-3xl font-bold">{blacklistStats.total_blacklisted}</div>
          <div className="text-sm text-muted-foreground">黑名单总数</div>
        </div>
        <div className="bg-green-500/5 rounded-lg p-6">
          <div className="text-3xl font-bold">{blacklistStats.active_count}</div>
          <div className="text-sm text-muted-foreground">活跃 Token</div>
        </div>
        <div className="bg-orange-500/5 rounded-lg p-6">
          <div className="text-3xl font-bold">{blacklistStats.expired_count}</div>
          <div className="text-sm text-muted-foreground">过期 Token</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 添加到黑名单 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              添加到黑名单
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Token Hash (SHA256)</Label>
              <div className="flex gap-2">
                <Input
                  value={tokenHash}
                  onChange={(e) => setTokenHash(e.target.value)}
                  placeholder="输入 Token 的 SHA256 哈希..."
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button onClick={handleAddToken} disabled={isProcessing || !tokenHash}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      添加中...
                    </>
                  ) : (
                    '添加'
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>黑名单原因</Label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="user_logout">用户登出</option>
                  <option value="user_deleted">用户删除</option>
                  <option value="security_breach">安全漏洞</option>
                  <option value="manual_revocation">手动吊销</option>
                  <option value="expired">已过期</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>过期时间 (小时)</Label>
                <Input
                  type="number"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  disabled={isProcessing}
                  min="1"
                  max="720"
                />
              </div>
            </div>

            <Alert>
              <AlertDescription>
                被加入黑名单的 Token 将无法继续访问受保护的 API，即使它尚未过期
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* 黑名单列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-500" />
                黑名单列表 ({blacklistedTokens.length})
              </span>
              <Button variant="ghost" size="sm" onClick={() => useTokenBlacklistStore.getState().refreshList()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blacklistedTokens.length === 0 ? (
              <div className="text-center py-12">
                <ShieldAlert className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">暂无黑名单 Token</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {blacklistedTokens.map((token, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono break-all">
                            {token.token_hash}
                          </code>
                          <Badge variant={getReasonBadgeVariant(token.reason)} className="text-xs">
                            {reasonLabels[token.reason] || token.reason}
                          </Badge>
                        </div>
                        
                        {token.expires_at && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>过期时间: {new Date(token.expires_at).toLocaleString()}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>添加时间: {new Date(token.created_at).toLocaleString()}</span>
                          {token.revoked_by && (
                            <>
                              <span>•</span>
                              <span>吊销人: {token.revoked_by}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveToken(token.token_hash)}
                        disabled={isProcessing}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
