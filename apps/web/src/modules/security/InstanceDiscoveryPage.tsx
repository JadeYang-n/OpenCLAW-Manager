// 实例发现页面
import { useState } from 'react';
import { useInstanceDiscoveryStore } from '@/hooks/useInstanceDiscovery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Play, RefreshCw, Globe, Server, Smartphone, Monitor } from 'lucide-react';

export default function InstanceDiscoveryPage() {
  const [subnet, setSubnet] = useState('192.168.1.0/24');

  const { isDiscovering, discoveredInstances, discoveryStats, startDiscovery, clearResults } = useInstanceDiscoveryStore();

  const handleDiscovery = async () => {
    await startDiscovery(subnet, 1000, 10);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'windows':
        return <Monitor className="w-4 h-4 text-blue-500" />;
      case 'linux':
        return <Server className="w-4 h-4 text-orange-500" />;
      case 'macos':
        return <Smartphone className="w-4 h-4 text-gray-500" />;
      default:
        return <Globe className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">实例自动发现</h1>
          <p className="text-muted-foreground mt-2">自动发现局域网中的 AI 实例</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={clearResults} disabled={!discoveredInstances.length}>
            <RefreshCw className="w-4 h-4 mr-2" />
            清空结果
          </Button>
          <Button onClick={handleDiscovery} disabled={isDiscovering}>
            {isDiscovering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                发现中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                开始发现
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>发现配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">子网范围</label>
            <Input
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              placeholder="192.168.1.0/24"
              disabled={isDiscovering}
            />
            <p className="text-xs text-muted-foreground">
              示例: 192.168.1.0/24 (扫描 192.168.1.1-254)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="text-2xl font-bold">{discoveryStats.total_scanned}</div>
              <div className="text-sm text-muted-foreground">已扫描</div>
            </div>
            <div className="bg-green-500/5 rounded-lg p-4">
              <div className="text-2xl font-bold">{discoveryStats.online_instances}</div>
              <div className="text-sm text-muted-foreground">在线实例</div>
            </div>
            <div className="bg-red-500/5 rounded-lg p-4">
              <div className="text-2xl font-bold">{discoveryStats.offline_hosts}</div>
              <div className="text-sm text-muted-foreground">离线主机</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {discoveredInstances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>发现结果 ({discoveredInstances.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoveredInstances.map((instance, i) => (
                <div key={i} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(instance.platform)}
                      <Badge variant="outline" className="capitalize">
                        {instance.platform}
                      </Badge>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(instance.status)}`} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{instance.ip}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-medium">Port:</span> {instance.port}
                      </div>
                    </div>

                    {instance.instance_name && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <span className="text-lg">🤖</span>
                        </div>
                        <div className="text-sm font-medium truncate">
                          {instance.instance_name}
                        </div>
                      </div>
                    )}

                    {instance.version && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <span className="text-sm">v</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          v{instance.version}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isDiscovering && discoveredInstances.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2"> Ready to Discover</h3>
          <p className="text-muted-foreground max-w-md">
            点击"开始发现"按钮，自动扫描局域网中的 AI 实例
          </p>
        </div>
      )}
    </div>
  );
}
