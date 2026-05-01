import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import * as deptApi from './api'
import type { Department, CreateDepartmentRequest } from './types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '../../components/ui/PageContainer'
import { Input } from '@/components/ui/form'
import { Building2, Plus } from 'lucide-react'

export default function DepartmentsPage() {
  const { token, user } = useAuthStore()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [newDept, setNewDept] = useState<CreateDepartmentRequest>({ name: '', description: '' })

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

  const canEdit = user?.role === 'admin' || user?.role === 'operator'

  return (
    <PageContainer title="部门管理" description="管理组织架构和部门设置">
      {/* Action Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <span className="text-sm text-muted-foreground">{departments.length} 个部门</span>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建部门
          </Button>
        )}
      </div>

      {/* Department Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">部门名称</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">描述</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">创建时间</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">加载中...</td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">暂无部门</td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{dept.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{dept.description || '-'}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(dept.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditForm(dept)}
                              >
                                编辑
                              </Button>
                              {dept.id !== 'dept-001' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(dept.id, dept.name)}
                                >
                                  删除
                                </Button>
                              )}
                            </>
                          )}
                          {dept.id === 'dept-001' && (
                            <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                              默认部门
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Department Dialog */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">创建部门</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">部门名称</label>
                  <Input
                    type="text"
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    placeholder="如：技术部、销售部"
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
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>取消</Button>
                  <Button type="submit" variant="primary">创建</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Department Dialog */}
      {showEditForm && editingDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">编辑部门</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">部门名称</label>
                  <Input
                    type="text"
                    value={editingDept.name}
                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <textarea
                    value={editingDept.description || ''}
                    onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowEditForm(false)}>取消</Button>
                  <Button type="submit" variant="primary">保存</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
