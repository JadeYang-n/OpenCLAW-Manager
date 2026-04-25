import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gatewayConfigAPI, instancesAPI } from '@/services/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface GatewayConfig {
  instance_id: string
  gateway_path: string
  ocm_url: string
  auto_report_enabled: boolean
  configured_at?: string
  config_status: string
  error_message?: string
}

interface Instance {
  id: string
  name: string
  endpoint: string
  status: string
  version: string
  last_heartbeat?: number
  enabled: boolean
  gateway_config?: string
  gateway_online?: boolean
}

interface ConfigStatus {
  instance_id: string
  gateway_path: string
  ocm_url: string
  auto_report_enabled: boolean
  configured_at?: string
  config_status: string
  error_message?: string
}

export default function GatewayConfigPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [instances, setInstances] = useState<Instance[]>([])
  const [configStatus, setConfigStatus] = useState<ConfigStatus[]>([])
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null)
  const [formData, setFormData] = useState({
    enable_token_usage_report: false,
    token_usage_report_url: 'http://localhost:8080/api/v1/agent/usage',
    report_interval: 0,
  })
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    fetchInstances()
    fetchConfigStatus()
  }, [])

  useEffect(() => {
    if (id) {
      const instance = instances.find(i => i.id === id)
      if (instance) {
        setSelectedInstance(instance)
        loadInstanceConfig(instance.id)
      }
    }
  }, [id, instances])

  const fetchInstances = async () => {
    try {
      const data = await instancesAPI.getInstances()
      if (data.success) {
        setInstances(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch instances:', error)
    }
  }

  const fetchConfigStatus = async () => {
    try {
      const data = await gatewayConfigAPI.getConfigStatus()
      if (data.success) {
        setConfigStatus(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch config status:', error)
    }
  }

  const loadInstanceConfig = async (instanceId: string) => {
    try {
      const data = await gatewayConfigAPI.getInstanceConfig(instanceId)
      if (data.success && data.data) {
        setFormData({
          enable_token_usage_report: data.data.enable_token_usage_report || false,
          token_usage_report_url: data.data.token_usage_report_url || 'http://localhost:8080/api/v1/agent/usage',
          report_interval: data.data.report_interval || 0,
        })
      } else {
        setFormData({
          enable_token_usage_report: false,
          token_usage_report_url: 'http://localhost:8080/api/v1/agent/usage',
          report_interval: 0,
        })
      }
    } catch (error) {
      console.error('Failed to load instance config:', error)
      setFormData({
        enable_token_usage_report: false,
        token_usage_report_url: 'http://localhost:8080/api/v1/agent/usage',
        report_interval: 0,
      })
    }
  }

  const handleAutoConfigure = async (instanceId: string) => {
    setLoading(true)
    try {
      const result = await gatewayConfigAPI.autoConfigure({
        instance_id: instanceId,
        ocm_url: 'http://localhost:8080',
        restart_gateway: true,
      })
      if (result.success) {
        alert(`实例 ${instanceId} 配置成功`)
        fetchConfigStatus()
      } else {
        alert(`配置失败：${result.error_message || result.message}`)
      }
    } catch (error) {
      console.error('Failed to auto configure:', error)
      alert('自动配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleBatchConfigure = async () => {
    setLoading(true)
    try {
      const unconfiguredInstances = instances.filter(
        i => !configStatus.find(cs => cs.instance_id === i.id)
      )
      if (unconfiguredInstances.length === 0) {
        alert('所有实例都已配置')
        setLoading(false)
        return
      }
      const results = await Promise.all(
        unconfiguredInstances.map(i =>
          gatewayConfigAPI.autoConfigure({
            instance_id: i.id,
            ocm_url: 'http://localhost:8080',
            restart_gateway: true,
          })
        )
      )
      const successCount = results.filter((r: any) => r.success).length
      alert(`批量配置完成：${successCount}/${results.length} 成功`)
      fetchConfigStatus()
    } catch (error) {
      console.error('Failed to batch configure:', error)
      alert('批量配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!selectedInstance) return
    setLoading(true)
    try {
      const result = await gatewayConfigAPI.updateInstanceConfig(selectedInstance.id, formData)
      if (result.success) {
        alert('配置保存成功')
        fetchConfigStatus()
      } else {
        alert('配置保存失败')
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('配置保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreBackup = async (instanceId: string) => {
    try {
      const result = await gatewayConfigAPI.restoreBackup(instanceId)
      if (result.success) {
        alert('备份恢复成功')
        fetchConfigStatus()
      } else {
        alert('备份恢复失败')
      }
    } catch (error) {
      console.error('Failed to restore backup:', error)
      alert('备份恢复失败')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">已配置</Badge>
      case 'failed':
        return <Badge variant="destructive">配置失败</Badge>
      case 'pending':
        return <Badge variant="secondary">配置中</Badge>
      case 'restored':
        return <Badge variant="warning">已恢复</Badge>
      default:
        return <Badge variant="outline">未配置</Badge>
    }
  }

  const getInstanceConfigStatus = (instanceId: string) => {
    return configStatus.find(cs => cs.instance_id === instanceId) || null
  }

  return (
    <div className="gateway-config-page p-6">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-semibold">Gateway 配置管理</h1>
        <p className="text-gray-500">管理 Gateway 实例的 Token Usage 自动上报配置</p>
      </div>

      <Card className="mb-4 bg-amber-50 border-amber-200">
        <CardContent className="py-3">
          <div className="text-amber-800 text-sm">
            <strong>⚠️ 配置前请注意：</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>请先<strong>以管理员身份</strong>启动 OCM Server（否则无法写入 Gateway JS 文件）</li>
              <li>请先<strong>关闭 Gateway</strong>（否则 JS 文件被锁定无法写入）</li>
              <li>配置完成后可重新启动 Gateway</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-6">
        <div className="instance-list-panel w-1/2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>实例列表</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchConfigStatus} disabled={loading}>
                    刷新状态
                  </Button>
                  <Button size="sm" onClick={handleBatchConfigure} disabled={loading}>
                    批量配置所有实例
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">实例 ID</th>
                      <th className="text-left py-2 px-2">名称</th>
                      <th className="text-left py-2 px-2">状态</th>
                      <th className="text-left py-2 px-2">配置状态</th>
                      <th className="text-left py-2 px-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map((instance) => {
                      const status = getInstanceConfigStatus(instance.id)
                      return (
                        <tr
                          key={instance.id}
                          className={`border-b cursor-pointer hover:bg-gray-50 ${selectedInstance?.id === instance.id ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            setSelectedInstance(instance)
                            loadInstanceConfig(instance.id)
                          }}
                        >
                          <td className="py-2 px-2">{instance.id}</td>
                          <td className="py-2 px-2">{instance.name}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-1 rounded text-xs ${instance.gateway_online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {instance.gateway_online ? '在线' : '离线'}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            {status ? getStatusBadge(status.config_status) : getStatusBadge('pending')}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAutoConfigure(instance.id)
                                }}
                                disabled={loading}
                              >
                                配置
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedInstance(instance)
                                  loadInstanceConfig(instance.id)
                                }}
                              >
                                编辑
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="config-form-panel w-1/2">
          {selectedInstance ? (
            <Card>
              <CardHeader>
                <CardTitle>配置实例：{selectedInstance.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">启用 Token Usage 上报</label>
                  <Switch
                    checked={formData.enable_token_usage_report}
                    onCheckedChange={(checked) => setFormData({ ...formData, enable_token_usage_report: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">上报地址</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.token_usage_report_url}
                    onChange={(e) => setFormData({ ...formData, token_usage_report_url: e.target.value })}
                    placeholder="http://localhost:8080/api/v1/agent/usage"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">上报频率</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.report_interval}
                    onChange={(e) => setFormData({ ...formData, report_interval: Number(e.target.value) })}
                  >
                    <option value={0}>实时上报（每次调用后）</option>
                    <option value={60}>批量上报（60 秒）</option>
                    <option value={300}>批量上报（5 分钟）</option>
                    <option value={3600}>定时上报（每小时）</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">配置状态</label>
                  <div>{getInstanceConfigStatus(selectedInstance.id)?.config_status ? getStatusBadge(getInstanceConfigStatus(selectedInstance.id)?.config_status || 'pending') : getStatusBadge('pending')}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">最后配置时间</label>
                  <div className="text-sm text-gray-500">
                    {(() => {
                      const dt = getInstanceConfigStatus(selectedInstance.id)?.configured_at
                      if (!dt) return '-'
                      try {
                        return new Date(dt).toLocaleString('zh-CN', { hour12: false })
                      } catch {
                        return dt
                      }
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveConfig} disabled={loading}>
                    保存配置
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadInstanceConfig(selectedInstance.id)}
                  >
                    重置
                  </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div
                    className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                  >
                    <span className="text-sm font-medium">高级设置</span>
                    <span className="text-xs">{advancedOpen ? '▲' : '▼'}</span>
                  </div>

                  {advancedOpen && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="mb-3">
                        <p className="text-sm text-gray-500">
                          当 Gateway 更新或配置异常时，点击此按钮恢复原始状态
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (confirm('确认修复 Gateway？此操作将恢复 Gateway 到原始状态，Token 上报功能将失效。需要重新配置才能恢复上报。')) {
                            handleRestoreBackup(selectedInstance.id)
                          }
                        }}
                      >
                        修复 Gateway
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">配置说明</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <strong>实时上报：</strong>每次模型调用后立即上报，数据最及时</li>
                    <li>• <strong>批量上报：</strong>累积一定时间后批量上报，减少网络请求</li>
                    <li>• <strong>定时上报：</strong>每小时上报一次，适合低频率使用场景</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center text-gray-400 py-12">
                请选择一个实例进行配置
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
