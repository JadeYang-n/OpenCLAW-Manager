import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface UsageRecord {
  id: string
  timestamp: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  purpose: string
}

interface MonthlyStats {
  month: string
  total_tokens: number
  request_count: number
  quota: number
  quota_used_percent: number
}

export default function MyUsagePage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      
      // TODO: 调用后端 API 获取当前用户的用量
      // const token = getToken() || ''
      // const data = await invoke<UsageRecord[]>('list_my_usage', { token })
      
      // 暂时模拟数据
      const mockRecords: UsageRecord[] = [
        {
          id: '1',
          timestamp: '2026-03-10 14:30:00',
          model: 'gpt-3.5-turbo',
          prompt_tokens: 500,
          completion_tokens: 300,
          total_tokens: 800,
          purpose: '周报生成',
        },
        {
          id: '2',
          timestamp: '2026-03-10 11:20:00',
          model: 'gpt-3.5-turbo',
          prompt_tokens: 200,
          completion_tokens: 150,
          total_tokens: 350,
          purpose: '邮件草稿',
        },
        {
          id: '3',
          timestamp: '2026-03-09 16:45:00',
          model: 'gpt-4',
          prompt_tokens: 1200,
          completion_tokens: 800,
          total_tokens: 2000,
          purpose: '代码审查',
        },
      ]
      setRecords(mockRecords)
      
      // 模拟月度统计
      const mockMonthly: MonthlyStats[] = [
        { month: '2026-03', total_tokens: 15000, request_count: 45, quota: 50000, quota_used_percent: 30 },
        { month: '2026-02', total_tokens: 32000, request_count: 89, quota: 50000, quota_used_percent: 64 },
        { month: '2026-01', total_tokens: 28000, request_count: 76, quota: 50000, quota_used_percent: 56 },
      ]
      setMonthlyStats(mockMonthly)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  function getModelIcon(model: string) {
    if (model.includes('gpt-4')) return '🔷'
    if (model.includes('gpt-3.5')) return '🔹'
    return '⚪'
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">我的使用</h1>
        <p className="text-gray-600 mt-1">
          查看您个人的 Token 使用情况和配额
        </p>
      </div>

      {/* 配额概览 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-4">📊 本月配额使用情况</h3>
        {monthlyStats.length > 0 && (
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm text-gray-600">当前月份</p>
                <p className="text-2xl font-bold">{monthlyStats[0].month}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">已使用</p>
                <p className="text-2xl font-bold text-blue-600">
                  {monthlyStats[0].total_tokens.toLocaleString()} / {monthlyStats[0].quota.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className={`h-4 rounded-full ${
                  monthlyStats[0].quota_used_percent > 80
                    ? 'bg-red-600'
                    : monthlyStats[0].quota_used_percent > 50
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
                style={{ width: `${monthlyStats[0].quota_used_percent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{monthlyStats[0].request_count} 次请求</span>
              <span className={`font-medium ${
                monthlyStats[0].quota_used_percent > 80
                  ? 'text-red-600'
                  : monthlyStats[0].quota_used_percent > 50
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {monthlyStats[0].quota_used_percent}% 已使用
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 历史月份 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-4">📅 历史月份</h3>
        <div className="space-y-3">
          {monthlyStats.slice(1).map((month) => (
            <div key={month.month} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="font-medium">{month.month}</div>
              <div className="flex items-center gap-8">
                <div className="text-sm text-gray-600">{month.request_count} 次请求</div>
                <div className="text-right">
                  <div className="text-sm font-medium">{month.total_tokens.toLocaleString()} tokens</div>
                  <div className="text-xs text-gray-500">{month.quota_used_percent}% 配额使用率</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 使用记录 */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">📝 使用记录</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">时间</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">模型</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">用途</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">Prompt</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">Completion</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">总计</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{record.timestamp}</td>
                <td className="px-6 py-4">
                  <span className="text-sm">
                    {getModelIcon(record.model)} {record.model}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium">{record.purpose}</td>
                <td className="px-6 py-4 text-right text-gray-600">{record.prompt_tokens.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-gray-600">{record.completion_tokens.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-medium">{record.total_tokens.toLocaleString()}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  暂无使用记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-green-50 rounded-md">
        <p className="text-sm text-green-800">
          ✅ 普通员工只能查看自己的使用记录，无法查看他人数据。如需提升配额，请联系部门管理员。
        </p>
      </div>
    </div>
  )
}
