import { useState, useEffect } from 'react'
import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageContainer } from '../../components/ui/PageContainer'
import { skillsAPI } from '@/services/api'

interface SkillStat {
  skill_id: string
  skill_name: string
  call_count: number
  total_tokens: number
}

export default function SkillStatsPage() {
  const { t, language } = useLanguageStore()
  const { user, getToken } = useAuthStore()
  const [leaderboard, setLeaderboard] = useState<SkillStat[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  const fetchLeaderboard = async () => {
    try {
      const response = await skillsAPI.getSkillLeaderboard()
      const stats = Array.isArray(response) ? response : []
      setLeaderboard(stats)
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [timeRange])

  const isZh = language === 'zh'

  const rangeMap: Record<string, string> = {
    '24h': isZh ? '24小时' : '24 Hours',
    '7d': isZh ? '最近7天' : 'Last 7 Days',
    '30d': isZh ? '最近30天' : 'Last 30 Days',
  }

  if (loading) {
    return (
      <PageContainer title="Skill统计" description="Skill usage statistics and leaderboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="Skill统计" description="Skill usage statistics and leaderboard">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '总调用次数' : 'Total Invocations'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">
                {leaderboard.reduce((sum, s) => sum + s.call_count, 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '总Tokens消耗' : 'Total Tokens'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-info" />
              <span className="text-2xl font-bold">
                {leaderboard.reduce((sum, s) => sum + s.total_tokens, 0).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '活跃Skills' : 'Active Skills'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold">
                {leaderboard.filter(s => s.call_count > 0).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '统计范围' : 'Time Range'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className="p-2 border rounded text-sm w-full bg-transparent"
            >
              {Object.entries(rangeMap).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {isZh ? '调用排行榜' : 'Invocation Leaderboard'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{isZh ? '按调用次数排序' : 'Sorted by invocation count'}</span>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {isZh ? '暂无调用数据' : 'No invocation data available'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {isZh ? '排名' : 'Rank'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {isZh ? 'Skill名称' : 'Skill Name'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {isZh ? '调用次数' : 'Calls'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {isZh ? '总Tokens' : 'Total Tokens'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaderboard.map((stat, index) => (
                    <tr key={stat.skill_id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{stat.skill_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {isZh ? 'ID:' : 'ID:'} {stat.skill_id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-primary">{stat.call_count}</div>
                        <div className="text-xs text-success">
                          {isZh ? '次数' : 'calls'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-muted-foreground">
                          {stat.total_tokens.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isZh ? 'tokens' : 'tokens'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Skills Grid */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {leaderboard.slice(0, 3).map((stat, index) => (
            <Card key={stat.skill_id} variant="premium">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    #{index + 1} {stat.skill_name}
                  </CardTitle>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {index + 1}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">{isZh ? '调用次数' : 'Calls'}</span>
                    <span className="font-bold text-primary">{stat.call_count}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">{isZh ? '总Tokens' : 'Total Tokens'}</span>
                    <span className="font-bold">{stat.total_tokens.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
