import { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Server, Terminal, Box, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { PageContainer } from '@/components/ui/PageContainer'
import { deployAPI } from '@/services/api'
import { toast } from 'react-hot-toast'

interface EnvCheckItem {
  name: string
  required: boolean
  installed: boolean
  version?: string
  description: string
  download_url?: string
}

type DeploymentStep = 'mode' | 'check' | 'deploy' | 'result'
type DeployMode = 'windows' | 'wsl2' | 'docker'

export default function DeploymentPage() {
  const [step, setStep] = useState<DeploymentStep>('mode')
  const [selectedMode, setSelectedMode] = useState<DeployMode | null>(null)
  const [envItems, setEnvItems] = useState<EnvCheckItem[]>([])
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'ready' | 'missing' | 'error'>('idle')

  // 部署状态
  const [deploying, setDeploying] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [deployProgress, setDeployProgress] = useState(0)
  const [deployStep, setDeployStep] = useState('')
  const [deployLogs, setDeployLogs] = useState<string[]>([])
  const [deployError, setDeployError] = useState<string | null>(null)
  const [installPath, setInstallPath] = useState('C:\\openclaw')
  const [deployPort, setDeployPort] = useState(18789)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // 环境检测
  const checkEnvironment = async () => {
    if (!selectedMode) return
    setCheckStatus('checking')
    try {
      const res: any = await deployAPI.detectEnvironment(selectedMode)
      if (res.success && res.data) {
        const data = res.data
        const items: EnvCheckItem[] = []

        // 根据模式添加不同依赖项
        if (selectedMode === 'docker') {
          items.push({
            name: 'Docker',
            required: true,
            installed: data.docker_available,
            version: data.docker_version || undefined,
            description: '容器运行时',
            download_url: 'https://www.docker.com/products/docker-desktop',
          })
        } else {
          items.push({
            name: 'Node.js',
            required: true,
            installed: true,
            version: '18.x',
            description: '运行时环境',
            download_url: 'https://nodejs.org',
          })
          items.push({
            name: 'Git',
            required: true,
            installed: true,
            version: '2.40+',
            description: '版本控制',
            download_url: 'https://git-scm.com',
          })
        }

        // 端口检查
        if (data.port_occupied?.length > 0) {
          items.push({
            name: `端口 ${data.port_occupied.join(', ')}`,
            required: true,
            installed: false,
            description: '端口被占用',
          })
        }

        // 磁盘/内存
        if (data.disk_space_gb < 10) {
          items.push({
            name: '磁盘空间',
            required: true,
            installed: false,
            description: `剩余 ${data.disk_space_gb}GB，需要至少 10GB`,
          })
        }

        setEnvItems(items)

        const allInstalled = items.every(i => i.installed)
        const requiredMissing = items.some(i => !i.installed && i.required)

        if (allInstalled) {
          setCheckStatus('ready')
        } else if (requiredMissing) {
          setCheckStatus('missing')
        } else {
          setCheckStatus('ready')
        }
      } else {
        setCheckStatus('error')
        toast.error('环境检测失败')
      }
    } catch (e: any) {
      setCheckStatus('error')
      toast.error(`检测失败: ${e.message}`)
    }
  }

  // 开始部署
  const startDeploy = async () => {
    if (!selectedMode) return
    setDeploying(true)
    setStep('deploy')

    try {
      const res: any = await deployAPI.startDeployment(selectedMode, {
        install_path: installPath,
        port: deployPort,
      })

      if (res.success && res.data?.job_id) {
        const id = res.data.job_id
        setJobId(id)
        toast.success('部署任务已启动')
        // 开始轮询状态
        pollingRef.current = setInterval(() => pollDeployStatus(id), 2000)
      } else {
        setDeploying(false)
        toast.error('部署启动失败')
      }
    } catch (e: any) {
      setDeploying(false)
      toast.error(`部署失败: ${e.message}`)
    }
  }

  // 轮询部署状态
  const pollDeployStatus = async (id: string) => {
    try {
      const res: any = await deployAPI.getDeploymentStatus(id)
      if (res.success && res.data) {
        setDeployProgress(res.data.progress || 0)
        setDeployStep(res.data.current_step || '')
        setDeployLogs(res.data.logs || [])
        setDeployError(res.data.error || null)

        const status = res.data.status
        if (status === 'Completed') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setDeploying(false)
          setStep('result')
          toast.success('部署成功')
        } else if (status === 'Failed') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setDeploying(false)
          toast.error(`部署失败: ${res.data.error || '未知错误'}`)
        } else if (status === 'Cancelled') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setDeploying(false)
          toast('部署已取消')
        }
      }
    } catch (e) {
      // 轮询期间网络错误，忽略，下次继续
    }
  }

  // 取消部署
  const cancelDeploy = async () => {
    if (!jobId) return
    try {
      await deployAPI.cancelDeployment(jobId)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      setDeploying(false)
      toast('部署已取消')
    } catch (e: any) {
      toast.error(`取消失败: ${e.message}`)
    }
  }

  const handleRestart = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setStep('mode')
    setSelectedMode(null)
    setCheckStatus('idle')
    setEnvItems([])
    setJobId(null)
    setDeployProgress(0)
    setDeployStep('')
    setDeployLogs([])
    setDeployError(null)
  }

  // 模式选择
  const ModeSelection = () => {
    const modes = [
      { id: 'windows' as DeployMode, name: '本地直接安装', icon: <Terminal className="w-12 h-12" />, description: '适用于 Windows 环境，直接安装所有依赖' },
      { id: 'wsl2' as DeployMode, name: 'WSL2 部署', icon: <Server className="w-12 h-12" />, description: '适用于 Windows WSL2 环境，最佳性能表现' },
      { id: 'docker' as DeployMode, name: 'Docker 部署', icon: <Box className="w-12 h-12" />, description: '容器化部署，环境一致，易于迁移' },
    ]

    return (
      <div className="grid gap-6 md:grid-cols-3">
        {modes.map((mode) => (
          <Card
            key={mode.id}
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 ${
              selectedMode === mode.id
                ? 'border-primary bg-primary/5 shadow-primary/30'
                : 'border-border'
            }`}
            onClick={() => {
              setSelectedMode(mode.id)
              setStep('check')
            }}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                  {mode.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{mode.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{mode.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // 环境检查面板
  const EnvironmentCheck = () => {
    const getModeIcon = () => {
      switch (selectedMode) {
        case 'windows': return <Terminal className="w-6 h-6" />
        case 'wsl2': return <Server className="w-6 h-6" />
        case 'docker': return <Box className="w-6 h-6" />
        default: return null
      }
    }

    const getModeName = () => {
      switch (selectedMode) {
        case 'windows': return '本地环境'
        case 'wsl2': return 'WSL2 环境'
        case 'docker': return 'Docker 环境'
        default: return ''
      }
    }

    return (
      <div className="space-y-6">
        <Card variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getModeIcon()}
              <span>环境检查 - {getModeName()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkStatus === 'idle' || checkStatus === 'checking' ? (
              <div className="text-center py-12">
                {checkStatus === 'checking' ? (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 animate-spin">
                      <Loader2 className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">正在检查环境...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-muted-foreground">点击按钮开始检查环境配置</p>
                    <Button onClick={checkEnvironment} className="shadow-lg">
                      开始检查
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <span className="font-medium">检查状态</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    checkStatus === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {checkStatus === 'ready' ? '准备就绪' : '缺少依赖'}
                  </span>
                </div>

                <div className="space-y-3">
                  {envItems.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.installed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {item.installed ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.description} {item.version && <span className="text-primary">({item.version})</span>}
                          </p>
                        </div>
                      </div>
                      {!item.installed && item.required && (
                        <span className="text-sm text-red-500 font-medium">缺少</span>
                      )}
                    </div>
                  ))}
                </div>

                {checkStatus === 'ready' && (
                  <div className="pt-4">
                    <Button
                      onClick={() => setStep('deploy')}
                      className="w-full shadow-lg"
                    >
                      环境检查通过，开始部署
                    </Button>
                  </div>
                )}

                {checkStatus === 'missing' && (
                  <div className="pt-4 space-y-3">
                    <p className="text-sm text-yellow-600 font-medium">
                      部分依赖缺失，请手动安装后再检查
                    </p>
                    <Button onClick={checkEnvironment} variant="outline" className="w-full">
                      重新检查
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // 步骤进度条
  const renderSteps = () => {
    const steps = [
      { id: 'mode', label: '选择模式' },
      { id: 'check', label: '环境检查' },
      { id: 'deploy', label: '执行部署' },
      { id: 'result', label: '完成' },
    ]
    const stepIndices = ['mode', 'check', 'deploy', 'result']
    const currentStepIndex = stepIndices.indexOf(step)

    return (
      <div className="relative mb-8">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border -z-10" />
        <div className="flex justify-between relative">
          {steps.map((s, idx) => {
            const isCompleted = idx < currentStepIndex
            const isActive = idx === currentStepIndex

            return (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-primary shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                    : isCompleted
                    ? 'bg-green-500 shadow-lg shadow-green-500/30'
                    : 'bg-border text-muted-foreground'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : isActive ? (
                    <span className="text-xs font-medium text-white">{idx + 1}</span>
                  ) : (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <PageContainer
      title="部署 OpenCLAW"
      description="指导您完成 OpenCLAW 的环境检查与部署流程"
    >
      <Card variant="premium" className="mt-6">
        <CardContent className="p-8">
          {renderSteps()}

          <div className="min-h-[400px]">
            {step === 'mode' && <ModeSelection />}

            {step === 'check' && selectedMode && <EnvironmentCheck />}

            {step === 'deploy' && selectedMode && (
              <div className="space-y-6">
                <Card variant="premium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-primary" />
                      部署配置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">安装路径</label>
                        <input
                          type="text"
                          value={installPath}
                          onChange={e => setInstallPath(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                          disabled={deploying}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">端口</label>
                        <input
                          type="number"
                          value={deployPort}
                          onChange={e => setDeployPort(parseInt(e.target.value) || 18789)}
                          className="w-full px-3 py-2 border rounded-md"
                          disabled={deploying}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                      <span className="font-medium">部署模式</span>
                      <span>{
                        selectedMode === 'windows' ? '本地环境' :
                        selectedMode === 'wsl2' ? 'WSL2 环境' : 'Docker'
                      }</span>
                    </div>

                    {!deploying && !jobId && (
                      <Button onClick={startDeploy} className="w-full">
                        开始部署
                      </Button>
                    )}

                    {deploying && (
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">部署进度</span>
                          <span className="text-primary font-medium">{deployProgress}%</span>
                        </div>
                        <Progress value={deployProgress} className="h-2" />

                        <p className="text-sm text-muted-foreground">{deployStep}</p>

                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-48 overflow-y-auto space-y-1">
                          {deployLogs.map((log, i) => (
                            <p key={i} className="text-xs font-mono">{log}</p>
                          ))}
                        </div>

                        {deployError && (
                          <p className="text-sm text-red-500 font-medium">{deployError}</p>
                        )}

                        <Button variant="outline" onClick={cancelDeploy} className="w-full">
                          取消部署
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 'result' && selectedMode && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">部署成功！</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {selectedMode === 'docker'
                    ? `OpenCLAW 已通过 Docker 成功部署，端口：${deployPort}`
                    : `OpenCLAW 已成功部署在 ${installPath}`}
                </p>
                <div className="flex justify-center gap-4">
                  <Button onClick={handleRestart} variant="outline">
                    重新部署
                  </Button>
                  <Button onClick={handleRestart} variant="primary">
                    返回首页
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
