import React, { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useMonitorStore } from '../../stores/monitorStore'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const MonitorPage: React.FC = () => {
  const { stats, refreshStats, tokenHistory, budgetLimit } = useMonitorStore()
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      await refreshStats()
    } catch (err) {
      setError('数据加载失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatTokens = (tokens: number) => {
    return tokens.toLocaleString()
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`
  }

  const filteredHistory = tokenHistory.filter(item => {
    if (filter === 'all') return true
    return item.model === filter
  })

  const modelOptions = Array.from(new Set(tokenHistory.map(item => item.model)))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Token 监控</h1>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">今日消耗</h3>
          <p className="text-2xl font-bold">{formatTokens(stats.dailyTokens)}</p>
          <p className="text-sm text-muted-foreground">{formatCost(stats.dailyCost)}</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">本月累计</h3>
          <p className="text-2xl font-bold">{formatTokens(stats.monthlyTokens)}</p>
          <p className="text-sm text-muted-foreground">{formatCost(stats.monthlyCost)}</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">预算剩余</h3>
          <p className="text-2xl font-bold">{formatCost(budgetLimit - stats.monthlyCost)}</p>
          <p className="text-sm text-muted-foreground">月度预算: {formatCost(budgetLimit)}</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">告警状态</h3>
          <p className="text-2xl font-bold text-green-500">正常</p>
          <p className="text-sm text-muted-foreground">无预警</p>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">日消耗趋势</h3>
            <button 
              className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? '刷新中...' : '刷新'}
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="tokens" fill="#8884d8" name="Tokens" />
                <Bar yAxisId="right" dataKey="cost" fill="#82ca9d" name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">模型分布</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.modelDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.modelDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 详细列表 */}
      <div className="bg-card p-6 rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">详细记录</h3>
          <div className="flex gap-2">
            <select 
              className="px-3 py-2 border rounded-md"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">所有模型</option>
              {modelOptions.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <button className="px-4 py-2 border rounded-md hover:bg-muted transition-colors">
              导出 CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">时间</th>
                <th className="text-left py-3 px-4">模型</th>
                <th className="text-left py-3 px-4">Prompt Tokens</th>
                <th className="text-left py-3 px-4">Completion Tokens</th>
                <th className="text-left py-3 px-4">总 Tokens</th>
                <th className="text-left py-3 px-4">成本</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-muted">
                    <td className="py-3 px-4">{item.timestamp}</td>
                    <td className="py-3 px-4">{item.model}</td>
                    <td className="py-3 px-4">{item.promptTokens}</td>
                    <td className="py-3 px-4">{item.completionTokens}</td>
                    <td className="py-3 px-4">{item.totalTokens}</td>
                    <td className="py-3 px-4">{formatCost(item.cost)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    暂无记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MonitorPage