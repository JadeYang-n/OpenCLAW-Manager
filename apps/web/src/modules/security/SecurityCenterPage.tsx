import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { Shield, ShieldCheck, AlertTriangle, CheckCircle, XCircle, Lock, Key } from 'lucide-react'
import { PageContainer, PageCard } from '../../components/ui/PageContainer'

export default function SecurityCenterPage() {
  const { getToken } = useAuthStore()
  const [checking, setChecking] = useState(false)
  const [results, setResults] = useState<Record<string, unknown>[]>([])

  async function handleSecurityCheck() {
    setChecking(true)
    try {
      const token = getToken() || ''
      const result = await invoke<{ items: Record<string, unknown>[] }>('security_check', { token })
      setResults(result.items || [])
    } catch (error) {
      toast.error('❌ 安全检查失败：' + (error as string))
    } finally {
      setChecking(false)
    }
  }

  async function handleHardening() {
    if (!confirm('确定要执行一键加固吗？')) return
    
    try {
      const token = getToken() || ''
      await invoke('security_check', { token })
      toast.success('✅ 安全加固完成！')
    } catch (error) {
      toast.error('❌ 加固失败：' + (error as string))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'success'
      case 'warning': return 'warning'
      case 'danger': return 'danger'
      default: return 'secondary'
    }
  }

  const statusClasses = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/30',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30',
    danger: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/30',
    secondary: 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  }

  const statusIcons = {
    safe: CheckCircle,
    warning: AlertTriangle,
    danger: XCircle,
  }

  return (
    <PageContainer title="安全中心" description="系统安全检查和一键加固">
      {/* 安全体检 */}
      <PageCard 
        title="安全体检" 
        action={
          <button
            onClick={handleSecurityCheck}
            disabled={checking}
            className="btn btn-primary"
          >
            {checking ? '检测中...' : '开始检测'}
          </button>
        }
      >
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((item, idx) => {
              const status = item.status as string
              const statusColor = getStatusColor(status)
              const StatusIcon = statusIcons[statusColor as keyof typeof statusIcons] || Shield
              
              return (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                  style={{
                    backgroundColor: status === 'safe' ? '#f0fdf4' : 
                                    status === 'warning' ? '#fffbeb' : '#fef2f2',
                    borderColor: status === 'safe' ? '#bbf7d0' : 
                                  status === 'warning' ? '#fef3c7' : '#fecaca',
                  }}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">{(item.name as string) || ''}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{(item.description as string) || ''}</p>
                  </div>
                  <div className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border
                    ${statusClasses[statusColor as keyof typeof statusClasses]}
                  `}>
                    <StatusIcon className="w-4 h-4" />
                    <span>
                      {item.status === 'safe' ? '安全' : 
                       item.status === 'warning' ? '警告' : '危险'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">暂无检测结果，点击"开始检测"进行安全检查</p>
          </div>
        )}
      </PageCard>

      {/* 一键加固 */}
      <PageCard title="一键加固">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" className="form-checkbox mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">关闭不必要端口</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">减少攻击面，提高系统安全性</p>
              </div>
              <Lock className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </label>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" className="form-checkbox mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">修改默认配置</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">避免使用默认端口和凭证</p>
              </div>
              <Key className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </label>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" className="form-checkbox mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">以非管理员用户运行</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">遵循最小权限原则</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </label>
          </div>

          <button
            onClick={handleHardening}
            disabled={checking}
            className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            执行一键加固
          </button>
        </div>
      </PageCard>

      {/* 安全建议 */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">安全建议</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>定期执行安全检查</li>
              <li>及时更新系统和依赖</li>
              <li>使用强密码策略</li>
              <li>限制不必要的端口开放</li>
            </ul>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
