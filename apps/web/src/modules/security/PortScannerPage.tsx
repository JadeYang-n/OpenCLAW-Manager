// 端口扫描页面
import { useState } from 'react';
import { usePortScannerStore } from '@/hooks/usePortScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, Square, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function PortScannerPage() {
  const [ip, setIp] = useState('192.168.1.1');
  const [mode, setMode] = useState<'quick' | 'full' | 'custom'>('quick');
  const [customPorts, setCustomPorts] = useState('');
  const [showCustomPorts, setShowCustomPorts] = useState(false);

  const { isScanning, scanResults, scanStats, startScan, stopScan, clearResults } = usePortScannerStore();

  const handleScan = async () => {
    const ports = showCustomPorts ? customPorts.split(',').map(p => parseInt(p.trim())) : undefined;
    await startScan(ip, mode, ports);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-500';
      case 'closed':
        return 'bg-red-500';
      case 'filtered':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">端口扫描</h1>
          <p className="text-muted-foreground mt-2">扫描网络中的开放端口，识别服务</p>
        </div>
        <Button variant="outline" onClick={clearResults} disabled={!scanResults.length}>
          <Trash2 className="w-4 h-4 mr-2" />
          清空结果
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>扫描配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">目标 IP</label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.1"
                disabled={isScanning}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">扫描模式</label>
              <Select value={mode} onValueChange={(v: 'quick' | 'full' | 'custom') => setMode(v)} disabled={isScanning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">快速扫描 (常用端口)</SelectItem>
                  <SelectItem value="full">全面扫描 (1-65535)</SelectItem>
                  <SelectItem value="custom">自定义端口</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showCustomPorts && (
            <div className="space-y-2">
              <label className="text-sm font-medium">自定义端口 (逗号分隔)</label>
              <Input
                value={customPorts}
                onChange={(e) => setCustomPorts(e.target.value)}
                placeholder="22,80,443,8080"
                disabled={isScanning}
              />
            </div>
          )}

          {!showCustomPorts && (
            <Button
              variant="outline"
              onClick={() => setShowCustomPorts(true)}
              disabled={isScanning}
            >
              使用自定义端口
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>扫描控制</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="min-w-[120px]"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  扫描中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  开始扫描
                </>
              )}
            </Button>

            {isScanning && (
              <Button
                variant="outline"
                onClick={stopScan}
                disabled={!isScanning}
              >
                <Square className="w-4 h-4 mr-2" />
                停止
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {scanResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>扫描结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-primary/5 rounded-lg p-4">
                <div className="text-2xl font-bold">{scanStats.open_ports}</div>
                <div className="text-sm text-muted-foreground">开放端口</div>
              </div>
              <div className="bg-red-500/5 rounded-lg p-4">
                <div className="text-2xl font-bold">{scanStats.closed_ports}</div>
                <div className="text-sm text-muted-foreground">关闭端口</div>
              </div>
              <div className="bg-yellow-500/5 rounded-lg p-4">
                <div className="text-2xl font-bold">{scanStats.filtered_ports}</div>
                <div className="text-sm text-muted-foreground">过滤端口</div>
              </div>
              <div className="bg-blue-500/5 rounded-lg p-4">
                <div className="text-2xl font-bold">{scanStats.total_ports}</div>
                <div className="text-sm text-muted-foreground">总端口数</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">端口列表</h3>
              <div className="space-y-2">
                {scanResults.slice(0, 20).map((result, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(result.status)}`} />
                      <span className="font-mono">{result.ip}:{result.port}</span>
                      <Badge variant="secondary" className="text-xs">
                        {result.service}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(result.scanned_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {scanResults.length > 20 && (
                  <div className="text-center text-sm text-muted-foreground">
                    ... 还有 {scanResults.length - 20} 个端口
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
