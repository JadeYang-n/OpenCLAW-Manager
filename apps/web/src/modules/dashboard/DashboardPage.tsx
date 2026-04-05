import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { instancesAPI } from '../../services/api'
import { 
  Activity, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  AlertCircle, 
  Bell, 
  Settings, 
  Users, 
  DollarSign, 
  TrendingUp,
  Server,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface InstanceStats {
  total: number
  online: number
  offline: number
  degraded: number
}

interface AlertItem {
  id: string
  timestamp: string
  message: string
  severity: 'critical' | 'warning' | 'info'
}

interface Instance {
  id: string
  name: string
  endpoint: string
  status: string
  version?: string
}

// 实时用量监控接口
interface CurrentUsageStats {
  total_tokens: number
  total_cost: number
  request_count: number
  by_provider: ProviderUsage[]
  by_department: DepartmentUsage[]
}

interface ProviderUsage {
  provider: string
  provider_name: string
  tokens: number
  cost: number
}

interface DepartmentUsage {
  department: string
  tokens: number
  cost: number
}

interface UsageQuotaConfig {
  enabled: boolean
  monthly_quota: number
  warning_threshold: number
  current_usage: number
  remaining: number
  usage_percent: number
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { getToken } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<InstanceStats>({
    total: 0,
    online: 0,
    offline: 0,
    degraded: 0,
  })
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  // 实时用量监控
  const [usageStats, setUsageStats] = useState<CurrentUsageStats | null>(null)
  const [quotaConfig, setQuotaConfig] = useState<UsageQuotaConfig | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)

  useEffect(() => {
    loadDashboardData()
    loadUsageData()
  }, [])

  useEffect(() => {
    // 5分钟自动刷新用量数据
    const interval = setInterval(() => {
      loadUsageData()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      
      // 获取实例列表
      try {
        const instancesData = await instancesAPI.getInstances()
        const instances = Array.isArray(instancesData) ? instancesData : (instancesData as { data?: Array<{}> })?.data || []
      
        // 统计实例状态
        const statsData: InstanceStats = {
          total: instances.length,
          online: instances.filter((i) => (i as { status?: string })?.status === 'running' || (i as { status?: string })?.status === 'online').length,
          offline: instances.filter((i) => (i as { status?: string })?.status === 'offline' || (i as { status?: string })?.status === 'maintenance').length,
        }
        setStats(statsData)
        
        // 生成告警数据（基于真实实例状态）
        const generatedAlerts: AlertItem[] = []
        
        // 检查离线实例
        const offlineInstances = instances.filter((i) => (i as { status?: string })?.status === 'offline' || (i as { status?: string })?.status === 'offline')
        offlineInstances.forEach((inst, index) => {
          generatedAlerts.push({
            id: `offline-${index}`,
            timestamp: '实时',
            message: `实例 ${(inst as { name?: string })?.name || 'Unknown'} 已离线`,
            severity: 'critical',
          })
        })
        
        // 检查降级实例
        const degradedInstances = instances.filter((i) => (i as { status?: string })?.status === 'degraded' || (i as { status?: string })?.status === 'degraded')
        degradedInstances.forEach((inst, index) => {
          generatedAlerts.push({
            id: `degraded-${index}`,
            timestamp: '实时',
            message: `实例 ${(inst as { name?: string })?.name || 'Unknown'} 状态异常`,
            severity: 'warning',
          })
        })
        
        // 如果有超过3个告警,只保留最新的
        if (generatedAlerts.length > 5) {
          setAlerts(generatedAlerts.slice(0, 5))
        } else {
          setAlerts(generatedAlerts)
        }
      } catch (error) {
        console.error('加载实例列表失败:', error)
        // 如果加载实例列表失败,使用空数组
        setStats({
          total: 0,
          online: 0,
          offline: 0,
          degraded: 0,
        })
        setAlerts([{
          id: 'error',
          timestamp: '实时',
          message: '无法加载实例数据',
          severity: 'info',
        }])
      }
    } catch (err) {
      console.error('加载数据失败:', err)
      // 错误时显示一条默认告警
      setAlerts ([{
        id: 'error',
        timestamp: '实时',
        message: '无法加载数据',
        severity: 'info',
      }])
    } finally {
      setLoading(false)
    }
  }

  // 加载实时用量数据
  const loadUsageData = useCallback(async () => {
    try {
      setUsageLoading(true)
      // TODO: 后端缺少 get_current_usage 和 get_usage_quota_config 端点
      // 暂时设置默认值
      setUsageStats(null)
      setQuotaConfig(null)
    } catch (error) {
      console.error('Failed to load usage data:', error)
    } finally {
      setUsageLoading(false)
    }
  }, [getToken])

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  const getUserRoleText = () => {
    if (user?.role === 'admin') return { text: '超级管理员', icon: <Settings className="w-4 h-4" /> }
    if (user?.role === 'operator') return { text: '运维管理员', icon: <Activity className="w-4 h-4" /> }
    return { text: '查看员', icon: <Activity className="w-4 h-4" /> }
  }

  const roleInfo = getUserRoleText()

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      {/* 顶部欢迎区 */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              欢迎来到 <span className="text-primary">OpenCLAW Manager</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span>👤 {user?.username}</span>
              <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
              <span className="flex items-center gap-1 text-primary font-medium">
                {roleInfo.icon}
                {roleInfo.text}
              </span>
            </p>
          </div>
          <Button variant="primary" onClick={loadDashboardData} className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            刷新数据
          </Button>
        </div>
      </div>

      {/* 实例状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card variant="premium">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Server className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">实例总数</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">在线实例</p>
                <p className="text-3xl font-bold text-success mt-1">{stats.online}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-error/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">离线实例</p>
                <p className="text-3xl font-bold text-error mt-1">{stats.offline}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg">
                <Activity className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">状态异常</p>
                <p className="text-3xl font-bold text-warning mt-1">{stats.degraded}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 告警摘要 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card variant="premium">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                最近告警
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadDashboardData}
                className="text-muted-foreground"
              >
                <Activity className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 shadow-sm transition-all hover:shadow-md ${
                    alert.severity === 'critical'
                      ? 'bg-error/5 border-error'
                      : alert.severity === 'warning'
                      ? 'bg-warning/5 border-warning'
                      : 'bg-primary/5 border-primary'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`font-semibold ${alert.severity === 'critical' ? 'text-error' : alert.severity === 'warning' ? 'text-warning' : 'text-primary'}`}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        alert.severity === 'critical'
                          ? 'bg-error text-error-foreground'
                          : alert.severity === 'warning'
                          ? 'bg-warning text-warning-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {alert.severity === 'critical' ? '严重' : alert.severity === 'warning' ? '警告' : '提示'}
                    </span>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-lg">系统运行正常</p>
                  <p className="text-sm text-muted-foreground mt-1">暂无最近告警</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                onClick={() => (window.location.href = '/instances')}
                variant="primary"
                className="justify-start h-auto py-4 text-left bg-primary"
              >
                <Server className="w-5 h-5 mr-3" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">管理实例</div>
                  <div className="text-sm text-primary-foreground/80 mt-1">
                    查看和管理所有 OpenCLAW 实例
                  </div>
                </div>
              </Button>

              <Button 
                onClick={() => (window.location.href = '/setup')}
                variant="success"
                className="justify-start h-auto py-4 text-left"
              >
                <CheckCircle className="w-5 h-5 mr-3" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">部署新实例</div>
                  <div className="text-sm text-success-foreground/80 mt-1">
                    一键部署 OpenCLAW
                  </div>
                </div>
              </Button>

              <Button 
                onClick={() => (window.location.href = '/audit')}
                variant="outline"
                className="justify-start h-auto py-4 text-left"
              >
                <Activity className="w-5 h-5 mr-3" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">审计日志</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    查看所有操作记录
                  </div>
                </div>
              </Button>

              {user?.role === 'admin' && (
                <Button 
                  onClick={() => (window.location.href = '/users')}
                  variant="outline"
                  className="justify-start h-auto py-4 text-left"
                >
                  <Users className="w-5 h-5 mr-3" />
                  <div className="flex-1">
                    <div className="font-semibold text-lg">用户管理</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      管理用户账号和权限
                    </div>
                  </div>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 实时用量监控 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card variant="premium" className="bg-gradient-to-br from-primary/95 to-primary/85 text-primary-foreground border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-primary-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                实时用量监控
              </CardTitle>
              {usageLoading && (
                <div className="h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin"></div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {usageStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
                    <p className="text-xs text-primary-foreground/70 mb-1">Total Tokens</p>
                    <p className="text-xl font-bold">{usageStats.total_tokens.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
                    <p className="text-xs text-primary-foreground/70 mb-1">Total Cost</p>
                    <p className="text-xl font-bold text-success">${usageStats.total_cost.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
                    <p className="text-xs text-primary-foreground/70 mb-1">Requests</p>
                    <p className="text-xl font-bold">{usageStats.request_count.toLocaleString()}</p>
                  </div>
                </div>
                
                {usageStats.by_provider.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-primary-foreground/20">
                    <p className="text-sm font-medium text-primary-foreground/80 mb-3">按厂商分摊</p>
                    <div className="space-y-2">
                      {usageStats.by_provider.slice(0, 3).map((provider) => (
                        <div key={provider.provider} className="flex justify-between items-center text-sm">
                          <span className="text-primary-foreground/80">{provider.provider_name}</span>
                          <span className="font-semibold text-primary-foreground">${provider.cost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                预算使用情况
              </CardTitle>
              {quotaConfig && (
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  quotaConfig.usage_percent >= quotaConfig.warning_threshold * 100 
                    ? 'bg-error text-error-foreground' 
                    : 'bg-success text-success-foreground'
                }`}>
                  {quotaConfig.usage_percent.toFixed(1)}%
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {quotaConfig && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">预算使用率</span>
                    <span className={`text-sm font-bold ${
                      quotaConfig.usage_percent >= quotaConfig.warning_threshold * 100 
                        ? 'text-error' 
                        : 'text-success'
                    }`}>
                      {quotaConfig.usage_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        quotaConfig.usage_percent >= quotaConfig.warning_threshold * 100 
                          ? 'bg-error' 
                          : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(quotaConfig.usage_percent, 100)}%` }}
                    />
                  </div>
                  {quotaConfig.usage_percent >= quotaConfig.warning_threshold * 100 && (
                    <p className="text-xs text-error mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      警告：预算已使用超过阈值
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">总预算</p>
                    <p className="text-lg font-bold text-foreground">${quotaConfig.monthly_quota}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">已用</p>
                    <p className="text-lg font-bold text-foreground">${quotaConfig.current_usage.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">剩余</p>
                    <p className={`text-lg font-bold ${quotaConfig.remaining < 100 ? 'text-error' : 'text-success'}`}>
                      ${quotaConfig.remaining.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 系统健康度 */}
      <Card variant="premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            系统健康度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-foreground">整体健康度</span>
                <span className="text-sm font-bold text-success">95%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-success h-3 rounded-full transition-all duration-500"
                  style={{ width: '95%' }}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl">
              <div className="flex justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">99.9%</p>
              <p className="text-sm text-muted-foreground">系统可用性</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl">
              <div className="flex justify-center mb-2">
                <Activity className="w-8 h-8 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">45ms</p>
              <p className="text-sm text-muted-foreground">平均响应时间</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl">
              <div className="flex justify-center mb-2">
                <Bell className="w-8 h-8 text-warning" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">0</p>
              <p className="text-sm text-muted-foreground">严重告警</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 底部提示 */}
      <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg mt-1">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 className="font-medium text-foreground mb-1">工作台说明</h4>
          <p className="text-sm text-muted-foreground">
            工作台显示全局运营概览，详细数据分析和Skill管理请前往对应页面。系统每5分钟自动更新用量数据。
          </p>
        </div>
      </div>
    </div>
  )
}
