import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import * as deptApi from '../departments/api'
import type { Department } from '../departments/types'

interface User {
  id: string
  username: string
  role: 'admin' | 'operator' | 'dept_admin' | 'employee' | 'auditor'
  department_id?: string
  departments?: Department[]  // 用户关联的部门
  created_at: string
  last_login_at?: string
}

interface CreateUserForm {
  username: string
  password: string
  role: string
  department_id?: string  // 主部门
}

export default function UsersPage() {
  const { user: currentUser, getToken } = useAuthStore()
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
      // TODO: 实现 list_users API
      // const list = await invoke<User[]>('list_users')
      // setUsers(list)
      
      // 暂时模拟数据
      setUsers([
        {
          id: 'admin-001',
          username: 'admin',
          role: 'admin',
          created_at: '2026-03-10 00:00:00',
          last_login_at: '2026-03-10 22:00:00',
        },
      ])
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
      // TODO: 实现 create_user API
      // await invoke('create_user', { req: createForm })
      
      // 如果选择了部门，绑定用户到部门
      if (createForm.department_id) {
        try {
          const token = getToken() || ''
          // 模拟创建用户后获取用户 ID
          const mockUserId = 'user-' + Date.now()
          await deptApi.bindUserToDepartment(token, {
            user_id: mockUserId,
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
      toast.success('✅ 用户创建成功（模拟）')
    } catch (err) {
      setError('创建失败：' + (err as Error).message)
      toast.error('❌ 创建失败：' + (err as Error).message)
    }
  }

  async function handleDelete(id: string, username: string) {
    // 不能删除自己
    if (id === currentUser?.id) {
      toast.error('❌ 不能删除自己的账号')
      return
    }
    
    if (!confirm(`确定要删除用户 "${username}" 吗？`)) return
    
    try {
      // TODO: 实现 delete_user API
      // await invoke('delete_user', { userId: id })
      loadUsers()
      toast.success('✅ 用户删除成功（模拟）')
    } catch (err) {
      setError('删除失败：' + (err as Error).message)
      toast.error('❌ 删除失败：' + (err as Error).message)
    }
  }

  function getRoleName(role: string) {
    const roles: Record<string, string> = {
      admin: '👑 超级管理员',
      operator: '🔧 运维管理员',
      dept_admin: '📋 部门管理员',
      employee: '👤 普通员工',
      auditor: '📊 审计员',
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

  // 只有超级管理员能访问
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            🔒 权限不足
          </h1>
          <p className="text-gray-600">
            只有超级管理员可以访问用户管理页面
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回上一页
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + 新建用户
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h2 className="text-lg font-semibold mb-4">创建新用户</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">用户名</label>
              <input
                type="text"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">密码</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">角色</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="employee">👤 普通员工</option>
                <option value="dept_admin">📋 部门管理员</option>
                <option value="operator">🔧 运维管理员</option>
                <option value="auditor">📊 审计员</option>
                <option value="admin">👑 超级管理员</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">所属部门（可选）</label>
              <select
                value={createForm.department_id}
                onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">不绑定部门</option>
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
                创建
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">用户名</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">角色</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">部门</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">创建时间</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">最后登录</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">操作</th>
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
                  {user.departments && user.departments.length > 0
                    ? user.departments.map(d => d.name).join(', ')
                    : '-'}
                </td>
                <td className="px-6 py-4 text-gray-600">{user.created_at}</td>
                <td className="px-6 py-4 text-gray-600">{user.last_login_at || '-'}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(user.id, user.username)}
                    className="text-red-600 hover:text-red-800"
                    disabled={user.id === currentUser?.id}
                  >
                    {user.id === currentUser?.id ? '不能删除自己' : '删除'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  暂无用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-800">
          💡 提示：用户管理功能需要后端 API 支持，当前为演示版本。
        </p>
      </div>
    </div>
  )
}
