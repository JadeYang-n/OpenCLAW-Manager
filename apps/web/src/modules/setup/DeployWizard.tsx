import { useState } from 'react'
import { DeployModeSelector, DeployMode } from './DeployModeSelector'
import { EnvCheckMatrix, EnvCheckReport } from './EnvCheckMatrix'
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
  const [currentStep, setCurrentStep] = useState<DeployStep>(DeployStep.SELECT_MODE)
  const [selectedMode, setSelectedMode] = useState<DeployMode['id'] | null>(null)
  const [envReport, setEnvReport] = useState<EnvCheckReport | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [fixingItems, setFixingItems] = useState<Set<string>>(new Set())
  const [deployProgress, setDeployProgress] = useState(0)

  const handleSelectMode = (mode: DeployMode['id']) => {
    setSelectedMode(mode)
    setCurrentStep(DeployStep.CHECKING)
  }

  const handleEnvCheck = async () => {
    if (!selectedMode) return
    
    setIsChecking(true)
    
    try {
      // TODO: 调用后端命令 check_environment(selectedMode)
      // 模拟检测延迟
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock 数据 - 实际应从后端获取
      const mockReport: EnvCheckReport = {
        mode: selectedMode,
        items: [
          {
            name: 'Node.js',
            required: true,
            installed: true,
            version: 'v20.11.0',
            description: 'Node.js 20 或更高版本'
          },
          {
            name: 'Git',
            required: true,
            installed: false,
            version: undefined,
            description: 'Git 版本控制工具',
            downloadUrl: 'https://git-scm.com/',
            fixCommand: 'winget install Git.Git'
          },
          {
            name: 'pnpm',
            required: true,
            installed: true,
            version: '8.15.0',
            description: 'pnpm 包管理器'
          }
        ],
        allPassed: false,
        passedCount: 2,
        totalCount: 3
      }
      
      setEnvReport(mockReport)
      
      if (mockReport.allPassed) {
        setCurrentStep(DeployStep.READY)
      } else {
        setCurrentStep(DeployStep.FIXING)
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
      // TODO: 调用后端命令 fix_environment(itemName, selectedMode)
      // 模拟修复延迟
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // 更新环境报告
      if (envReport) {
        const updatedItems = envReport.items.map(item =>
          item.name === itemName ? { ...item, installed: true, version: 'latest' } : item
        )
        
        const passedCount = updatedItems.filter(item => item.installed).length
        
        const updatedReport: EnvCheckReport = {
          ...envReport,
          items: updatedItems,
          passedCount,
          allPassed: passedCount === updatedItems.length
        }
        
        setEnvReport(updatedReport)
        
        if (updatedReport.allPassed) {
          setCurrentStep(DeployStep.READY)
        }
      }
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
    
    try {
      // TODO: 调用后端命令 deploy_openclaw(selectedMode, config)
      // 模拟部署进度
      for (let i = 0; i <= 100; i += 10) {
        setDeployProgress(i)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      setCurrentStep(DeployStep.COMPLETED)
    } catch (error) {
      console.error('部署失败:', error)
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
