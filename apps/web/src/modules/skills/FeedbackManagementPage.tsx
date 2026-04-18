import React, { useEffect, useState } from 'react'
import { skillFeedbackAPI } from '../../services/api'
import PageContainer from '../../components/PageContainer'

interface SkillFeedback {
  id: string
  skill_id: string
  from_user_id: string
  to_user_id: string
  rating?: number
  comment: string
  contact_info?: string
  status: string
  read_at?: string
  reply_content?: string
  reply_at?: string
  created_at: string
  updated_at: string
}

type FilterType = 'all' | 'unread' | 'read' | 'replied'

const FeedbackManagementPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<SkillFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [replyModalOpen, setReplyModalOpen] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<SkillFeedback | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const fetchFeedbacks = async (type: 'received' | 'sent' = 'received') => {
    try {
      let response: any
      if (type === 'received') {
        response = await skillFeedbackAPI.getReceivedFeedbacks()
      } else {
        response = await skillFeedbackAPI.getSentFeedbacks()
      }
      if (response.success && response.data) {
        setFeedbacks(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await skillFeedbackAPI.markFeedbackAsRead(id)
      fetchFeedbacks()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleOpenReplyModal = (feedback: SkillFeedback) => {
    setSelectedFeedback(feedback)
    setReplyContent('')
    setReplyModalOpen(true)
  }

  const handleSubmitReply = async () => {
    if (!selectedFeedback || !replyContent.trim()) return
    
    try {
      await skillFeedbackAPI.replyFeedback(selectedFeedback.id, {
        reply_content: replyContent
      })
      setReplyModalOpen(false)
      setSelectedFeedback(null)
      setReplyContent('')
      fetchFeedbacks()
    } catch (error) {
      console.error('Failed to reply:', error)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (filter === 'all') return true
    return feedback.status === filter
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN')
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string, text: string }> = {
      unread: { color: 'bg-red-100 text-red-800', text: '未读' },
      read: { color: 'bg-yellow-100 text-yellow-800', text: '已读' },
      replied: { color: 'bg-green-100 text-green-800', text: '已回复' }
    }
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const renderStars = (rating?: number) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <PageContainer title="意见管理">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="意见管理">
      <div className="p-6">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">我收到的意见</h2>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
              {(['all', 'unread', 'read', 'replied'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f === 'all' && '全部'}
                  {f === 'unread' && '未读'}
                  {f === 'read' && '已读'}
                  {f === 'replied' && '已回复'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">收到总数</p>
            <p className="text-2xl font-bold text-gray-900">{feedbacks.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">未读</p>
            <p className="text-2xl font-bold text-red-600">
              {feedbacks.filter(f => f.status === 'unread').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">已回复</p>
            <p className="text-2xl font-bold text-green-600">
              {feedbacks.filter(f => f.status === 'replied').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">平均评分</p>
            <p className="text-2xl font-bold text-blue-600">
              {feedbacks.filter(f => f.rating).length > 0
                ? (feedbacks.filter(f => f.rating).reduce((sum, f) => sum + (f.rating || 0), 0) / 
                   feedbacks.filter(f => f.rating).length).toFixed(1)
                : '-'
              }
            </p>
          </div>
        </div>

        {/* 意见列表 */}
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-500">暂无意见</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(feedback.status)}
                      <span className="text-sm text-gray-500">
                        {formatDate(feedback.created_at)}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      来自用户: {feedback.from_user_id}
                    </h3>
                    {renderStars(feedback.rating)}
                  </div>
                  <div className="flex gap-2">
                    {feedback.status === 'unread' && (
                      <button
                        onClick={() => handleMarkAsRead(feedback.id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        标记已读
                      </button>
                    )}
                    {feedback.status !== 'replied' && (
                      <button
                        onClick={() => handleOpenReplyModal(feedback)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        回复
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{feedback.comment}</p>
                
                {feedback.contact_info && (
                  <p className="text-sm text-gray-500 mb-4">
                    联系方式: {feedback.contact_info}
                  </p>
                )}

                {feedback.reply_content && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">我的回复:</p>
                    <p className="text-gray-600">{feedback.reply_content}</p>
                    {feedback.reply_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(feedback.reply_at)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 回复弹窗 */}
        {replyModalOpen && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-4">回复意见</h3>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{selectedFeedback.comment}</p>
              </div>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="请输入回复内容..."
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 min-h-[120px]"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setReplyModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}

export default FeedbackManagementPage
