import React, { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useNavigate } from 'react-router-dom'
import { DeployModeSelector, DeployMode } from './DeployModeSelector'

interface EnvCheckItem {
  id: string
  name: string
  description: string
  required: boolean
  installed: boolean
  version: string | null
  auto_fix?: string
}

interface DeployStep {
  id: string
  name: string
  description: string
  items: EnvCheckItem[]
}

// 不同部署方式的环境检测项
const deployChecks: Record<DeployMode['id'], DeployStep[]> = {
  windows: [
    {
      id: 'windows-basics',
      name: 'Windows 基础环境',
      description: 'Windows 系统基础组件检测',
      items: [
        {
          id: 'nodejs',
          name: 'Node.js',
          description: 'JavaScript 运行时环境（v18 或更高版本）',
          required: true,
          installed: false,
          version: null,
          auto_fix: 'install-nodejs-windows',
        },
        {
          id: 'pnpm',
          name: 'pnpm 包管理器',
          description: 'Node.js 包管理工具',
          required: true,
          installed: false,
          version: null,
          auto_fix: 'install-pnpm',
        },
        {
          id: 'git',
          name: 'Git',
          description: '版本控制工具',
          required: false,
          installed: false,
          version: null,
          auto_fix: 'install-git-windows',
        },
      ],
    },
  ],
  wsl2: [
    {
      id: 'wsl2-basics',
      name: 'WSL2 基础',
      description: 'WSL2 环境检测',
      items: [
        {
          id: 'wsl2-enabled',
          name: 'WSL2 功能',
          description: 'Windows Subsystem for Linux 2',
          required: true,
          installed: false,
          version: null,
          auto_fix: 'enable-wsl2',
        },
        {
          id: 'linux-distro',
          name: 'Linux 发行版',
          description: 'Ubuntu 20.04 或更高版本',
          required: true,
          installed: false,
          version: null,
          auto_fix: 'install-ubuntu-wsl',
        },
      ],
    },
    {
      id: 'wsl2-tools',
      name: 'WSL2 开发工具',
      description: 'Linux 环境下的开发工具',
      items: [
        {
          id: 'nodejs-wsl',
          name: 'Node.js',
          description: 'JavaScript 运行时环境',
          required: true,
          installed: false,
          version: null,
          auto_fix: 'install-nodejs-wsl',
        },
        {
          id: 'pnpm-wsl',
          name: 'pnpm',
          description: 'Node.js 包管理工具',
          required: true,
          installed: false,
          version: null,
          auto_fix: 'install-pnpm-wsl',
        },
      ],
    },
  ],
  docker: [
    {
      id: 'docker-basics',
      name: 'Docker 基础',
      description: 'Docker 环境检测',
      items: [
        {
          id: 'docker-desktop',
          name: 'Docker Desktop',
          description: 'Docker Desktop for Windows',
          required: true,
          installed: false,
          version: null,
          auto_fix: 'install-docker-desktop',
        },
        {
          id: 'docker-running',
          name: 'Docker 服务',
          description: 'Docker 守护进程运行状态',
          required: true,
          installed: false,
          version: null,
          auto_fix: 'start-docker-service',
        },
      ],
    },
  ],
}

const SetupPage: React.FC = () => {
  const navigate = useNavigate()
  const [selectedMode, setSelectedMode] = useState<DeployMode['id'] | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [checks, setChecks] = useState<Record<DeployMode['id'], DeployStep[]> | null>(null)
  const [checkCompleted, setCheckCompleted] = useState(false)

  // 环境检测（根据选择的部署方式）
  const handleCheckEnvironment = async () => {
    if (!selectedMode) return
    
    try {
      setLoading(true)
      setError(null)
      
      console.log(`执行 ${selectedMode} 环境检测...`)
      
      // TODO: 调用后端 API 进行实际检测
      // const result = await invoke<EnvCheckResult>('check_environment', { mode: selectedMode })
      
      // 暂时使用预定义的检测项（实际应该由后端返回检测结果）
      setChecks(deployChecks)
      setCheckCompleted(true)
      
    } catch (err) {
      setError('环境检测失败：' + (err as Error).message)
      console.error('环境检测命令错误:', err)
    } finally {
      setLoading(false)
    }
  }

  // 自动修复
  const handleAutoFix = async (mode: DeployMode['id'], stepId: string, itemId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`执行修复：${mode} / ${stepId} / ${itemId}`)
      
      // TODO: 调用后端 API 执行修复
      // await invoke('fix_environment', { mode, step: stepId, item: itemId })
      
      // 修复后重新检测
      await handleCheckEnvironment()
      
    } catch (err) {
      setError('修复失败：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 开始部署
  const handleDeploy = async () => {
    if (!selectedMode || !checkCompleted) return
    
    try {
      setLoading(true)
      setError(null)
      
      console.log(`开始部署：${selectedMode}`)
      
      // TODO: 调用后端 API 开始部署
      // await invoke('deploy_openclaw', { mode: selectedMode })
      
      // 跳转到部署进度页面
      navigate('/setup/deploy', { state: { mode: selectedMode } })
      
    } catch (err) {
      setError('部署失败：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">部署向导</h1>
      <p className="text-gray-600 mb-8">
        选择部署方式并检测环境，一键完成 OpenCLAW 安装
      </p>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${selectedMode ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              selectedMode ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">选择部署方式</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${selectedMode ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${checkCompleted ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              checkCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">环境检测</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${checkCompleted ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${checkCompleted ? 'text-gray-400' : 'text-gray-300'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              checkCompleted ? 'bg-gray-200' : 'bg-gray-100'
            }`}>
              3
            </div>
            <span className="ml-2 font-medium">一键部署</span>
          </div>
        </div>
      </div>

      {/* 步骤 1：选择部署方式 */}
      {!selectedMode && (
        <DeployModeSelector selectedMode={null} onSelectMode={setSelectedMode} />
      )}

      {/* 步骤 2：环境检测 */}
      {selectedMode && !checkCompleted && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">环境检测</h2>
            <p className="text-gray-600">
              检测 <span className="font-medium text-blue-600">
                {selectedMode === 'windows' && '本地直接安装'}
                {selectedMode === 'wsl2' && 'WSL2 部署'}
                {selectedMode === 'docker' && 'Docker 部署'}
              </span> 所需的环境
            </p>
          </div>

          <div className="flex justify-center">
            <button
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
              onClick={handleCheckEnvironment}
              disabled={loading}
            >
              {loading ? '检测中...' : '开始检测环境'}
            </button>
          </div>
        </div>
      )}

      {/* 步骤 3：检测结果显示 + 一键部署 */}
      {selectedMode && checkCompleted && checks && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">✅ 环境检测完成</h2>
            <p className="text-gray-600">
              以下是 {selectedMode === 'windows' && '本地直接安装'}
              {selectedMode === 'wsl2' && 'WSL2 部署'}
              {selectedMode === 'docker' && 'Docker 部署'} 的环境要求
            </p>
          </div>

          {/* 检测项列表 */}
          <div className="space-y-4">
            {checks[selectedMode].map((step) => (
              <div key={step.id} className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">{step.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{step.description}</p>
                
                <div className="space-y-3">
                  {step.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3 flex-1">
                        {item.installed ? (
                          <span className="text-green-500 text-xl">✅</span>
                        ) : (
                          <span className="text-red-500 text-xl">❌</span>
                        )}
                        <div>
                          <p className="font-medium">
                            {item.name}
                            {item.required && <span className="text-red-500 text-xs ml-1">*</span>}
                          </p>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {item.version && (
                          <span className="text-sm text-gray-500">v{item.version}</span>
                        )}
                        {!item.installed && item.auto_fix && (
                          <button
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={() => handleAutoFix(selectedMode, step.id, item.id)}
                            disabled={loading}
                          >
                            {loading ? '修复中...' : '一键修复'}
                          </button>
                        )}
                        {item.installed && (
                          <span className="text-sm text-green-600 font-medium">已通过</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 部署按钮 */}
          <div className="flex justify-center gap-4 pt-6">
            <button
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => {
                setSelectedMode(null)
                setCheckCompleted(false)
              }}
            >
              返回重选
            </button>
            <button
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg"
              onClick={handleDeploy}
              disabled={loading}
            >
              {loading ? '部署中...' : '一键部署'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500">
            <span className="text-red-500">*</span> 标记的项目为必需项，所有必需项通过后才能部署
          </p>
        </div>
      )}
    </div>
  )
}

export default SetupPage
