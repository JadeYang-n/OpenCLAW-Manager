import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '../../stores/authStore'
import * as deptApi from '../departments/api'
import type { Department } from '../departments/types'

interface TokenUsage {
  id: string
  instance_id: string
  instance_name: string
  timestamp: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost: number
  department_id?: string
  department_name?: string
}

interface DailyStats {
  date: string
  total_tokens: number
  total_cost: number
  request_count: number
}

interface DepartmentStats {
  department_id: string
  department_name: string
  total_tokens: number
  total_cost: number
  request_count: number
  instance_count: number
}

export default function TokenAnalysisPage() {
  const { getToken, user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<TokenUsage[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [showDepartmentView, setShowDepartmentView] = useState(false)

  useEffect(() => {
    loadTokenData()
    loadDepartments()
  }, [selectedPeriod])

  async function loadDepartments() {
    try {
      const token = getToken() || ''
      const list = await deptApi.listDepartments(token)
      setDepartments(list)
    } catch (error) {
      console.error('加载部门失败:', error)
    }
  }

  async function loadTokenData() {
    try {
      setLoading(true)
      const token = getToken() || ''
      const today = new Date().toISOString().split('T')[0]
      
      // 调用后端 API（支持部门数据隔离）
      const stats = await invoke<any>('get_token_stats', { 
        token,
        startDate: today,
        endDate: today
      })
      
      // 模拟数据（包含部门信息）
      const mockUsage: TokenUsage[] = [
        {
          id: '1',
          instance_id: 'inst-001',
          instance_name: '客服机器人',
          timestamp: '2026-03-10 23:00:00',
          model: 'gpt-4',
          prompt_tokens: 1200,
          completion_tokens: 800,
          total_tokens: 2000,
          cost: 0.06,
          department_id: 'dept-001',
          department_name: '客服部',
        },
        {
          id: '2',
          instance_id: 'inst-002',
          instance_name: '数据分析助手',
          timestamp: '2026-03-10 22:00:00',
          model: 'gpt-3.5-turbo',
          prompt_tokens: 500,
          completion_tokens: 300,
          total_tokens: 800,
          cost: 0.002,
          department_id: 'dept-002',
          department_name: '技术部',
        },
        {
          id: '3',
          instance_id: 'inst-003',
          instance_name: '销售助手',
          timestamp: '2026-03-10 21:00:00',
          model: 'gpt-4',
          prompt_tokens: 800,
          completion_tokens: 600,
          total_tokens: 1400,
          cost: 0.042,
          department_id: 'dept-003',
          department_name: '销售部',
        },
      ]
      setUsage(mockUsage)
      
      // 模拟每日统计
      const mockDaily: DailyStats[] = [
        { date: '03-10', total_tokens: 15000, total_cost: 0.45, request_count: 120 },
        { date: '03-09', total_tokens: 18000, total_cost: 0.54, request_count: 150 },
        { date: '03-08', total_tokens: 12000, total_cost: 0.36, request_count: 100 },
        { date: '03-07', total_tokens: 20000, total_cost: 0.60, request_count: 180 },
        { date: '03-06', total_tokens: 16000, total_cost: 0.48, request_count: 130 },
        { date: '03-05', total_tokens: 14000, total_cost: 0.42, request_count: 110 },
        { date: '03-04', total_tokens: 17000, total_cost: 0.51, request_count: 140 },
      ]
      setDailyStats(mockDaily)
      
      // 计算部门统计
      const deptMap = new Map<string, DepartmentStats>()
      mockUsage.forEach(record => {
        if (!record.department_id || !record.department_name) return
        const existing = deptMap.get(record.department_id) || {
          department_id: record.department_id,
          department_name: record.department_name,
          total_tokens: 0,
          total_cost: 0,
          request_count: 0,
          instance_count: 0
        }
        existing.total_tokens += record.total_tokens
        existing.total_cost += record.cost
        existing.request_count += 1
        existing.instance_count = new Set(mockUsage
          .filter(u => u.department_id === record.department_id)
          .map(u => u.instance_id)
        ).size
        deptMap.set(record.department_id, existing)
      })
      setDepartmentStats(Array.from(deptMap.values()))
    } catch (error) {
      console.error('加载 Token 数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  function getTotalCost() {
    return dailyStats.reduce((sum, day) => sum + day.total_cost, 0).toFixed(2)
  }

  function getTotalTokens() {
    return dailyStats.reduce((sum, day) => sum + day.total_tokens, 0).toLocaleString()
  }

  function getTotalRequests() {
    return dailyStats.reduce((sum, day) => sum + day.request_count, 0).toLocaleString()
  }

  function getModelIcon(model: string) {
    if (model.includes('gpt-4')) return '🔷'
    if (model.includes('gpt-3.5')) return '🔹'
    if (model.includes('claude')) return '🟣'
    return '⚪'
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Token 分析</h1>
          <p className="text-gray-600 mt-1">
            查看各实例的 Token 使用情况和成本分析
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedPeriod('7d')}
            className={`px-4 py-2 rounded ${
              selectedPeriod === '7d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            7 天
          </button>
          <button
            onClick={() => setSelectedPeriod('30d')}
            className={`px-4 py-2 rounded ${
              selectedPeriod === '30d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            30 天
          </button>
          <button
            onClick={() => setSelectedPeriod('90d')}
            className={`px-4 py-2 rounded ${
              selectedPeriod === '90d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            90 天
          </button>
        </div>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">💰 总成本</h3>
          <p className="text-3xl font-bold text-green-600">${getTotalCost()}</p>
          <p className="text-sm text-gray-500 mt-2">过去 {selectedPeriod === '7d' ? '7' : selectedPeriod === '30d' ? '30' : '90'} 天</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">🔢 Token 总量</h3>
          <p className="text-3xl font-bold text-blue-600">{getTotalTokens()}</p>
          <p className="text-sm text-gray-500 mt-2">Tokens</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">📊 请求次数</h3>
          <p className="text-3xl font-bold text-purple-600">{getTotalRequests()}</p>
          <p className="text-sm text-gray-500 mt-2">Requests</p>
        </div>
      </div>

      {/* 部门统计视图切换 */}
      {departments.length > 1 && (
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">📊 统计维度</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDepartmentView(false)}
              className={`px-4 py-2 rounded ${
                !showDepartmentView
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              按时间
            </button>
            <button
              onClick={() => setShowDepartmentView(true)}
              className={`px-4 py-2 rounded ${
                showDepartmentView
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              按部门
            </button>
          </div>
        </div>
      )}

      {/* 部门统计 */}
      {showDepartmentView && departmentStats.length > 0 && (
        <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-4">🏢 部门成本统计</h3>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700">部门</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">实例数</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">请求数</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">Token 总量</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">总成本</th>
                <th className="px-6 py-3 text-right font-medium text-gray-700">占比</th>
              </tr>
            </thead>
            <tbody>
              {departmentStats.map((dept) => {
                const totalCost = departmentStats.reduce((sum, d) => sum + d.total_cost, 0)
                const percentage = totalCost > 0 ? ((dept.total_cost / totalCost) * 100).toFixed(1) : 0
                return (
                  <tr key={dept.department_id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{dept.department_name}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{dept.instance_count}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{dept.request_count}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{dept.total_tokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-green-600 font-medium">${dept.total_cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 每日趋势 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-4">📈 每日趋势</h3>
        <div className="space-y-3">
          {dailyStats.map((day) => (
            <div key={day.date} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="w-24 font-medium">{day.date}</div>
              <div className="flex-1 mx-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{day.request_count} 次请求</span>
                  <span className="text-gray-600">${day.total_cost.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(day.total_tokens / 20000) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{day.total_tokens.toLocaleString()} tokens</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 详细记录 */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">📝 使用记录</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">时间</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">实例</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">模型</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">Prompt</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">Completion</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">总计</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">成本</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((record) => (
              <tr key={record.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{record.timestamp}</td>
                <td className="px-6 py-4 font-medium">{record.instance_name}</td>
                <td className="px-6 py-4">
                  <span className="text-sm">
                    {getModelIcon(record.model)} {record.model}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-gray-600">{record.prompt_tokens.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-gray-600">{record.completion_tokens.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-medium">{record.total_tokens.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-green-600 font-medium">${record.cost.toFixed(3)}</td>
              </tr>
            ))}
            {usage.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  暂无使用记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-800">
          💡 提示：Token 分析页面展示各实例的详细使用情况和成本趋势。部门管理员只能查看本部门数据，普通员工只能查看自己的数据。
        </p>
      </div>
    </div>
  )
}
