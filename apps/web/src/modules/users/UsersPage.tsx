import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import * as deptApi from '../departments/api'
import type { Department } from '../departments/types'
import { userAPI } from '../../services/api'

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
        // 如果选择了部门，绑定用户到部门
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

    if (!confirm(`${t('users.deleteConfirm', { username })}`)) return

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

  function getRoleColor(role: string) {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      operator: 'bg-blue-100 text-blue-800',
      dept_admin: 'bg-green-100 text-green-800',
      employee: 'bg-gray-100 text-gray-800',
      auditor: 'bg-purple-100 text-purple-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            🔒 {t('error.permissionDenied')}
          </h1>
          <p className="text-gray-600">
            {t('error.permissionMessage')}
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('error.back')}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-6">{t('common.loading')}</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('users.title')}</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + {t('users.create')}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h2 className="text-lg font-semibold mb-4">{t('users.createUser')}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('users.username')}</label>
              <input
                type="text"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('users.password')}</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('users.role')}</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 border rounded"
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
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">{t('users.noDepartment')}</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {t('users.create')}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                {t('users.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">{t('users.username')}</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">{t('users.role')}</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">{t('users.department')}</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">{t('users.lastLogin')}</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">{t('users.operations')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{user.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm ${getRoleColor(user.role)}`}>
                    {getRoleName(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {departments.find(d => d.id === user.department_id)?.name || '-'}
                </td>
                <td className="px-6 py-4 text-gray-600">{user.last_login || '-'}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(user.id, user.username)}
                    className="text-red-600 hover:text-red-800"
                    disabled={user.id === currentUser?.id}
                  >
                    {user.id === currentUser?.id ? t('users.cannotDeleteSelf') : t('users.delete')}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {t('users.noUsers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
