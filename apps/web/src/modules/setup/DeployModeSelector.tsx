import { useState } from 'react'
import { CheckCircle2, XCircle, ThumbsUp, Users } from 'lucide-react'

export interface DeployMode {
  id: 'windows' | 'wsl2' | 'docker'
  name: string
  description: string
  pros: string[]
  cons: string[]
  recommended: boolean
  icon: string
  suitableFor: string
  notSuitableFor: string
}

const deployModes: DeployMode[] = [
  {
    id: 'windows',
    name: '本地直接安装',
    description: '在 Windows 系统中直接安装 OpenCLAW，最简单快捷',
    suitableFor: '大多数 Windows 用户，尤其是第一次使用 OpenCLAW 的用户',
    notSuitableFor: '需要 Linux 特定功能或计划部署到 Linux 服务器的用户',
    pros: [
      '✅ 安装最简单，一键完成',
      '✅ 性能最好，无虚拟化开销',
      '✅ 资源占用少，运行流畅',
      '✅ 无需学习额外工具',
      '✅ 文件路径兼容性好（Windows 路径）',
    ],
    cons: [
      '❌ 部分 Linux 专属工具可能不兼容',
      '❌ 迁移到其他系统需要重新配置',
    ],
    recommended: true,
    icon: '🖥️'
  },
  {
    id: 'wsl2',
    name: 'WSL2 部署',
    description: '通过 Windows Subsystem for Linux 2 运行，接近 Linux 生产环境',
    suitableFor: '有 Linux 使用经验、需要在 Windows 上模拟 Linux 环境的开发者',
    notSuitableFor: '不熟悉命令行、只想简单使用的用户',
    pros: [
      '✅ 完整的 Linux 环境，兼容性好',
      '✅ 接近生产环境部署',
      '✅ 可使用所有 Linux 工具和脚本',
      '✅ 便于后续迁移到 Linux 服务器',
    ],
    cons: [
      '❌ 需要启用 WSL2 并安装 Linux 发行版',
      '❌ 占用更多磁盘空间和内存',
      '❌ 文件路径需要转换（/mnt/c/...）',
      '❌ 学习成本较高',
    ],
    recommended: false,
    icon: '🐧'
  },
  {
    id: 'docker',
    name: 'Docker 部署',
    description: '使用 Docker 容器运行，环境隔离最好，便于迁移',
    suitableFor: '有 Docker 经验、需要环境隔离或频繁迁移的用户',
    notSuitableFor: '没有 Docker 基础、追求简单安装的用户',
    pros: [
      '✅ 环境完全隔离，不影响系统',
      '✅ 便于迁移和备份（镜像导出）',
      '✅ 版本管理清晰，可随时回滚',
      '✅ 开发和生产环境一致',
      '✅ 多实例部署方便',
    ],
    cons: [
      '❌ 需要安装 Docker Desktop',
      '❌ 学习成本最高',
      '❌ 资源占用较大',
      '❌ 文件路径需要映射配置',
    ],
    recommended: false,
    icon: '🐳'
  }
]

interface DeployModeSelectorProps {
  selectedMode: DeployMode['id'] | null
  onSelectMode: (mode: DeployMode['id']) => void
}

export function DeployModeSelector({ selectedMode, onSelectMode }: DeployModeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">选择部署方式</h2>
        <p className="text-gray-600">
          以下是三种在 Windows 上运行 OpenCLAW 的方式，请根据您的使用场景选择
        </p>
      </div>

      {/* 推荐提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">如何选择？</p>
            <ul className="text-blue-800 space-y-1">
              <li>• <strong>第一次使用</strong> 或 <strong>只想简单快捷</strong> → 选择「本地直接安装」</li>
              <li>• 有 <strong>Linux 经验</strong> 或计划后续部署到服务器 → 选择「WSL2 部署」</li>
              <li>• 有 <strong>Docker 经验</strong> 或需要环境隔离 → 选择「Docker 部署」</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {deployModes.map((mode) => {
          const isSelected = selectedMode === mode.id
          
          return (
            <div
              key={mode.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg rounded-lg border-2 p-6 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
              onClick={() => onSelectMode(mode.id)}
            >
              {mode.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    推荐
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <div className="text-5xl mb-3">{mode.icon}</div>
                <h3 className="text-xl font-bold text-gray-900">{mode.name}</h3>
                <p className="text-sm text-gray-600 mt-2">{mode.description}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    优点
                  </div>
                  <ul className="space-y-1">
                    {mode.pros.map((pro, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
                    <XCircle className="w-4 h-4" />
                    缺点
                  </div>
                  <ul className="space-y-1">
                    {mode.cons.map((con, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mb-1"><strong>适合：</strong>{mode.suitableFor}</p>
                      <p><strong>不适合：</strong>{mode.notSuitableFor}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedMode && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-600 mb-2">
            已选择：<span className="font-medium text-blue-600">
              {deployModes.find(m => m.id === selectedMode)?.name}
            </span>
          </p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            onClick={() => onSelectMode(selectedMode)}
          >
            确认选择，继续下一步
          </button>
        </div>
      )}
    </div>
  )
}
