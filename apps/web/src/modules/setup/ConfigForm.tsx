import React, { useState } from 'react'

interface OpenCLAWConfig {
  // IM 平台
  imPlatform: 'feishu' | 'dingtalk' | 'wecom' | 'telegram'
  feishuAppId: string
  feishuAppSecret: string
  
  // LLM 配置
  llmProvider: 'aliyun' | 'deepseek' | 'kimi' | 'zhipu'
  apiKey: string
  model: string
  
  // 部署设置
  installPath: string
  webPort: number
  webhookPort: number
}

const ConfigForm: React.FC = () => {
  const [formData, setFormData] = useState<OpenCLAWConfig>({
    imPlatform: 'feishu',
    feishuAppId: '',
    feishuAppSecret: '',
    llmProvider: 'aliyun',
    apiKey: '',
    model: 'gpt-4o',
    installPath: '~/.openclaw',
    webPort: 18789,
    webhookPort: 8080
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 处理表单提交
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* IM 平台配置 */}
      <div>
        <h4 className="font-medium mb-3">IM 平台配置</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">平台类型</label>
            <select 
              name="imPlatform"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.imPlatform}
              onChange={handleInputChange}
            >
              <option value="feishu">飞书</option>
              <option value="dingtalk">钉钉</option>
              <option value="wecom">企业微信</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
          {formData.imPlatform === 'feishu' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">飞书 App ID</label>
                <input 
                  type="text" 
                  name="feishuAppId"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.feishuAppId}
                  onChange={handleInputChange}
                  placeholder="请输入飞书 App ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">飞书 App Secret</label>
                <input 
                  type="password" 
                  name="feishuAppSecret"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.feishuAppSecret}
                  onChange={handleInputChange}
                  placeholder="请输入飞书 App Secret"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Webhook 端口</label>
            <input 
              type="number" 
              name="webhookPort"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.webhookPort}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      {/* LLM 配置 */}
      <div>
        <h4 className="font-medium mb-3">LLM 配置</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">LLM 提供商</label>
            <select 
              name="llmProvider"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.llmProvider}
              onChange={handleInputChange}
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
              name="apiKey"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.apiKey}
              onChange={handleInputChange}
              placeholder="请输入 API Key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">模型</label>
            <select 
              name="model"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.model}
              onChange={handleInputChange}
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4-turbo">gpt-4-turbo</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            </select>
          </div>
        </div>
      </div>

      {/* 部署设置 */}
      <div>
        <h4 className="font-medium mb-3">部署设置</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">安装路径</label>
            <input 
              type="text" 
              name="installPath"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.installPath}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Web 界面端口</label>
            <input 
              type="number" 
              name="webPort"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.webPort}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          保存配置
        </button>
      </div>
    </form>
  )
}

export default ConfigForm
