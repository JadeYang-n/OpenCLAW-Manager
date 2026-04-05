import React, { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'
import { PageContainer } from '@/components/ui/PageContainer'
import { useMonitorStore } from '../../stores/monitorStore'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const MonitorPage: React.FC = () => {
  const { stats, refreshStats, tokenHistory, budgetLimit } = useMonitorStore()
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
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
  }, [refreshStats])

  useEffect(() => {
    loadData()
  }, [loadData])

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
    <PageContainer
      title="Token 监控"
      description="实时监控Token消耗和预算使用情况"
    >
      {/* 错误提示 */}
      {error && (
        <Card variant="premium" className="mb-6 border-error bg-error/5">
          <CardContent className="p-4">
            <p className="text-error font-medium">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card variant="premium">
          <CardHeader>
            <CardTitle className="text-sm">今日消耗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-primary">{formatTokens(stats.dailyTokens)}</p>
              <p className="text-sm text-muted-foreground">{formatCost(stats.dailyCost)}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader>
            <CardTitle className="text-sm">本月累计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-primary">{formatTokens(stats.monthlyTokens)}</p>
              <p className="text-sm text-muted-foreground">{formatCost(stats.monthlyCost)}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader>
            <CardTitle className="text-sm">预算剩余</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-primary">{formatCost(budgetLimit - stats.monthlyCost)}</p>
              <p className="text-sm text-muted-foreground">月度预算: {formatCost(budgetLimit)}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader>
            <CardTitle className="text-sm">告警状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-success">正常</p>
              <p className="text-sm text-muted-foreground">无预警</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card variant="premium">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">日消耗趋势</CardTitle>
              <Button size="sm" onClick={loadData} disabled={loading}>
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {loading ? '刷新中...' : '刷新'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tokens" fill="#8884d8" name="Tokens" />
                  <Bar yAxisId="right" dataKey="cost" fill="#82ca9d" name="Cost ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader>
            <CardTitle className="text-lg">模型分布</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细列表 */}
      <Card variant="premium">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">详细记录</CardTitle>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">所有模型</option>
                {modelOptions.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                导出 CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">时间</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">模型</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Prompt Tokens</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Completion Tokens</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">总 Tokens</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">成本</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item, index) => (
                    <tr key={index} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-foreground">{item.timestamp}</td>
                      <td className="py-3 px-4 text-foreground">{item.model}</td>
                      <td className="py-3 px-4 text-foreground">{item.promptTokens}</td>
                      <td className="py-3 px-4 text-foreground">{item.completionTokens}</td>
                      <td className="py-3 px-4 text-foreground">{item.totalTokens}</td>
                      <td className="py-3 px-4 text-foreground">{formatCost(item.cost)}</td>
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
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default MonitorPage
