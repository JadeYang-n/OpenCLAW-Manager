import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import { usageAPI } from '@/services/api'
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
  const { t } = useLanguageStore()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      // 获取用量统计（/usage/current 已按角色过滤）
      const statsRes: any = await usageAPI.getCurrentUsage()
      const statsData = statsRes?.data || {}

      // 构建用量记录
      const usageRecords: UsageRecord[] = (statsData.by_provider || []).map((p: any, i: number) => ({
        id: `provider-${i}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        model: p.provider || 'unknown',
        prompt_tokens: Math.round(p.tokens * 0.6),
        completion_tokens: Math.round(p.tokens * 0.4),
        total_tokens: p.tokens,
        purpose: `厂商: ${p.provider_name || p.provider}`,
      }))

      setRecords(usageRecords)

      // 月度统计
      const currentMonth = new Date().toISOString().slice(0, 7)
      const totalTokens = statsData.total_tokens || 0
      const requestCount = statsData.request_count || 0
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
      toast.error(`${t('myUsage.loadFailed')}: ${error.message}`)
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
    return <div className="p-6">{t('common.loading')}</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('myUsage.title')}</h1>
        <p className="text-gray-600 mt-1">
          {t('myUsage.subtitle')} {user?.username}
        </p>
      </div>

      {/* 配额概览 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-4">📊 {t('myUsage.usageStats')}</h3>
        {monthlyStats.length > 0 && monthlyStats[0].total_tokens > 0 ? (
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm text-gray-600">{t('myUsage.currentPeriod')}</p>
                <p className="text-2xl font-bold">{monthlyStats[0].month}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{t('myUsage.used')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {monthlyStats[0].total_tokens.toLocaleString()} tokens
                </p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{monthlyStats[0].request_count} {t('myUsage.requests')}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">{t('myUsage.noData')}</p>
        )}
        {monthlyStats.length > 0 && monthlyStats[0].total_tokens === 0 && (
          <p className="text-amber-600 text-sm mt-2">⚠️ {t('myUsage.noRealData')}</p>
        )}
      </div>

      {/* 使用记录 */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">📝 {t('myUsage.usageRecords')}</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">{t('myUsage.time')}</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">{t('myUsage.model')}</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">{t('myUsage.source')}</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">{t('myUsage.prompt')}</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">{t('myUsage.completion')}</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">{t('myUsage.total')}</th>
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
                  {t('myUsage.noRecords')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
