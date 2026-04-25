import { useState, useEffect } from 'react'
import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import { Shield, Check, X, AlertCircle, Clock, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
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
  auto_review_passed?: boolean
  created_at: string
}

interface AuditRecord {
  id: string
  skill_id: string
  skill_name: string
  submitter_id: string
  action: string
  risk_level?: string
  risk_details?: string
  reviewer_id?: string
  decision?: string
  reason?: string
  reviewed_at?: string
  created_at: string
}

export default function SkillReviewPage() {
  const { t, language } = useLanguageStore()
  const { user, getToken } = useAuthStore()
  const [pendingSkills, setPendingSkills] = useState<ReviewSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reason, setReason] = useState<string>('')
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})
  const [auditHistories, setAuditHistories] = useState<Record<string, AuditRecord[]>>({})

  const fetchPendingSkills = async () => {
    try {
      const response = await skillsAPI.getPendingReviewList()
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
    if (!reason.trim()) {
      alert('请填写审批理由')
      return
    }
    if (!confirm('确认批准此Skill吗？')) return

    try {
      await skillsAPI.approveSkill(skillId, reason)
      setReason('')
      await fetchPendingSkills()
      // Clear audit history cache
      delete auditHistories[skillId]
      setAuditHistories({ ...auditHistories })
      alert('审批通过')
    } catch (error) {
      console.error('Failed to approve skill:', error)
      alert('审批失败: ' + error)
    }
  }

  const handleReject = async (skillId: string) => {
    if (!reason.trim()) {
      alert('请填写拒绝理由')
      return
    }
    if (!confirm('确认拒绝此Skill吗？')) return

    try {
      await skillsAPI.rejectSkill(skillId, reason)
      setReason('')
      await fetchPendingSkills()
      delete auditHistories[skillId]
      setAuditHistories({ ...auditHistories })
      alert('已拒绝')
    } catch (error) {
      console.error('Failed to reject skill:', error)
      alert('拒绝失败: ' + error)
    }
  }

  const toggleHistory = async (skillId: string) => {
    const newExpanded = !expandedHistory[skillId]
    setExpandedHistory({ ...expandedHistory, [skillId]: newExpanded })

    if (newExpanded && !auditHistories[skillId]) {
      try {
        const response = await skillsAPI.getReviewHistory(skillId)
        const records = Array.isArray(response) ? response : (response?.data || [])
        setAuditHistories({ ...auditHistories, [skillId]: records })
      } catch (error) {
        console.error('Failed to fetch audit history:', error)
        setAuditHistories({ ...auditHistories, [skillId]: [] })
      }
    }
  }

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null

    const isZh = language === 'zh'
    const badgeMap: Record<string, { color: string; text: string; icon?: string }> = {
      low: { color: 'bg-green-100 text-green-800', text: isZh ? '低风险' : 'Low Risk' },
      medium: { color: 'bg-yellow-100 text-yellow-800', text: isZh ? '中风险' : 'Medium Risk' },
      high: { color: 'bg-orange-100 text-orange-800', text: isZh ? '高风险' : 'High Risk' },
      critical: { color: 'bg-red-100 text-red-800', text: isZh ? '严重风险' : 'Critical Risk' },
    }

    const badge = badgeMap[riskLevel.toLowerCase()] || badgeMap.low
    return (
      <Badge className={badge.color}>
        {badge.text}
      </Badge>
    )
  }

  const getActionBadge = (action: string) => {
    const isZh = language === 'zh'
    const actionMap: Record<string, { text: string; color: string }> = {
      auto_pass: { text: isZh ? '自动通过' : 'Auto Pass', color: 'bg-green-100 text-green-800' },
      auto_flag: { text: isZh ? '自动标记' : 'Auto Flag', color: 'bg-yellow-100 text-yellow-800' },
      human_approve: { text: isZh ? '人工批准' : 'Human Approve', color: 'bg-blue-100 text-blue-800' },
      human_reject: { text: isZh ? '人工拒绝' : 'Human Reject', color: 'bg-red-100 text-red-800' },
      human_request_mod: { text: isZh ? '请求修改' : 'Request Mod', color: 'bg-orange-100 text-orange-800' },
    }
    const badge = actionMap[action] || { text: action, color: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={badge.color}>{badge.text}</Badge>
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
    <PageContainer title={isZh ? 'Skill审核' : 'Skill Review'} description={isZh ? '审核和管理提交的Skill' : 'Review and approve Skills'}>
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

      {/* Global Reason Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">{isZh ? '审批意见' : 'Review Comments'}</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="w-full p-3 border rounded text-sm"
            placeholder={isZh ? '输入审批理由（必填）...' : 'Enter review reason (required)...'}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {isZh ? '批准或拒绝时需要填写审批理由' : 'Approval or rejection reason is required'}
          </p>
        </CardContent>
      </Card>

      {/* Pending Skills */}
      <div className="space-y-4">
        {pendingSkills.map(skill => {
          const riskDetails = skill.auto_review_passed === false
            ? { risk_level: skill.auto_review_risk_level }
            : null

          return (
            <Card key={skill.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleHistory(skill.id)}
                        className="flex items-center gap-1 hover:opacity-70"
                      >
                        {expandedHistory[skill.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <CardTitle className="text-lg">{skill.name}</CardTitle>
                    </div>
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
                      {skill.auto_review_passed === false && (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {isZh ? '自动审核发现风险' : 'Auto-review flagged risks'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    {isZh ? '待人工审核' : 'Pending Manual Review'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Auto-review risk details */}
                {riskDetails && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        {isZh ? '自动审核风险详情' : 'Auto-review Risk Details'}
                      </span>
                    </div>
                    <div className="text-sm text-yellow-700">
                      {isZh ? `风险等级：${skill.auto_review_risk_level}` : `Risk level: ${skill.auto_review_risk_level}`}
                    </div>
                  </div>
                )}

                {skill.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {skill.description}
                  </p>
                )}

                {/* Audit History */}
                {expandedHistory[skill.id] && auditHistories[skill.id] && (
                  <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
                    <h4 className="text-sm font-medium mb-2">
                      {isZh ? '审核轨迹' : 'Review Audit Trail'}
                    </h4>
                    <div className="space-y-2">
                      {auditHistories[skill.id].map((record: AuditRecord) => (
                        <div key={record.id} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground whitespace-nowrap">
                            {new Date(record.created_at).toLocaleString()}
                          </span>
                          {getActionBadge(record.action)}
                          <span className="flex-1">
                            {record.action === 'auto_flag' && (
                              <span className="text-yellow-700">
                                {isZh ? '自动审核发现风险' : 'Auto-review flagged risks'}
                              </span>
                            )}
                            {record.action === 'auto_pass' && (
                              <span className="text-green-700">
                                {isZh ? '自动审核通过' : 'Auto-review passed'}
                              </span>
                            )}
                            {record.action === 'human_approve' && (
                              <span className="text-blue-700">
                                {isZh ? `${record.reviewer_id} 批准` : `${record.reviewer_id} approved`}
                                {record.reason && `: ${record.reason}`}
                              </span>
                            )}
                            {record.action === 'human_reject' && (
                              <span className="text-red-700">
                                {isZh ? `${record.reviewer_id} 拒绝` : `${record.reviewer_id} rejected`}
                                {record.reason && `: ${record.reason}`}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
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
              </CardContent>
            </Card>
          )
        })}

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
