import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { tokenUsageAPI } from '@/services/api'
import { toast } from 'react-hot-toast'

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

      // 获取用量统计（employee 角色后端自动过滤为当前用户）
      const statsRes: any = await tokenUsageAPI.getStats()
      let statsData = statsRes?.data || {}

      // 获取用量记录
      const recordsRes: any = await tokenUsageAPI.getTokenUsage()
      const usageRecords: any[] = Array.isArray(recordsRes?.data) ? recordsRes.data : []

      // 转换为前端格式
      const formattedRecords: UsageRecord[] = usageRecords.slice(0, 20).map((r: any) => ({
        id: r.id,
        timestamp: r.reported_at || new Date().toISOString(),
        model: r.model || 'unknown',
        prompt_tokens: r.prompt_tokens || 0,
        completion_tokens: r.completion_tokens || 0,
        total_tokens: r.total_tokens || 0,
        purpose: `实例: ${r.instance_name || r.instance_id || '未知'}`,
      }))

      setRecords(formattedRecords)

      // 月度统计
      const currentMonth = new Date().toISOString().slice(0, 7)
      const totalTokens = statsData.total_tokens || 0
      const requestCount = statsData.request_count || statsData.count || 0
      const quota = 50000

      const monthly: MonthlyStats[] = [
        {
          month: currentMonth,
          total_tokens: totalTokens,
          request_count: requestCount,
          quota: quota,
          quota_used_percent: Math.round((totalTokens / quota) * 100),
        },
      ]
      setMonthlyStats(monthly)
    } catch (error: any) {
      console.error('加载数据失败:', error)
      toast.error(`加载用量数据失败: ${error.message}`)
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
          查看您的 Token 使用情况（{user?.username || '当前用户'}）
        </p>
      </div>

      {/* 配额概览 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-4">📊 用量统计</h3>
        {monthlyStats.length > 0 ? (
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm text-gray-600">当前统计周期</p>
                <p className="text-2xl font-bold">{monthlyStats[0].month}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">已使用</p>
                <p className="text-2xl font-bold text-blue-600">
                  {monthlyStats[0].total_tokens.toLocaleString()} tokens
                </p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{monthlyStats[0].request_count} 次请求</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">暂无用量数据</p>
        )}
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
              <th className="px-6 py-3 text-left font-medium text-gray-700">来源</th>
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
    </div>
  )
}
