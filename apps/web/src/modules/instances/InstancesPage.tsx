import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '../../stores/authStore'
import * as deptApi from '../departments/api'
import type { Department } from '../departments/types'

interface Instance {
  id: string
  name: string
  endpoint: string
  status: string
  version?: string
  last_heartbeat?: number
  created_at?: string
  departments?: Department[]  // 实例关联的部门
}

interface CreateInstanceForm {
  name: string
  endpoint: string
  api_key: string
  department_id?: string  // 可选：所属部门
  config_id?: string      // 可选：关联配置
  skill_ids?: string[]    // 可选：关联 Skills
}

export default function InstancesPage() {
  const { getToken, user } = useAuthStore()
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [configs, setConfigs] = useState<any[]>([])
  const [skills, setSkills] = useState<any[]>([])
  const [createForm, setCreateForm] = useState<CreateInstanceForm>({
    name: '',
    endpoint: '',
    api_key: '',
    department_id: '',
    config_id: '',
    skill_ids: [],
  })
  const [selectedInstances, setSelectedInstances] = useState<string[]>([])
  const [batchOperating, setBatchOperating] = useState(false)
  const [showDeptDialog, setShowDeptDialog] = useState(false)
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null)
  const [instanceDepartments, setInstanceDepartments] = useState<Department[]>([])

  useEffect(() => {
    loadInstances()
    loadDepartments()
    loadConfigs()
    loadSkills()
  }, [])

  async function loadDepartments() {
    try {
      const token = getToken() || ''
      const list = await deptApi.listDepartments(token)
      setDepartments(list)
    } catch (error) {
      console.error('加载部门失败:', error)
    }
  }

  async function loadConfigs() {
    try {
      const token = getToken() || ''
      const list = await invoke<any[]>('list_configs', { token })
      setConfigs(list)
    } catch (error) {
      console.error('加载配置失败:', error)
      setConfigs([])
    }
  }

  async function loadSkills() {
    try {
      const token = getToken() || ''
      const list = await invoke<any[]>('list_skills', { token })
      setSkills(list)
    } catch (error) {
      console.error('加载 Skills 失败:', error)
      // 使用模拟数据
      setSkills([
        { id: 'skill-file-ops', name: '文件操作', description: '文件读写功能', version: '1.0.0', installed: true, enabled: true },
        { id: 'skill-browser', name: '浏览器自动化', description: '浏览器控制', version: '1.1.0', installed: true, enabled: true },
        { id: 'skill-github', name: 'GitHub 集成', description: 'GitHub 操作', version: '0.9.0', installed: false, enabled: false },
      ])
    }
  }

  async function loadInstances() {
    try {
      const token = getToken() || ''
      const list = await invoke<Instance[]>('list_instances', { token })
      setInstances(list)
    } catch (error) {
      console.error('加载实例失败:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const token = getToken() || ''
      
      // 准备请求数据（包含所有字段）
      const req = {
        name: createForm.name,
        endpoint: createForm.endpoint,
        api_key: createForm.api_key,
        config_id: createForm.config_id || null,
        skill_ids: createForm.skill_ids || [],
        department_id: createForm.department_id || null,
      }
      
      const instanceId = await invoke<string>('create_instance', { token, req })
      
      setCreateForm({ name: '', endpoint: '', api_key: '', department_id: '', config_id: '', skill_ids: [] })
      setShowCreateForm(false)
      loadInstances()
      alert('✅ 实例创建成功！\n\n已自动连接到 OpenCLAW 设备并获取实例信息。')
    } catch (error) {
      const errorMsg = error as string
      alert('❌ 创建失败\n\n' + errorMsg + '\n\n请检查：\n1. 设备 IP 地址和端口是否正确\n2. OpenCLAW 是否正在运行\n3. API Key 是否正确\n4. 网络是否通畅\n5. 防火墙是否开放端口')
    }
  }

  // 打开部门管理对话框
  async function openDeptDialog(instanceId: string, instanceName: string) {
    setCurrentInstanceId(instanceId)
    try {
      const token = getToken() || ''
      const depts = await deptApi.getInstanceDepartments(token, instanceId)
      setInstanceDepartments(depts)
      setShowDeptDialog(true)
    } catch (error) {
      console.error('加载部门失败:', error)
      setInstanceDepartments([])
      setShowDeptDialog(true)
    }
  }

  // 绑定实例到部门
  async function bindDepartment(deptId: string) {
    if (!currentInstanceId) return
    try {
      const token = getToken() || ''
      await deptApi.bindInstanceToDepartment(token, {
        instance_id: currentInstanceId,
        department_id: deptId
      })
      await openDeptDialog(currentInstanceId, '')
      alert('✅ 部门绑定成功！')
    } catch (error) {
      alert('❌ 绑定失败：' + error)
    }
  }

  // 解绑实例部门
  async function unbindDepartment(deptId: string) {
    if (!currentInstanceId) return
    try {
      const token = getToken() || ''
      await deptApi.unbindInstanceFromDepartment(token, currentInstanceId, deptId)
      await openDeptDialog(currentInstanceId, '')
      alert('✅ 部门解绑成功！')
    } catch (error) {
      alert('❌ 解绑失败：' + error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个实例吗？')) return
    try {
      const token = getToken() || ''
      await invoke('delete_instance', { token, instanceId: id })
      loadInstances()
    } catch (error) {
      alert('删除失败：' + error)
    }
  }

  async function handleBatchRestart() {
    if (selectedInstances.length === 0) {
      alert('请先选择实例')
      return
    }
    setBatchOperating(true)
    try {
      const token = getToken() || ''
      const results = await invoke<string[]>('batch_operation', {
        token,
        req: {
          instance_ids: selectedInstances,
          operation: 'restart',
        },
      })
      // 显示操作结果
      const successCount = results.filter(r => r.startsWith('✅')).length
      alert(`批量重启完成\n✅ 成功：${successCount}\n❌ 失败：${results.length - successCount}\n\n详情：\n${results.join('\n')}`)
      loadInstances()
    } catch (error) {
      alert('批量操作失败：' + error)
    } finally {
      setBatchOperating(false)
    }
  }

  function toggleSelectInstance(id: string) {
    setSelectedInstances((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800'
      case 'offline':
        return 'bg-red-100 text-red-800'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">实例管理</h1>
        <div className="space-x-2">
          {selectedInstances.length > 0 && (
            <button
              onClick={handleBatchRestart}
              disabled={batchOperating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {batchOperating ? '操作中...' : `批量重启 (${selectedInstances.length})`}
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + 新建实例
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h2 className="text-lg font-semibold mb-4">创建新实例</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">实例名称</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">API 端点</label>
              <input
                type="url"
                value={createForm.endpoint}
                onChange={(e) => setCreateForm({ ...createForm, endpoint: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="http://localhost:18789"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                value={createForm.api_key}
                onChange={(e) => setCreateForm({ ...createForm, api_key: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
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
            <div>
              <label className="block text-sm font-medium mb-1">关联配置（可选）</label>
              <select
                value={createForm.config_id}
                onChange={(e) => setCreateForm({ ...createForm, config_id: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">不关联配置</option>
                {configs.map(config => (
                  <option key={config.id} value={config.id}>{config.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">安装 Skills（可选）</label>
              <div className="space-y-2 border rounded p-3">
                {skills.filter(s => s.installed).length === 0 ? (
                  <p className="text-sm text-gray-500">暂无已安装的 Skills，请先在 Skills 管理页面安装</p>
                ) : (
                  skills.filter(s => s.installed).map(skill => (
                    <label key={skill.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={createForm.skill_ids?.includes(skill.id)}
                        onChange={(e) => {
                          const current = createForm.skill_ids || []
                          if (e.target.checked) {
                            setCreateForm({ ...createForm, skill_ids: [...current, skill.id] })
                          } else {
                            setCreateForm({ ...createForm, skill_ids: current.filter(id => id !== skill.id) })
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{skill.name} {skill.enabled ? '' : '（已禁用）'}</span>
                    </label>
                  ))
                )}
              </div>
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
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedInstances(instances.map((i) => i.id))
                    } else {
                      setSelectedInstances([])
                    }
                  }}
                  checked={selectedInstances.length === instances.length && instances.length > 0}
                />
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">名称</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">端点</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">部门</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">状态</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">版本</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance) => (
              <tr key={instance.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedInstances.includes(instance.id)}
                    onChange={() => toggleSelectInstance(instance.id)}
                  />
                </td>
                <td className="px-6 py-4 font-medium">{instance.name}</td>
                <td className="px-6 py-4 text-gray-600">{instance.endpoint}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => openDeptDialog(instance.id, instance.name)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {instance.departments && instance.departments.length > 0
                      ? instance.departments.map(d => d.name).join(', ')
                      : '未绑定'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(instance.status)}`}>
                    {instance.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{instance.version || '-'}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(instance.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {instances.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  暂无实例，点击右上角创建
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 部门管理对话框 */}
      {showDeptDialog && currentInstanceId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">管理部门</h2>
            <p className="text-sm text-gray-500 mb-4">
              为实例分配所属部门，用于数据隔离和成本统计
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">已绑定部门</label>
              {instanceDepartments.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无绑定部门</p>
              ) : (
                <div className="space-y-2">
                  {instanceDepartments.map(dept => (
                    <div key={dept.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{dept.name}</span>
                      <button
                        onClick={() => unbindDepartment(dept.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        解绑
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">绑定新部门</label>
              <select
                className="w-full px-3 py-2 border rounded"
                onChange={(e) => {
                  if (e.target.value) {
                    bindDepartment(e.target.value)
                    e.target.value = ''
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>选择部门...</option>
                {departments
                  .filter(d => !instanceDepartments.find(id => id.id === d.id))
                  .map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))
                }
              </select>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowDeptDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
