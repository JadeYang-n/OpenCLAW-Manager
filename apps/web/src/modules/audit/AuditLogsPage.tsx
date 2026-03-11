import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '../../stores/authStore'

interface AuditLog {
  id: string
  timestamp: string
  user_id: string
  username: string
  resource: string
  operation: string
  result: string
  risk_level: string
}

export default function AuditLogsPage() {
  const { getToken } = useAuthStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    resource: '',
    operation: '',
    risk_level: '',
  })

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    try {
      const token = getToken() || ''
      const list = await invoke<AuditLog[]>('list_audit_logs', { token, limit: 100 })
      setLogs(list)
    } catch (error) {
      console.error('加载审计日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  function getRiskLevelColor(level: string) {
    switch (level) {
      case 'L':
        return 'bg-green-100 text-green-800'
      case 'M':
        return 'bg-yellow-100 text-yellow-800'
      case 'H':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  function getResultColor(result: string) {
    return result === 'success'
      ? 'text-green-600'
      : 'text-red-600'
  }

  const filteredLogs = logs.filter((log) => {
    if (filter.resource && !log.resource.includes(filter.resource)) return false
    if (filter.operation && !log.operation.includes(filter.operation)) return false
    if (filter.risk_level && log.risk_level !== filter.risk_level) return false
    return true
  })

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">审计日志</h1>
        
        <div className="flex space-x-4 mb-4">
          <input
            type="text"
            placeholder="筛选资源..."
            value={filter.resource}
            onChange={(e) => setFilter({ ...filter, resource: e.target.value })}
            className="px-3 py-2 border rounded"
          />
          <input
            type="text"
            placeholder="筛选操作..."
            value={filter.operation}
            onChange={(e) => setFilter({ ...filter, operation: e.target.value })}
            className="px-3 py-2 border rounded"
          />
          <select
            value={filter.risk_level}
            onChange={(e) => setFilter({ ...filter, risk_level: e.target.value })}
            className="px-3 py-2 border rounded"
          >
            <option value="">全部风险等级</option>
            <option value="L">低风险</option>
            <option value="M">中风险</option>
            <option value="H">高风险</option>
          </select>
          <button
            onClick={() => setFilter({ resource: '', operation: '', risk_level: '' })}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            清除筛选
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">时间</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">用户</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">资源</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">操作</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">风险等级</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">结果</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600">{log.timestamp}</td>
                <td className="px-6 py-4 font-medium">{log.username}</td>
                <td className="px-6 py-4 text-gray-600">{log.resource}</td>
                <td className="px-6 py-4">{log.operation}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm ${getRiskLevelColor(log.risk_level)}`}>
                    {log.risk_level === 'L' ? '低' : log.risk_level === 'M' ? '中' : '高'}
                  </span>
                </td>
                <td className={`px-6 py-4 font-medium ${getResultColor(log.result)}`}>
                  {log.result === 'success' ? '成功' : '失败'}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  暂无审计日志
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        显示 {filteredLogs.length} / {logs.length} 条记录
      </div>
    </div>
  )
}
