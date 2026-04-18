import React, { useEffect, useState } from 'react'
import { notificationsAPI } from '../../services/api'
import PageContainer from '../../components/PageContainer'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  content: string
  link?: string
  related_id?: string
  is_read: boolean
  read_at?: string
  created_at: string
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const response: any = await notificationsAPI.getNotifications()
      if (response.success && response.data) {
        setNotifications(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response: any = await notificationsAPI.getUnreadCount()
      if (response.success && response.data) {
        setUnreadCount(response.data.count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id)
      fetchNotifications()
      fetchUnreadCount()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      fetchNotifications()
      fetchUnreadCount()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN')
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'feedback':
        return '💬'
      case 'rating':
        return '⭐'
      case 'system':
        return '🔔'
      case 'audit':
        return '✅'
      default:
        return '📢'
    }
  }

  if (loading) {
    return (
      <PageContainer title="通知中心">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="通知中心">
      <div className="p-6">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">通知列表</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                您有 <span className="text-blue-600 font-medium">{unreadCount}</span> 条未读通知
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              全部标记已读
            </button>
          )}
        </div>

        {/* 通知列表 */}
        {notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-4xl mb-4">🔔</div>
            <p className="text-gray-500">暂无通知</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.is_read
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-medium ${
                        notification.is_read ? 'text-gray-900' : 'text-blue-900'
                      }`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {notification.content}
                    </p>
                    <div className="flex items-center gap-4">
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          查看详情 →
                        </a>
                      )}
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          标记已读
                        </button>
                      )}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}

export default NotificationsPage
