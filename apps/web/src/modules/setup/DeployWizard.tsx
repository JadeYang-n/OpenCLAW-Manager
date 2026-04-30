import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { DeployModeSelector, DeployMode } from './DeployModeSelector'
import { deployAPI } from '../../services/api'
import { EnvCheckMatrix, EnvCheckReport, EnvCheckItem } from './EnvCheckMatrix'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Rocket, CheckCircle2 } from 'lucide-react'

enum DeployStep {
  SELECT_MODE = 'select_mode',
  CHECKING = 'checking',
  FIXING = 'fixing',
  READY = 'ready',
  DEPLOYING = 'deploying',
  COMPLETED = 'completed'
}

export function DeployWizard() {
  const location = useLocation()
  const preSelectedMode = location.state?.mode as DeployMode['id'] | undefined

  const [currentStep, setCurrentStep] = useState<DeployStep>(
    preSelectedMode ? DeployStep.CHECKING : DeployStep.SELECT_MODE
  )
  const [selectedMode, setSelectedMode] = useState<DeployMode['id'] | null>(preSelectedMode || null)
  const [envReport, setEnvReport] = useState<EnvCheckReport | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [fixingItems, setFixingItems] = useState<Set<string>>(new Set())
  const [deployProgress, setDeployProgress] = useState(0)

  // Auto-start env check if mode was pre-selected from SetupPage
  useEffect(() => {
    if (preSelectedMode && !envReport && !isChecking) {
      handleEnvCheck()
    }
  }, [])

  const handleSelectMode = (mode: DeployMode['id']) => {
    setSelectedMode(mode)
    setCurrentStep(DeployStep.CHECKING)
  }

  const handleEnvCheck = async () => {
    if (!selectedMode) return
    setIsChecking(true)
    try {
      const res: any = await deployAPI.detectEnvironment(selectedMode)
      if (res.success && res.data) {
        const d = res.data
        const items: EnvCheckItem[] = []
        if (d.node_version !== undefined && d.node_version !== null) {
          items.push({ name: 'Node.js', required: true, installed: true, version: d.node_version, description: 'Node.js 20 或更高版本', fixCommand: 'winget install OpenJS.NodeJS' })
        } else {
          items.push({ name: 'Node.js', required: true, installed: false, description: 'Node.js 20 或更高版本', fixCommand: 'winget install OpenJS.NodeJS' })
        }
        if (d.git_version !== undefined && d.git_version !== null) {
          items.push({ name: 'Git', required: true, installed: true, version: d.git_version, description: 'Git 版本控制工具', downloadUrl: 'https://git-scm.com/', fixCommand: 'winget install Git.Git' })
        } else {
          items.push({ name: 'Git', required: true, installed: false, description: 'Git 版本控制工具', downloadUrl: 'https://git-scm.com/', fixCommand: 'winget install Git.Git' })
        }
        if (d.pnpm_version !== undefined && d.pnpm_version !== null) {
          items.push({ name: 'pnpm', required: true, installed: true, version: d.pnpm_version, description: 'pnpm 包管理器', fixCommand: 'npm install -g pnpm' })
        } else {
          items.push({ name: 'pnpm', required: true, installed: false, description: 'pnpm 包管理器', fixCommand: 'npm install -g pnpm' })
        }
        if (selectedMode === 'docker' && d.docker_available !== undefined) {
          items.push({ name: 'Docker', required: true, installed: d.docker_available, version: d.docker_version, description: '容器运行时', downloadUrl: 'https://www.docker.com/products/docker-desktop' })
        }
        if (d.port_occupied?.length > 0) {
          items.push({ name: `端口 ${d.port_occupied.join(', ')}`, required: true, installed: false, description: '端口被占用' })
        }
        const passedCount = items.filter(i => i.installed).length
        const report: EnvCheckReport = {
          mode: selectedMode,
          items,
          allPassed: passedCount === items.length,
          passedCount,
          totalCount: items.length,
        }
        setEnvReport(report)
        if (report.allPassed) {
          setCurrentStep(DeployStep.READY)
        } else {
          setCurrentStep(DeployStep.FIXING)
        }
      }
    } catch (error) {
      console.error('环境检测失败:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleFixEnv = async (itemName: string) => {
    setFixingItems(prev => new Set(prev).add(itemName))
    try {
      const itemKey = itemName.toLowerCase().replace(/[.\s]/g, '')
      await deployAPI.fixEnvironment(itemKey)
      await handleEnvCheck()
    } catch (error) {
      console.error('环境修复失败:', error)
    } finally {
      setFixingItems(prev => {
        const next = new Set(prev)
        next.delete(itemName)
        return next
      })
    }
  }

  const handleDeploy = async () => {
    setCurrentStep(DeployStep.DEPLOYING)
    setDeployProgress(0)
    try {
      const res: any = await deployAPI.startDeployment(selectedMode!, {
        install_path: 'C:\\openclaw',
        port: 18789,
      })
      if (res.success && res.data?.job_id) {
        const jobId = res.data.job_id
        const pollInterval = setInterval(async () => {
          try {
            const statusRes: any = await deployAPI.getDeploymentStatus(jobId)
            if (statusRes.success && statusRes.data) {
              setDeployProgress(statusRes.data.progress || 0)
              if (statusRes.data.status === 'Completed') {
                clearInterval(pollInterval)
                setCurrentStep(DeployStep.COMPLETED)
              } else if (statusRes.data.status === 'Failed') {
                clearInterval(pollInterval)
                console.error('部署失败:', statusRes.data.error)
              }
            }
          } catch (e) {
            // ignore poll errors
          }
        }, 2000)
      }
    } catch (error) {
      console.error('部署失败:', error)
      setCurrentStep(DeployStep.FIXING)
    }
  }

  const getStepInfo = () => {
    switch (currentStep) {
      case DeployStep.SELECT_MODE:
        return { title: '选择部署方式', progress: 25 }
      case DeployStep.CHECKING:
      case DeployStep.FIXING:
        return { title: '环境检测与修复', progress: 50 }
      case DeployStep.READY:
        return { title: '环境就绪', progress: 75 }
      case DeployStep.DEPLOYING:
        return { title: '正在部署', progress: 90 }
      case DeployStep.COMPLETED:
        return { title: '部署完成', progress: 100 }
    }
  }

  const stepInfo = getStepInfo()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 头部 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Rocket className="w-8 h-8" />
          一键部署 OpenCLAW
        </h1>
        <p className="text-muted-foreground">
          选择部署方式 → 环境检测 → 一键安装 → 完成部署
        </p>
      </div>

      {/* 进度条 */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{stepInfo.title}</span>
            <span className="text-sm text-muted-foreground">{stepInfo.progress}%</span>
          </div>
          <Progress value={stepInfo.progress} className="h-2" />
        </CardBody>
      </Card>

      {/* Step 1: 选择部署方式 */}
      {currentStep === DeployStep.SELECT_MODE && (
        <DeployModeSelector
          onSelectMode={handleSelectMode}
        />
      )}

      {/* Step 2: 环境检测与修复 */}
      {(currentStep === DeployStep.CHECKING || 
        currentStep === DeployStep.FIXING || 
        currentStep === DeployStep.READY) && selectedMode && (
        <EnvCheckMatrix
          mode={selectedMode}
          report={envReport}
          isChecking={isChecking}
          onCheck={handleEnvCheck}
          onFix={handleFixEnv}
          fixingItems={fixingItems}
        />
      )}

      {/* Step 3: 部署按钮 */}
      {currentStep === DeployStep.READY && envReport?.allPassed && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-lg font-semibold">环境就绪，可以部署</h3>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-muted-foreground">
              所有必需环境已安装完成，点击按钮开始部署 OpenCLAW
            </p>
          </CardBody>
          <CardFooter>
            <Button size="lg" onClick={handleDeploy} className="w-full">
              <Rocket className="w-5 h-5 mr-2" />
              开始一键部署
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: 部署进度 */}
      {currentStep === DeployStep.DEPLOYING && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">正在部署 OpenCLAW</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Progress value={deployProgress} className="h-3" />
            <p className="text-center text-muted-foreground">
              部署进度：{deployProgress}%
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• 下载 OpenCLAW 镜像...</p>
              <p>• 创建配置文件...</p>
              <p>• 启动容器...</p>
              <p>• 验证服务...</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 5: 部署完成 */}
      {currentStep === DeployStep.COMPLETED && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-lg font-semibold">部署成功！</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-muted-foreground">
              OpenCLAW 已成功部署，您可以通过浏览器访问管理界面
            </p>
            <div className="flex items-center gap-4">
              <Button>
                <a href="http://localhost:18789" target="_blank" rel="noopener noreferrer">
                  打开 OpenCLAW
                </a>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                部署另一个实例
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 返回按钮 */}
      {currentStep !== DeployStep.SELECT_MODE && currentStep !== DeployStep.COMPLETED && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => {
              if (currentStep === DeployStep.CHECKING || currentStep === DeployStep.FIXING) {
                setCurrentStep(DeployStep.SELECT_MODE)
                setSelectedMode(null)
                setEnvReport(null)
              } else {
                setCurrentStep(DeployStep.SELECT_MODE)
              }
            }}
          >
            返回重新选择
          </Button>
        </div>
      )}
    </div>
  )
}
