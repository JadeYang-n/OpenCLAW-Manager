import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import { PageContainer } from '@/components/ui/PageContainer'
import { auditLogsAPI } from '../../services/api'

interface AuditLog {
  id: string
  timestamp: string
  user_id: string
  username: string
  resource: string
  operation: string
  result: string
  risk_level: string
}

// Operation 中英文映射
const operationTranslations: Record<string, string> = {
  'user_created': '用户创建',
  'user_updated': '用户更新',
  'user_deleted': '用户删除',
  'instance_started': '实例启动',
  'instance_stopped': '实例停止',
  'instance_created': '实例创建',
  'instance_updated': '实例更新',
  'instance_deleted': '实例删除',
  'skill_installed': '技能安装',
  'skill_uninstalled': '技能卸载',
  'permission_changed': '权限变更',
  'department_created': '部门创建',
  'department_updated': '部门更新',
  'department_deleted': '部门删除',
  'security_event': '安全事件',
  'login': '登录',
  'logout': '登出',
  'config_updated': '配置更新',
  // 英文枚举映射
  'UserCreated': '用户创建',
  'UserUpdated': '用户更新',
  'UserDeleted': '用户删除',
  'InstanceStarted': '实例启动',
  'InstanceStopped': '实例停止',
  'InstanceCreated': '实例创建',
  'InstanceUpdated': '实例更新',
  'InstanceDeleted': '实例删除',
  'SkillInstalled': '技能安装',
  'SkillUninstalled': '技能卸载',
  'PermissionChanged': '权限变更',
  'DepartmentCreated': '部门创建',
  'DepartmentUpdated': '部门更新',
  'DepartmentDeleted': '部门删除',
  'SecurityEvent': '安全事件',
  'Login': '登录',
  'Logout': '登出',
  'ConfigUpdated': '配置更新',
}

// 获取 operation 的中文翻译
function getOperationText(operation: string): string {
  return operationTranslations[operation] || operation
}

export default function AuditLogsPage() {
  const { getToken } = useAuthStore()
  const { t } = useLanguageStore()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    resource: '',
    operation: '',
    risk_level: '',
  })

  const loadLogs = useCallback(async () => {
    try {
      const list = await auditLogsAPI.getAuditLogs({ limit: 100 })
      const logsData = Array.isArray(list) ? list : (list as { data?: Array<{}> })?.data || []
      setLogs(logsData || [])
    } catch (error) {
      console.error(t('error.load_failed'), error)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  function getRiskLevelClass(level: string) {
    switch (level) {
      case 'L': return 'bg-success/10 text-success'
      case 'M': return 'bg-warning/10 text-warning'
      case 'H': return 'bg-error/10 text-error'
      default: return 'bg-muted/10 text-muted-foreground'
    }
  }

  function getResultColor(result: string) {
    return result === 'success'
      ? 'text-success'
      : 'text-error'
  }

  const filteredLogs = logs.filter((log) => {
    if (filter.resource && !log.resource.includes(filter.resource)) return false
    if (filter.operation && !log.operation.includes(filter.operation)) return false
    if (filter.risk_level && log.risk_level !== filter.risk_level) return false
    return true
  })

  if (loading) {
    return <div className="p-6">{t('common.loading')}</div>
  }

  return (
    <PageContainer
      title={t('audit.title')}
      description={t('audit.description')}
    >
      <Card variant="premium" className="mt-6">
        <CardContent className="p-6">
          {/* 筛选条件 */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              placeholder={t('audit.filter_resource') || "筛选资源..."}
              value={filter.resource}
              onChange={(e) => setFilter({ ...filter, resource: e.target.value })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder={t('audit.filter_operation') || "操作名称"}
              value={filter.operation}
              onChange={(e) => setFilter({ ...filter, operation: e.target.value })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={filter.risk_level}
              onChange={(e) => setFilter({ ...filter, risk_level: e.target.value })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('audit.all_risk_levels') || "全部风险等级"}</option>
              <option value="L">{t('audit.risk_low') || "低风险 (L)"}</option>
              <option value="M">{t('audit.risk_medium') || "中风险 (M)"}</option>
              <option value="H">{t('audit.risk_high') || "高风险 (H)"}</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setFilter({ resource: '', operation: '', risk_level: '' })}
            >
              {t('common.reset') || "重置"}
            </Button>
          </div>

          {/* 审计日志表格 */}
          <Card variant="premium" className="mt-4">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t('audit.timestamp') || "时间"}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t('audit.user') || "用户"}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t('audit.resource') || "资源"}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t('audit.operation') || "操作"}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t('audit.riskLevel') || "风险等级"}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t('audit.result') || "结果"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-foreground">{log.timestamp}</td>
                        <td className="py-3 px-4 font-medium text-foreground">{log.username}</td>
                        <td className="py-3 px-4 text-foreground">{log.resource}</td>
                        <td className="py-3 px-4 text-foreground">{getOperationText(log.operation)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center h-6 px-2 py-0.5 rounded text-xs font-medium ${getRiskLevelClass(log.risk_level)}`}>
                            {log.risk_level === 'L' ? 'L' : log.risk_level === 'M' ? 'M' : 'H'}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-medium ${getResultColor(log.result)}`}>
                          {log.result === 'success'
                            ? (t('common.success') || "成功")
                            : (t('common.error') || "失败")
                          }
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          {t('audit.no_logs') || "暂无审计日志"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 分页信息 */}
          <div className="mt-4 text-sm text-muted-foreground">
            显示 {filteredLogs.length} / {logs.length} 条记录
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
