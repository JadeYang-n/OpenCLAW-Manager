import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

// 模型预设列表
const MODEL_PRESETS: Record<string, { id: string; name: string }[]> = {
  aliyun: [
    { id: 'qwen-max', name: 'Qwen-Max' },
    { id: 'qwen-plus', name: 'Qwen-Plus' },
    { id: 'qwen-turbo', name: 'Qwen-Turbo' },
    { id: 'qwen3-coder', name: 'Qwen3-Coder' },
  ],
  deepseek: [
    { id: 'deepseek-v3', name: 'DeepSeek-V3' },
    { id: 'deepseek-coder', name: 'DeepSeek-Coder' },
    { id: 'deepseek-r1', name: 'DeepSeek-R1' },
  ],
  kimi: [
    { id: 'moonshot-v1-8k', name: 'Kimi-8K' },
    { id: 'moonshot-v1-32k', name: 'Kimi-32K' },
    { id: 'moonshot-v1-128k', name: 'Kimi-128K' },
  ],
  zhipu: [
    { id: 'glm-4', name: 'GLM-4' },
    { id: 'glm-4-flash', name: 'GLM-4-Flash' },
    { id: 'codegeex', name: 'CodeGeeX' },
  ],
}

const InstallWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [installMethod, setInstallMethod] = useState<string>('docker')
  const defaultPath = navigator.platform.includes('Win') 
    ? 'C:\\Users\\vip\\openclaw' 
    : '~/openclaw'

  const [installPath, setInstallPath] = useState<string>(defaultPath)
  const [webPort, setWebPort] = useState<number>(18789)
  const [webhookPort, setWebhookPort] = useState<number>(8080)
  const [imPlatform, setImPlatform] = useState<string>('feishu')
  const [feishuAppId, setFeishuAppId] = useState<string>('')
  const [feishuAppSecret, setFeishuAppSecret] = useState<string>('')
  const [llmProvider, setLlmProvider] = useState<string>('aliyun')
  const [apiKey, setApiKey] = useState<string>('')
  const [model, setModel] = useState<string>('gpt-4o')
  const navigate = useNavigate()

  const steps = [
    { title: '选择安装方式', description: '选择适合您系统的安装方式' },
    { title: '配置安装参数', description: '设置安装路径和端口等参数' },
    { title: '配置 OpenCLAW', description: '设置 API Key 和 IM 平台等配置' },
    { title: '开始安装', description: '开始安装 OpenCLAW' },
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStartInstall = () => {
    // 验证必填字段
    if (!apiKey.trim()) {
      toast.error('❌ API Key 不能为空！')
      return
    }
    
    if (imPlatform === 'feishu' && (!feishuAppId.trim() || !feishuAppSecret.trim())) {
      toast.error('❌ 请配置飞书 App ID 和 App Secret！')
      return
    }
    
    // 保存安装配置到本地存储
    const installConfig = {
      installMethod,
      installPath,
      webPort,
      webhookPort,
      imPlatform,
      feishuAppId,
      feishuAppSecret,
      llmProvider,
      apiKey,
      model
    }
    localStorage.setItem('installConfig', JSON.stringify(installConfig))
    
    toast.success('✅ 配置已保存，正在跳转到安装页面...')
    
    // 导航到安装进度页面
    navigate('/setup/install')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">OpenCLAW 安装向导</h1>

      {/* 步骤指示器 */}
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${currentStep > index + 1 ? 'bg-primary text-primary-foreground' : currentStep === index + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {index + 1}
            </div>
            <div className={`text-sm ${currentStep > index + 1 ? 'text-primary' : currentStep === index + 1 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {step.title}
            </div>
          </div>
        ))}
      </div>

      {/* 步骤内容 */}
      <div className="bg-card p-6 rounded-lg border mb-6">
        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">选择安装方式</h3>
            <p className="mb-6 text-muted-foreground">
              请选择适合您系统的安装方式
            </p>
            <div className="space-y-4">
              <div 
                className={`p-4 border rounded-md cursor-pointer transition-colors ${installMethod === 'docker' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                onClick={() => setInstallMethod('docker')}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="installMethod" 
                    value="docker" 
                    checked={installMethod === 'docker'}
                    onChange={() => setInstallMethod('docker')}
                    className="mt-1"
                  />
                  <div>
                    <h4 className="font-medium">Docker 部署（推荐）</h4>
                    <p className="text-sm text-muted-foreground">
                      适用：Windows (Docker Desktop)、macOS、Linux
                    </p>
                  </div>
                </div>
              </div>
              <div 
                className={`p-4 border rounded-md cursor-pointer transition-colors ${installMethod === 'wsl' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                onClick={() => setInstallMethod('wsl')}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="installMethod" 
                    value="wsl" 
                    checked={installMethod === 'wsl'}
                    onChange={() => setInstallMethod('wsl')}
                    className="mt-1"
                  />
                  <div>
                    <h4 className="font-medium">WSL2 部署（Windows 备选）</h4>
                    <p className="text-sm text-muted-foreground">
                      适用：Windows 10/11 用户，没有 Docker Desktop
                    </p>
                  </div>
                </div>
              </div>
              <div 
                className={`p-4 border rounded-md cursor-pointer transition-colors ${installMethod === 'local' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                onClick={() => setInstallMethod('local')}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="installMethod" 
                    value="local" 
                    checked={installMethod === 'local'}
                    onChange={() => setInstallMethod('local')}
                    className="mt-1"
                  />
                  <div>
                    <h4 className="font-medium">本地直接安装（macOS/Linux 备选）</h4>
                    <p className="text-sm text-muted-foreground">
                      适用：熟悉命令行的用户
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">配置安装参数</h3>
            <p className="mb-6 text-muted-foreground">
              设置安装路径和端口等参数
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">安装路径</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-md"
                  value={installPath}
                  onChange={(e) => setInstallPath(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  OpenCLAW 的安装目录，将存储配置文件和日志
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Web 界面端口</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md"
                  value={webPort}
                  onChange={(e) => setWebPort(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  OpenCLAW Web 界面的访问端口
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Webhook 端口</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md"
                  value={webhookPort}
                  onChange={(e) => setWebhookPort(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  IM 平台 webhook 的接收端口
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">配置 OpenCLAW</h3>
            <p className="mb-6 text-muted-foreground">
              设置 API Key 和 IM 平台等配置
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">IM 平台</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={imPlatform}
                  onChange={(e) => setImPlatform(e.target.value)}
                >
                  <option value="feishu">飞书</option>
                  <option value="dingtalk">钉钉</option>
                  <option value="wecom">企业微信</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">飞书 App ID</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="请输入飞书 App ID"
                  value={feishuAppId}
                  onChange={(e) => setFeishuAppId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">飞书 App Secret</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="请输入飞书 App Secret"
                  value={feishuAppSecret}
                  onChange={(e) => setFeishuAppSecret(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">LLM 提供商</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value)}
                >
                  <option value="aliyun">阿里云</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="kimi">Kimi</option>
                  <option value="zhipu">智谱</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="请输入 API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">模型</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {(MODEL_PRESETS[llmProvider] || []).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">开始安装</h3>
            <p className="mb-6 text-muted-foreground">
              点击开始安装按钮，系统将自动安装 OpenCLAW
            </p>
            <div className="bg-muted p-4 rounded-md mb-6">
              <h4 className="font-medium mb-2">安装信息</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="font-medium">安装方式：</span>{installMethod === 'docker' ? 'Docker 部署' : installMethod === 'wsl' ? 'WSL2 部署' : '本地直接安装'}</li>
                <li><span className="font-medium">安装路径：</span>{installPath}</li>
                <li><span className="font-medium">Web 界面端口：</span>18789</li>
                <li><span className="font-medium">Webhook 端口：</span>8080</li>
              </ul>
            </div>
            <button
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              onClick={handleStartInstall}
            >
              开始安装
            </button>
          </div>
        )}
      </div>

      {/* 导航按钮 */}
      <div className="flex justify-between">
        <button
          className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          上一步
        </button>
        {currentStep < steps.length && (
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={handleNext}
          >
            下一步
          </button>
        )}
      </div>
    </div>
  )
}

export default InstallWizard
