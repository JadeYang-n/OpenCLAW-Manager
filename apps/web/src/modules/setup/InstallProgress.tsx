import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'

interface InstallResult {
  success: boolean
  message: string
  web_url: string
  config_path: string
  logs_path: string
}

interface InstallProgress {
  step: string
  message: string
  percentage: number
}

interface InstallConfig {
  installPath: string
  webPort: number
  webhookPort: number
  imPlatform: string
  feishuAppId: string
  feishuAppSecret: string
  llmProvider: string
  apiKey: string
  model: string
}

const InstallProgress: React.FC = () => {
  const [progress, setProgress] = useState<InstallProgress>({
    step: 'preparing',
    message: '准备安装环境...',
    percentage: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<boolean>(false)
  const navigate = useNavigate()

  useEffect(() => {
    const startInstall = async () => {
      try {
        // 从本地存储获取安装配置
        const configStr = localStorage.getItem('installConfig')
        if (!configStr) {
          throw new Error('未找到安装配置，请返回上一步重新配置')
        }
        
        const config: InstallConfig = JSON.parse(configStr)
        
        // 验证必填字段
        if (!config.apiKey) {
          throw new Error('API Key 不能为空')
        }
        if (!config.feishuAppId || !config.feishuAppSecret) {
          throw new Error('请配置飞书 App ID 和 App Secret')
        }

        // 调用后端安装命令
        const result = await invoke<InstallResult>('install_openclaw_docker', {
          installPath: config.installPath || '~/.openclaw',
          config: {
            install_path: config.installPath || '~/.openclaw',
            web_port: config.webPort || 18789,
            webhook_port: config.webhookPort || 8080,
            im_platform: config.imPlatform || 'feishu',
            feishu_app_id: config.feishuAppId,
            feishu_app_secret: config.feishuAppSecret,
            llm_provider: config.llmProvider || 'aliyun',
            api_key: config.apiKey,
            model: config.model || 'qwen-max'
          }
        })

        // 检查返回结果
        if (!result.success) {
          throw new Error(result.message || '安装失败')
        }

        // 安装成功
        setProgress({ step: 'completed', message: '安装完成！', percentage: 100 })
        setCompleted(true)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '安装失败，未知错误'
        setError(errorMsg)
      }
    }

    startInstall()
  }, [])

  const handleNavigateToDashboard = () => {
    navigate('/dashboard')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">安装进度</h1>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="bg-card p-6 rounded-lg border mb-6">
        <h3 className="text-lg font-semibold mb-4">安装状态</h3>
        
        {/* 进度条 */}
        <div className="w-full bg-muted rounded-full h-4 mb-4">
          <div 
            className="bg-primary h-4 rounded-full transition-all duration-300" 
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
        
        {/* 进度信息 */}
        <div className="text-center mb-6">
          <p className="text-lg font-medium">{progress.message}</p>
          <p className="text-sm text-muted-foreground">{progress.percentage}%</p>
        </div>

        {/* 安装步骤 */}
        <div className="space-y-2">
          <div className={`flex items-center gap-2 ${progress.percentage >= 10 ? 'text-green-500' : 'text-muted-foreground'}`}>
            <div className={`w-2 h-2 rounded-full ${progress.percentage >= 10 ? 'bg-green-500' : 'bg-muted'}`}></div>
            <span className="text-sm">准备安装环境</span>
          </div>
          <div className={`flex items-center gap-2 ${progress.percentage >= 20 ? 'text-green-500' : 'text-muted-foreground'}`}>
            <div className={`w-2 h-2 rounded-full ${progress.percentage >= 20 ? 'bg-green-500' : 'bg-muted'}`}></div>
            <span className="text-sm">创建目录结构</span>
          </div>
          <div className={`flex items-center gap-2 ${progress.percentage >= 40 ? 'text-green-500' : 'text-muted-foreground'}`}>
            <div className={`w-2 h-2 rounded-full ${progress.percentage >= 40 ? 'bg-green-500' : 'bg-muted'}`}></div>
            <span className="text-sm">下载 Docker Compose 配置</span>
          </div>
          <div className={`flex items-center gap-2 ${progress.percentage >= 60 ? 'text-green-500' : 'text-muted-foreground'}`}>
            <div className={`w-2 h-2 rounded-full ${progress.percentage >= 60 ? 'bg-green-500' : 'bg-muted'}`}></div>
            <span className="text-sm">生成 OpenCLAW 配置文件</span>
          </div>
          <div className={`flex items-center gap-2 ${progress.percentage >= 80 ? 'text-green-500' : 'text-muted-foreground'}`}>
            <div className={`w-2 h-2 rounded-full ${progress.percentage >= 80 ? 'bg-green-500' : 'bg-muted'}`}></div>
            <span className="text-sm">启动 OpenCLAW 容器</span>
          </div>
          <div className={`flex items-center gap-2 ${progress.percentage >= 95 ? 'text-green-500' : 'text-muted-foreground'}`}>
            <div className={`w-2 h-2 rounded-full ${progress.percentage >= 95 ? 'bg-green-500' : 'bg-muted'}`}></div>
            <span className="text-sm">检查服务是否正常</span>
          </div>
        </div>

        {/* 完成按钮 */}
        {completed && (
          <div className="mt-8 text-center">
            <div className="bg-green-100 text-green-800 p-4 rounded-md mb-4">
              <p className="font-medium">OpenCLAW 安装成功！</p>
              <p className="text-sm">Web 界面地址: http://localhost:18789</p>
            </div>
            <button
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              onClick={handleNavigateToDashboard}
            >
              进入仪表盘
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default InstallProgress
