import React from 'react'
import { toast } from 'react-hot-toast';

const SecurityPage: React.FC = () => {

  // 处理查看密钥
  const handleViewKey = (keyName: string) => {
    // TODO: 实现查看密钥的逻辑
    console.log(`查看密钥: ${keyName}`)
    // 暂时提示用户
    toast(`查看密钥功能: ${keyName} (待实现)`);
  }

  // 处理添加新密钥
  const handleAddKey = () => {
    // TODO: 实现添加密钥的逻辑
    console.log('添加新密钥')
    // 暂时跳转或提示
    toast('添加密钥功能 (待实现)');
  }

  // 处理开始检测
  const handleStartCheck = () => {
    // TODO: 实现安全体检逻辑
    console.log('开始安全体检')
    toast('安全体检功能 (待实现)');
  }

  // 处理执行加固
  const handleExecuteHardening = () => {
    // TODO: 实现一键加固逻辑
    console.log('执行一键加固')
    toast('一键加固功能 (待实现)');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">安全中心</h1>

      {/* 密钥管理 */}
      <div className="bg-card p-6 rounded-lg border mb-6">
        <h3 className="text-lg font-semibold mb-4">密钥管理</h3>
        <div className="space-y-4">
          <div className="p-4 border rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">OpenAI API Key</p>
                <p className="text-sm text-muted-foreground">已存储在系统密钥链</p>
              </div>
              <button 
                onClick={() => handleViewKey('OpenAI API Key')}
                className="px-3 py-1 border rounded-md hover:bg-muted transition-colors"
              >
                查看
              </button>
            </div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">飞书 App Secret</p>
                <p className="text-sm text-muted-foreground">已存储在系统密钥链</p>
              </div>
              <button 
                onClick={() => handleViewKey('飞书 App Secret')}
                className="px-3 py-1 border rounded-md hover:bg-muted transition-colors"
              >
                查看
              </button>
            </div>
          </div>
          <button 
            onClick={handleAddKey}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            添加新密钥
          </button>
        </div>
      </div>

      {/* 安全体检 */}
      <div className="bg-card p-6 rounded-lg border mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">安全体检</h3>
          <button 
            onClick={handleStartCheck}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            开始检测
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <p className="font-medium">API 密钥存储</p>
              <p className="text-sm text-muted-foreground">检查 API 密钥是否明文存储</p>
            </div>
            <span className="text-green-500 font-medium">安全</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <p className="font-medium">端口配置</p>
              <p className="text-sm text-muted-foreground">检查是否使用默认端口</p>
            </div>
            <span className="text-yellow-500 font-medium">警告</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <p className="font-medium">OpenCLAW 版本</p>
              <p className="text-sm text-muted-foreground">检查是否存在已知漏洞</p>
            </div>
            <span className="text-green-500 font-medium">安全</span>
          </div>
        </div>
      </div>

      {/* 一键加固 */}
      <div className="bg-card p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">一键加固</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input type="checkbox" id="port" className="mr-2" />
            <label htmlFor="port" className="text-sm">关闭不必要端口</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="config" className="mr-2" />
            <label htmlFor="config" className="text-sm">修改默认配置</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="user" className="mr-2" />
            <label htmlFor="user" className="text-sm">以非 root 用户运行</label>
          </div>
          <button 
            onClick={handleExecuteHardening}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            执行加固
          </button>
        </div>
      </div>
    </div>
  )
}

export default SecurityPage