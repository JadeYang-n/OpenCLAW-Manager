import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import * as deptApi from '../departments/api'
import type { Department } from '../departments/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, Clock, Filter, Download, BarChart3, PieChart, BarChart2, Calendar, Users, History } from 'lucide-react'

interface TokenUsage {
  id: string
  instance_id: string
  instance_name: string
  reported_at: string
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

// Recharts imports for charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

// Color palette for charts
const CHART_COLORS = {
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  gray: '#6b7280',
  amber: '#f59e0b',
  indigo: '#6366f1',
  emerald: '#10b981',
  sky: '#0ea5e9'
}

export default function TokenAnalysisPage() {
  const { getToken } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<TokenUsage[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [showDepartmentView, setShowDepartmentView] = useState(false)

  const loadDepartments = useCallback(async () => {
    try {
      const token = getToken() || ''
      const list = await deptApi.listDepartments(token)
      setDepartments(list)
    } catch (error) {
      console.error('加载部门失败:', error)
    }
  }, [getToken])

  const loadTokenData = useCallback(async () => {
    try {
      setLoading(true)
      
      // 调用后端API获取Token usage数据
      const token = localStorage.getItem('auth_token')
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
      const response = await fetch(`${API_BASE_URL}/gateway/token/usage`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch token usage: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setUsage(data.data || [])
        
        // 从实际数据计算每日统计
        const dailyStatsMap = new Map<string, DailyStats>()
        const deptStatsMap = new Map<string, DepartmentStats>()
        
        ;(data.data || []).forEach((record: any) => {
          // 提取日期（从 "2026-03-10 23:00:00" 提取 "03-10"）
          const dateKey = (record.reported_at || record.timestamp).split(' ')[0].replace(/-/g, '-').substr(5)
          const existingDaily = dailyStatsMap.get(dateKey) || {
            date: dateKey,
            total_tokens: 0,
            total_cost: 0,
            request_count: 0
          }
          existingDaily.total_tokens += record.total_tokens
          existingDaily.total_cost += record.cost
          existingDaily.request_count += 1
          dailyStatsMap.set(dateKey, existingDaily)

          // 计算部门统计
          if (record.department_id && record.department_name) {
            const existingDept = deptStatsMap.get(record.department_id) || {
              department_id: record.department_id,
              department_name: record.department_name,
              total_tokens: 0,
              total_cost: 0,
              request_count: 0,
              instance_count: 0
            }
            existingDept.total_tokens += record.total_tokens
            existingDept.total_cost += record.cost
            existingDept.request_count += 1
            if (existingDept.instance_count === undefined || existingDept.instance_count === 0) {
              existingDept.instance_count = new Set([record.instance_id]).size
            }
            deptStatsMap.set(record.department_id, existingDept)
          }
        })

        // 转换为数组并按日期排序（最新的在前）
        const sortedDaily = Array.from(dailyStatsMap.values())
          .sort((a, b) => b.date.localeCompare(a.date))
        setDailyStats(sortedDaily)

        // 转换部门统计为数组
        setDepartmentStats(Array.from(deptStatsMap.values()))
      }
    } catch (error) {
      console.error('加载 Token 数据失败:', error)
      setUsage([])
      setDailyStats([])
      setDepartmentStats([])
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadTokenData()
    loadDepartments()
  }, [loadTokenData, loadDepartments])

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
    if (model.includes('gpt-4')) return 'GPT-4'
    if (model.includes('gpt-3.5')) return 'GPT-3.5'
    if (model.includes('claude')) return 'Claude'
    return model
  }

  // Export data function
  const exportData = () => {
    // 实现CSV导出功能
  }

  // Load data function
  const loadData = () => {
    loadTokenData()
    loadDepartments()
  }

  if (loading) {
    return <div className="p-6">加载中..</div>
  }

  // Prepare chart data for daily trends
  const chartData = dailyStats.slice(0, 7).map(day => ({
    name: day.date,
    request_count: day.request_count,
    total_cost: parseFloat(day.total_cost.toFixed(2)),
    total_tokens: day.total_tokens
  }))

  // Prepare pie chart data for department distribution
  const pieChartData = departmentStats.map(dept => ({
    name: dept.department_name,
    value: dept.total_cost,
    tokens: dept.total_tokens
  }))

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Token 分析</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看各实例的 Token 使用情况和成本分析
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selection */}
          <div className="flex rounded-md shadow-sm mb-2 md:mb-0">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <Button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                className={selectedPeriod === period ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              >
                {period === '7d' ? '7 天' : period === '30d' ? '30 天' : '90 天'}
              </Button>
            ))}
          </div>
          
          {/* Action Buttons */}
          <Button variant="outline" onClick={loadData}>
            <Filter className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            导出CSV
          </Button>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              <DollarSign className="inline-block w-4 h-4 mr-1" /> 总成本
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ¥{getTotalCost()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              过去 {selectedPeriod === '7d' ? '7' : selectedPeriod === '30d' ? '30' : '90'} 天
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              <BarChart2 className="inline-block w-4 h-4 mr-1" /> Token 总量
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {getTotalTokens()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              <TrendingUp className="inline-block w-4 h-4 mr-1" /> 请求次数
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {getTotalRequests()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department View Toggle */}
      {departments.length > 1 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground"><Filter className="inline-block w-5 h-5 mr-2" /> 统计维度</h2>
              <div className="flex rounded-md shadow-sm">
                <Button
                  onClick={() => setShowDepartmentView(false)}
                  variant={!showDepartmentView ? 'default' : 'outline'}
                  className={!showDepartmentView ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                >
                  按时间
                </Button>
                <Button
                  onClick={() => setShowDepartmentView(true)}
                  variant={showDepartmentView ? 'default' : 'outline'}
                  className={showDepartmentView ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                >
                  按部门
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department Statistics View */}
      {showDepartmentView && departmentStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              <PieChart className="inline-block w-5 h-5 mr-2" /> 部门成本统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pieChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS.blue} name="成本" />
                  <Bar dataKey="tokens" fill={CHART_COLORS.green} name="token总量" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-foreground">部门</th>
                  <th className="px-6 py-3 text-right font-medium text-foreground">实例数</th>
                  <th className="px-6 py-3 text-right font-medium text-foreground">请求次数</th>
                  <th className="px-6 py-3 text-right font-medium text-foreground">Token 总量</th>
                  <th className="px-6 py-3 text-right font-medium text-foreground">成本</th>
                  <th className="px-6 py-3 text-right font-medium text-foreground">占比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {departmentStats.map((dept) => {
                  const totalCost = departmentStats.reduce((sum, d) => sum + d.total_cost, 0)
                  const percentage = totalCost > 0 ? ((dept.total_cost / totalCost) * 100).toFixed(1) : 0
                  return (
                    <tr key={dept.department_id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{dept.department_name}</td>
                      <td className="px-6 py-4 text-right text-foreground">{dept.instance_count}</td>
                      <td className="px-6 py-4 text-right text-foreground">{dept.request_count}</td>
                      <td className="px-6 py-4 text-right text-foreground">{dept.total_tokens.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-success font-medium">${dept.total_cost.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-foreground">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Daily Trends View */}
      {!showDepartmentView && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              <BarChart3 className="inline-block w-5 h-5 mr-2" /> 每日趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    label={{ value: '日期', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    label={{ value: '数量/美元', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="request_count" 
                    name="请求次数"
                    stroke={CHART_COLORS.blue} 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_cost" 
                    name="成本"
                    stroke={CHART_COLORS.green} 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_tokens" 
                    name="token总量"
                    stroke={CHART_COLORS.purple} 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {dailyStats.map((day) => (
                <div key={day.date} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded transition-colors">
                  <div className="w-24 font-medium text-foreground">{day.date}</div>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground">{day.request_count} 次请求</span>
                      <span className="text-success font-medium">${day.total_cost.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((day.total_tokens / 20000) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{day.total_tokens.toLocaleString()} tokens</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Usage Records */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-semibold text-foreground">
              <History className="inline-block w-5 h-5 mr-2" /> 使用记录
            </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-foreground">时间</th>
                <th className="px-6 py-3 text-left font-medium text-foreground">实例</th>
                <th className="px-6 py-3 text-left font-medium text-foreground">模型</th>
                <th className="px-6 py-3 text-right font-medium text-foreground">Prompt</th>
                <th className="px-6 py-3 text-right font-medium text-foreground">Completion</th>
                <th className="px-6 py-3 text-right font-medium text-foreground">总计</th>
                <th className="px-6 py-3 text-right font-medium text-foreground">成本</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {usage.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 text-sm text-foreground">{record.reported_at || record.timestamp}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{record.instance_name}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm">
                      {getModelIcon(record.model)} {record.model}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-foreground">{record.prompt_tokens.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-foreground">{record.completion_tokens.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-medium text-foreground">{record.total_tokens.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-success font-medium">
                    ¥{record.cost.toFixed(4)}
                  </td>
                </tr>
              ))}
              {usage.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    暂无使用记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Informational Note */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">ℹ️ 提示：</span>
              Token 分析页面展示各实例的详细使用情况和成本花费。部门负责人只能查看本部门数据，普通员工只能查看自己的数据。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}