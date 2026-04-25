import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { securityAPI } from '@/services/api'

// 端口检查项
interface PortCheck {
  port: number
  label: string
  isOpen: boolean | null
}

// 配置检查项
interface ConfigItem {
  key: string
  value: string
}

export default function SecurityPage() {
  // 密码强度检查
  const [testPassword, setTestPassword] = useState('')
  const [passwordResult, setPasswordResult] = useState<{
    is_weak: boolean
    strength: number
    suggestions: string[]
  } | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // 端口检查
  const [ports, setPorts] = useState<PortCheck[]>([
    { port: 22, label: 'SSH', isOpen: null },
    { port: 80, label: 'HTTP', isOpen: null },
    { port: 443, label: 'HTTPS', isOpen: null },
    { port: 18789, label: 'OpenCLAW Gateway', isOpen: null },
    { port: 18790, label: 'OpenCLAW Admin', isOpen: null },
    { port: 3306, label: 'MySQL', isOpen: null },
    { port: 5432, label: 'PostgreSQL', isOpen: null },
    { port: 6379, label: 'Redis', isOpen: null },
  ])
  const [portLoading, setPortLoading] = useState(false)
  const [customPort, setCustomPort] = useState('')

  // 配置泄露检查
  const [configItems, setConfigItems] = useState<ConfigItem[]>([
    { key: 'OPENAI_API_KEY', value: '' },
    { key: 'FEISHU_APP_SECRET', value: '' },
    { key: 'DATABASE_URL', value: '' },
    { key: 'JWT_SECRET', value: '' },
  ])
  const [configResult, setConfigResult] = useState<{
    has_leaks: boolean
    leak_types: string[]
    suggestions: string[]
  } | null>(null)
  const [configLoading, setConfigLoading] = useState(false)

  // 测试密码强度
  async function handleTestPassword() {
    if (!testPassword.trim()) {
      toast.error('请输入要测试的密码')
      return
    }
    setPasswordLoading(true)
    try {
      const res: any = await securityAPI.checkPassword({ password: testPassword })
      setPasswordResult(res.data)
      if (res.data.is_weak) {
        toast.error('密码强度不足')
      } else {
        toast.success(`密码强度: ${res.data.strength}/10`)
      }
    } catch (e: any) {
      toast.error(`密码测试失败: ${e.message}`)
    } finally {
      setPasswordLoading(false)
    }
  }

  // 端口扫描
  async function handlePortCheck() {
    const portList = ports.map(p => p.port)
    if (portList.length === 0) {
      toast.error('没有要检查的端口')
      return
    }
    setPortLoading(true)
    // 重置所有端口状态
    setPorts(prev => prev.map(p => ({ ...p, isOpen: null })))
    try {
      const res: any = await securityAPI.checkPorts({ ports: portList })
      if (res.data?.checked_ports) {
        setPorts(prev => prev.map(p => {
          const found = res.data.checked_ports.find((cp: any) => cp.port === p.port)
          return found ? { ...p, isOpen: !found.is_open } : p
        }))
        const openCount = res.data.checked_ports.filter((cp: any) => cp.is_open).length
        if (openCount > 0) {
          toast(`${openCount} 个端口开放，请检查是否需要关闭`)
        } else {
          toast.success('所有端口已关闭')
        }
      }
    } catch (e: any) {
      toast.error(`端口扫描失败: ${e.message}`)
    } finally {
      setPortLoading(false)
    }
  }

  // 添加自定义端口
  function handleAddPort() {
    const p = parseInt(customPort)
    if (isNaN(p) || p < 1 || p > 65535) {
      toast.error('端口号必须在 1-65535 之间')
      return
    }
    if (ports.find(port => port.port === p)) {
      toast.error('端口已存在')
      return
    }
    setPorts(prev => [...prev, { port: p, label: `自定义:${p}`, isOpen: null }])
    setCustomPort('')
  }

  // 移除端口
  function handleRemovePort(port: number) {
    if (port <= 1024) {
      toast.error('系统端口不允许移除')
      return
    }
    setPorts(prev => prev.filter(p => p.port !== port))
  }

  // 配置泄露检查
  async function handleConfigCheck() {
    const configJson = JSON.stringify(
      configItems.reduce((acc, item) => {
        if (item.value) acc[item.key] = item.value
        return acc
      }, {} as Record<string, string>)
    )
    if (!configJson || configJson === '{}') {
      toast.error('请至少输入一个配置值')
      return
    }
    setConfigLoading(true)
    try {
      const res: any = await securityAPI.checkConfig({ config_json: configJson })
      setConfigResult(res.data)
      if (res.data.has_leaks) {
        toast.error(`发现 ${res.data.leak_types.length} 个配置泄露风险`)
      } else {
        toast.success('配置安全，未发现泄露风险')
      }
    } catch (e: any) {
      toast.error(`配置检查失败: ${e.message}`)
    } finally {
      setConfigLoading(false)
    }
  }

  // 添加配置项
  function handleAddConfig() {
    setConfigItems(prev => [...prev, { key: '', value: '' }])
  }

  // 移除配置项
  function handleRemoveConfig(index: number) {
    setConfigItems(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">安全中心</h1>
        <p className="text-muted-foreground mt-1">检测密码强度、端口开放状态和配置泄露风险</p>
      </div>

      {/* 密码强度检测 */}
      <Card>
        <CardHeader>
          <CardTitle>🔑 密码强度检测</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={testPassword}
              onChange={e => setTestPassword(e.target.value)}
              placeholder="输入要测试的密码"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button onClick={handleTestPassword} disabled={passwordLoading}>
              {passwordLoading ? '检测中...' : '检测'}
            </Button>
          </div>
          {passwordResult && (
            <div className={`p-4 rounded-lg ${passwordResult.is_weak ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">强度评分</span>
                <span className={`text-lg font-bold ${passwordResult.is_weak ? 'text-red-600' : 'text-green-600'}`}>
                  {passwordResult.strength}/10
                </span>
              </div>
              {passwordResult.suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">建议：</p>
                  {passwordResult.suggestions.map((s, i) => (
                    <p key={i} className="text-sm text-gray-600">• {s}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 端口扫描 */}
      <Card>
        <CardHeader>
          <CardTitle>🌐 端口扫描</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              value={customPort}
              onChange={e => setCustomPort(e.target.value)}
              placeholder="自定义端口号"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button variant="outline" onClick={handleAddPort}>添加端口</Button>
          </div>
          <div className="space-y-2">
            {ports.map(port => (
              <div key={port.port} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <span className="font-medium w-24">{port.port}</span>
                  <span className="text-sm text-muted-foreground">{port.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {port.isOpen === null ? (
                    <span className="text-sm text-gray-400">未检测</span>
                  ) : port.isOpen ? (
                    <span className="text-sm text-green-600 font-medium">✓ 已关闭</span>
                  ) : (
                    <span className="text-sm text-red-600 font-medium">✗ 已开放</span>
                  )}
                  {port.port > 1024 && (
                    <button
                      onClick={() => handleRemovePort(port.port)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button onClick={handlePortCheck} disabled={portLoading} className="w-full">
            {portLoading ? '扫描中...' : '开始扫描'}
          </Button>
        </CardContent>
      </Card>

      {/* 配置泄露检测 */}
      <Card>
        <CardHeader>
          <CardTitle>🔒 配置泄露检测</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            输入配置值，检测是否存在明文密钥、弱密码等泄露风险
          </p>
          <div className="space-y-2">
            {configItems.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={item.key}
                  onChange={e => {
                    setConfigItems(prev => prev.map((ci, i) =>
                      i === index ? { ...ci, key: e.target.value } : ci
                    ))
                  }}
                  placeholder="配置键名"
                  className="w-40 px-3 py-2 border rounded-md"
                />
                <input
                  value={item.value}
                  onChange={e => {
                    setConfigItems(prev => prev.map((ci, i) =>
                      i === index ? { ...ci, value: e.target.value } : ci
                    ))
                  }}
                  placeholder="配置值"
                  type="password"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button
                  onClick={() => handleRemoveConfig(index)}
                  className="px-2 text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddConfig}>添加配置</Button>
            <Button onClick={handleConfigCheck} disabled={configLoading} className="flex-1">
              {configLoading ? '检测中...' : '检测配置'}
            </Button>
          </div>
          {configResult && (
            <div className={`p-4 rounded-lg ${configResult.has_leaks ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`font-medium mb-2 ${configResult.has_leaks ? 'text-red-600' : 'text-green-600'}`}>
                {configResult.has_leaks ? '发现风险' : '配置安全'}
              </p>
              {configResult.leak_types.length > 0 && (
                <div className="space-y-1">
                  {configResult.leak_types.map((t, i) => (
                    <p key={i} className="text-sm text-red-600">• {t}</p>
                  ))}
                </div>
              )}
              {configResult.suggestions.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-sm font-medium text-gray-700">建议：</p>
                  {configResult.suggestions.map((s, i) => (
                    <p key={i} className="text-sm text-gray-600">• {s}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
