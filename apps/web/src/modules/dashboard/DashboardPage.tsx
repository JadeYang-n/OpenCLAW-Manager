import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '../../stores/authStore'

interface InstanceStats {
  total: number
  online: number
  offline: number
  degraded: number
}

interface AlertItem {
  id: string
  timestamp: string
  message: string
  severity: 'critical' | 'warning' | 'info'
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<InstanceStats>({
    total: 0,
    online: 0,
    offline: 0,
    degraded: 0,
  })
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      
      // 获取实例列表
      const instances = await invoke<any[]>('list_instances')
      
      // 统计实例状态
      const statsData: InstanceStats = {
        total: instances.length,
        online: instances.filter((i) => i.status === 'online').length,
        offline: instances.filter((i) => i.status === 'offline').length,
        degraded: instances.filter((i) => i.status === 'degraded').length,
      }
      setStats(statsData)
      
      // 生成告警数据（模拟）
      const mockAlerts: AlertItem[] = [
        {
          id: '1',
          timestamp: '2 小时前',
          message: '实例 C 离线',
          severity: 'critical',
        },
        {
          id: '2',
          timestamp: '1 小时前',
          message: 'CPU 使用率 > 80%',
          severity: 'warning',
        },
      ]
      setAlerts(mockAlerts)
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          👋 欢迎回来，{user?.username}
        </h1>
        <p className="text-gray-600">
          角色：{user?.role === 'admin' ? '👑 超级管理员' : user?.role === 'operator' ? '🔧 运维管理员' : '👁️ 查看员'}
        </p>
      </div>

      {/* 实例状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">实例总数</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">🟢 在线</h3>
          <p className="text-3xl font-bold text-green-600">{stats.online}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">🔴 离线</h3>
          <p className="text-3xl font-bold text-red-600">{stats.offline}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">🟡 降级</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.degraded}</p>
        </div>
      </div>

      {/* 告警摘要 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">⚠️ 最近告警</h3>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              刷新
            </button>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded border-l-4 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-600 mt-1">{alert.timestamp}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      alert.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : alert.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {alert.severity === 'critical' ? '严重' : alert.severity === 'warning' ? '警告' : '提示'}
                  </span>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-gray-500 text-center py-8">暂无告警</p>
            )}
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">⚡ 快速操作</h3>
          <div className="space-y-3">
            <button
              onClick={() => (window.location.href = '/instances')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
            >
              📋 管理实例
              <p className="text-sm text-blue-100 mt-1">查看和管理所有 OpenCLAW 实例</p>
            </button>
            <button
              onClick={() => (window.location.href = '/setup')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
            >
              🚀 部署新实例
              <p className="text-sm text-green-100 mt-1">一键部署 OpenCLAW</p>
            </button>
            <button
              onClick={() => (window.location.href = '/audit')}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
            >
              📊 查看审计日志
              <p className="text-sm text-purple-100 mt-1">查看所有操作记录</p>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => (window.location.href = '/users')}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-left"
              >
                👥 用户管理
                <p className="text-sm text-red-100 mt-1">管理用户账号和权限</p>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 系统健康度 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold mb-4">💚 系统健康度</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">整体健康度</span>
              <span className="text-sm font-bold text-green-600">95%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{ width: '95%' }}
              ></div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-green-600">99.9%</p>
            <p className="text-sm text-gray-600 mt-1">可用性</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-blue-600">45ms</p>
            <p className="text-sm text-gray-600 mt-1">平均响应</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-purple-600">0</p>
            <p className="text-sm text-gray-600 mt-1">严重告警</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-800">
          💡 提示：工作台显示全局运营概览，详细数据分析请前往 Token 分析页面。
        </p>
      </div>
    </div>
  )
}
