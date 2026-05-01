import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import * as deptApi from '../departments/api'
import type { Department } from '../departments/types'
import { userAPI } from '../../services/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '../../components/ui/PageContainer'
import { RoleBadge } from '@/components/ui/role-badge'
import { Input } from '@/components/ui/form'
import { Users, UserPlus } from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  full_name: string
  role: 'admin' | 'operator' | 'dept_admin' | 'employee' | 'auditor'
  department_id?: string
  departments?: Department[]
  created_at: string
  last_login?: string
  is_active: boolean
}

interface CreateUserForm {
  username: string
  password: string
  role: string
  department_id?: string
}

export default function UsersPage() {
  const { user: currentUser, getToken } = useAuthStore()
  const { t } = useLanguageStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    username: '',
    password: '',
    role: 'employee',
    department_id: '',
  })
  const [error, setError] = useState('')

  const loadDepartments = useCallback(async () => {
    try {
      const token = getToken() || ''
      const list = await deptApi.listDepartments(token)
      setDepartments(list)
    } catch (error) {
      console.error('加载部门失败:', error)
    }
  }, [getToken])

  const loadUsers = useCallback(async () => {
    try {
      const result = await userAPI.getUsers() as { success: boolean; data: User[] }
      if (result.success && result.data) {
        setUsers(result.data)
      }
    } catch (err) {
      setError('加载用户失败：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    loadDepartments()
  }, [loadUsers, loadDepartments])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const result = await userAPI.createUser({
        username: createForm.username,
        password: createForm.password,
        email: `${createForm.username}@ocm.local`,
        full_name: createForm.username,
        role: createForm.role,
        department_id: createForm.department_id || undefined,
      }) as { success: boolean; data?: { id: string } }

      if (result.success && result.data) {
        if (createForm.department_id) {
          try {
            const token = getToken() || ''
            await deptApi.bindUserToDepartment(token, {
              user_id: result.data.id,
              department_id: createForm.department_id,
              is_primary: true
            })
          } catch (error) {
            console.error('绑定部门失败:', error)
          }
        }

        setCreateForm({ username: '', password: '', role: 'employee', department_id: '' })
        setShowCreateForm(false)
        loadUsers()
        toast.success('用户创建成功')
      }
    } catch (err) {
      setError('创建失败：' + (err as Error).message)
      toast.error('❌ 创建失败：' + (err as Error).message)
    }
  }

  async function handleDelete(id: string, username: string) {
    if (id === currentUser?.id) {
        toast.error(t('users.cannotDeleteSelf'))
      return
    }

    if (!confirm(`确定要删除用户 "${username}" 吗？`)) return

    try {
      await userAPI.deleteUser(id)
      loadUsers()
      toast.success(`用户 "${username}" 已删除`)
    } catch (err) {
      setError('删除失败：' + (err as Error).message)
      toast.error('❌ 删除失败：' + (err as Error).message)
    }
  }

  function getRoleName(role: string) {
    const roles: Record<string, string> = {
      admin: t('role.admin'),
      operator: t('role.operator'),
      dept_admin: t('role.deptAdmin'),
      employee: t('role.employee'),
      auditor: t('role.auditor'),
    }
    return roles[role] || role
  }

  if (currentUser?.role !== 'admin') {
    return (
      <PageContainer title={t('error.permissionDenied')}>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-error">🔒 {t('error.permissionDenied')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {t('error.permissionMessage')}
            </p>
            <Button onClick={() => window.history.back()}>
              {t('error.back')}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (loading) {
    return (
      <PageContainer title={t('users.title')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title={t('users.title')} description="管理系统用户和角色">
      {/* Action Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <span className="text-sm text-muted-foreground">{users.length} 个用户</span>
        </div>
        <Button variant="primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          <UserPlus className="w-4 h-4 mr-2" />
          {t('users.create')}
        </Button>
      </div>

      {error && (
        <div className="bg-error/10 text-error p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('users.createUser')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('users.username')}</label>
                <Input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('users.password')}</label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('users.role')}</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full p-2 border rounded-md border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="employee">{t('role.employee')}</option>
                  <option value="dept_admin">{t('role.deptAdmin')}</option>
                  <option value="operator">{t('role.operator')}</option>
                  <option value="auditor">{t('role.auditor')}</option>
                  <option value="admin">{t('role.admin')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('users.department')}</label>
                <select
                  value={createForm.department_id}
                  onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                  className="w-full p-2 border rounded-md border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('users.noDepartment')}</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary">{t('users.create')}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>{t('users.cancel')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('users.username')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('users.role')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('users.department')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('users.lastLogin')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('users.operations')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{user.username}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={user.role} />
                      <span className="ml-2 text-sm text-muted-foreground">{getRoleName(user.role)}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {departments.find(d => d.id === user.department_id)?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.last_login || '-'}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        className="text-error hover:text-error/80 h-auto p-0"
                        onClick={() => handleDelete(user.id, user.username)}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.id === currentUser?.id ? t('users.cannotDeleteSelf') : t('users.delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {t('users.noUsers')}
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
