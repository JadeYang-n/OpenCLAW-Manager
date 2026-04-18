import { useState, useEffect } from 'react'
import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import { Shield, Check, X, AlertCircle, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '../../components/ui/PageContainer'
import { skillsAPI } from '@/services/api'

interface ReviewSkill {
  id: string
  name: string
  description?: string
  version: string
  author: string
  category: string
  status: string
  auto_review_risk_level?: string
  created_at: string
}

interface ReviewResult {
  skill_id: string
  result: string
  comments?: string
}

export default function SkillReviewPage() {
  const { t, language } = useLanguageStore()
  const { user, getToken } = useAuthStore()
  const [pendingSkills, setPendingSkills] = useState<ReviewSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [comments, setComments] = useState<string>('')

  const fetchPendingSkills = async () => {
    try {
      // Try skill-reviews endpoint first
      let response
      try {
        response = await skillsAPI.getReviewPendingList()
      } catch {
        // Fallback to skills/pending if available
        response = await skillsAPI.getPendingSkills()
      }
      
      const skills = Array.isArray(response) ? response : []
      setPendingSkills(skills)
    } catch (error) {
      console.error('Failed to fetch pending skills:', error)
      setPendingSkills([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingSkills()
  }, [])

  const handleApprove = async (skillId: string) => {
    if (!confirm(t('common.confirmApprove') || '确认批准此Skill吗？')) return
    
    try {
      await skillsAPI.executeReview({
        skill_id: skillId,
        result: 'approved',
        comments: comments || undefined,
      })
      await fetchPendingSkills()
      setComments('')
      alert('Success:' + t('common.success'))
    } catch (error) {
      console.error('Failed to approve skill:', error)
      
      // Fallback to direct approve endpoint
      try {
        await skillsAPI.approveSkill(skillId)
        await fetchPendingSkills()
        alert('Success:' + t('common.success'))
      } catch (err) {
        alert('Error:' + t('common.error') + ': ' + err)
      }
    }
  }

  const handleReject = async (skillId: string) => {
    if (!confirm(t('common.confirmReject') || '确认拒绝此Skill吗？')) return
    
    try {
      await skillsAPI.executeReview({
        skill_id: skillId,
        result: 'rejected',
        comments: comments || undefined,
      })
      await fetchPendingSkills()
      setComments('')
      alert('Success:' + t('common.success'))
    } catch (error) {
      console.error('Failed to reject skill:', error)
      
      // Fallback to direct reject endpoint
      try {
        await skillsAPI.rejectSkill(skillId)
        await fetchPendingSkills()
        alert('Success:' + t('common.success'))
      } catch (err) {
        alert('Error:' + t('common.error') + ': ' + err)
      }
    }
  }

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null
    
    const isZh = language === 'zh'
    const badgeMap: Record<string, { color: string; text: string }> = {
      low: { color: 'bg-green-100 text-green-800', text: isZh ? '低风险' : 'Low Risk' },
      medium: { color: 'bg-yellow-100 text-yellow-800', text: isZh ? '中风险' : 'Medium Risk' },
      high: { color: 'bg-red-100 text-red-800', text: isZh ? '高风险' : 'High Risk' },
    }
    
    const badge = badgeMap[riskLevel.toLowerCase()] || badgeMap.low
    return (
      <Badge className={badge.color}>
        {badge.text}
      </Badge>
    )
  }

  const isZh = language === 'zh'

  if (loading) {
    return (
      <PageContainer title="Skill审核" description="Review and approve Skills">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="Skill审核" description="Review and approve Skills">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '待审核' : 'Pending Review'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <span className="text-2xl font-bold">{pendingSkills.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '今日审核' : 'Reviews Today'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-info" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '审核通过率' : 'Approval Rate'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold">100%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Skills */}
      <div className="space-y-4">
        {pendingSkills.map(skill => (
          <Card key={skill.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{skill.name}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary">
                      v{skill.version}
                    </Badge>
                    <Badge variant="secondary" className="text-muted-foreground">
                      {skill.author}
                    </Badge>
                    {skill.category && (
                      <Badge variant="secondary" className="text-primary">
                        {skill.category}
                      </Badge>
                    )}
                    {getRiskBadge(skill.auto_review_risk_level)}
                  </div>
                </div>
                <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded">
                  {isZh ? '待审核' : 'Pending'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {skill.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {skill.description}
                </p>
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isZh ? '审核意见(可选)' : 'Review Comments (Optional)'}
                  </label>
                  <textarea
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    rows={2}
                    className="w-full p-2 border rounded text-sm"
                    placeholder={isZh ? '输入审核意见...' : 'Enter review comments...'}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(skill.id)}
                    variant="success"
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {isZh ? '批准' : 'Approve'}
                  </Button>
                  <Button
                    onClick={() => handleReject(skill.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {isZh ? '拒绝' : 'Reject'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingSkills.length === 0 && (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {isZh ? '暂无待审核的Skill' : 'No Skills pending review'}
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
