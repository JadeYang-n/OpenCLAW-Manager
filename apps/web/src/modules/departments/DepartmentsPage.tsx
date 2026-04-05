import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import * as deptApi from './api'
import type { Department, CreateDepartmentRequest } from './types'

export default function DepartmentsPage() {
  const { token, user } = useAuthStore()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [newDept, setNewDept] = useState<CreateDepartmentRequest>({ name: '', description: '' })

  // 加载部门列表
  const loadDepartments = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const list = await deptApi.listDepartments(token)
      setDepartments(list)
    } catch (error) {
      console.error('加载部门失败:', error)
      toast.error('❌ 加载失败：' + (error as string))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments])

  // 创建部门
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !newDept.name.trim()) return
    try {
      await deptApi.createDepartment(token, newDept)
      setNewDept({ name: '', description: '' })
      setShowCreateForm(false)
      await loadDepartments()
      toast.success('✅ 部门创建成功！')
    } catch (error) {
      console.error('创建部门失败:', error)
      toast.error('❌ 创建失败：' + (error as string))
    }
  }

  // 编辑部门
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !editingDept) return
    try {
      await deptApi.updateDepartment(token, editingDept.id, {
        name: editingDept.name,
        description: editingDept.description
      })
      setShowEditForm(false)
      setEditingDept(null)
      await loadDepartments()
      toast.success('✅ 部门更新成功！')
    } catch (error) {
      console.error('更新部门失败:', error)
      toast.error('❌ 更新失败：' + (error as string))
    }
  }

  // 删除部门
  const handleDelete = async (id: string, name: string) => {
    if (!token) return
    if (!confirm(`确定要删除部门 "${name}" 吗？此操作不可恢复。`)) return
    try {
      await deptApi.deleteDepartment(token, id)
      await loadDepartments()
      toast.success('✅ 部门删除成功！')
    } catch (error) {
      console.error('删除部门失败:', error)
      toast.error('❌ 删除失败：' + (error as string))
    }
  }

  const openEditForm = (dept: Department) => {
    setEditingDept({ ...dept })
    setShowEditForm(true)
  }

  // 检查是否有编辑权限（仅管理员）
  const canEdit = user?.role === 'admin' || user?.role === 'operator'

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">部门管理</h1>
          <p className="text-gray-500 mt-1">管理组织架构和部门设置</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            + 创建部门
          </button>
        )}
      </div>

      {/* 部门列表 */}
      <div className="bg-card rounded-lg border shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">部门列表</h2>
          <p className="text-sm text-gray-500 mt-1">共 {departments.length} 个部门</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无部门</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">部门名称</th>
                  <th className="text-left py-3 px-4 font-semibold">描述</th>
                  <th className="text-left py-3 px-4 font-semibold">创建时间</th>
                  <th className="text-right py-3 px-4 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{dept.name}</td>
                    <td className="py-3 px-4 text-gray-600">{dept.description || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(dept.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEditForm(dept)}
                              className="px-3 py-1 text-sm border rounded hover:bg-muted"
                            >
                              编辑
                            </button>
                            {dept.id !== 'dept-001' && (
                              <button
                                onClick={() => handleDelete(dept.id, dept.name)}
                                className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                              >
                                删除
                              </button>
                            )}
                          </>
                        )}
                        {dept.id === 'dept-001' && (
                          <span className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded">
                            默认部门
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 创建部门表单 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">创建部门</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">部门名称</label>
                <input
                  type="text"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="如：技术部、销售部"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述（可选）</label>
                <textarea
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  placeholder="部门职责描述"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑部门表单 */}
      {showEditForm && editingDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">编辑部门</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">部门名称</label>
                <input
                  type="text"
                  value={editingDept.name}
                  onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={editingDept.description || ''}
                  onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
