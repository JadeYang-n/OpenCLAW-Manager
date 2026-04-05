import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { configAPI } from '../../services/api'
import { toast } from 'react-hot-toast'

interface Config {
  id: string
  name: string
  description?: string
  config_json: string
  openclaw_version_range: string
  created_at: string
  updated_at: string
}

interface CreateConfigForm {
  name: string
  description: string
  config_json: string
  openclaw_version_range: string
}

export default function ConfigPage() {
  const { getToken, user } = useAuthStore()
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<CreateConfigForm>({
    name: '',
    description: '',
    config_json: '{}',
    openclaw_version_range: '>=2026.2.0',
  })

  const loadConfigs = useCallback(async () => {
    try {
      const list = await configAPI.getConfigs()
      const configsData = Array.isArray(list) ? list : (list as { data?: Array<{}> })?.data || []
      setConfigs(configsData)
    } catch (error) {
      console.error('加载配置失败:', error)
      setConfigs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const req = {
        name: createForm.name,
        data: createForm.config_json ? JSON.parse(createForm.config_json) : {}
      }
      await configAPI.createConfig(req)
      setCreateForm({
        name: '',
        description: '',
        config_json: '{}',
        openclaw_version_range: '>=2026.2.0',
      })
      setShowCreateForm(false)
      loadConfigs()
      toast.success('✅ 配置创建成功！')
    } catch (error) {
      toast.error('❌ 创建失败：' + error)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定要删除配置 "${name}" 吗？`)) return
    try {
      await configAPI.deleteConfig(id)
      loadConfigs()
      toast.success('✅ 配置删除成功！')
    } catch (error) {
      toast.error('❌ 删除失败：' + error)
    }
  }

  const canEdit = user?.role === 'admin' || user?.role === 'operator'

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">配置管理</h1>
          <p className="text-gray-600 mt-1">管理 OpenCLAW 实例的配置模板</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + 新建配置
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h2 className="text-lg font-semibold mb-4">创建新配置</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">配置名称</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">描述（可选）</label>
              <input
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">配置内容（JSON）</label>
              <textarea
                value={createForm.config_json}
                onChange={(e) => setCreateForm({ ...createForm, config_json: e.target.value })}
                className="w-full px-3 py-2 border rounded font-mono text-sm"
                rows={8}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">OpenCLAW 版本范围</label>
              <input
                type="text"
                value={createForm.openclaw_version_range}
                onChange={(e) => setCreateForm({ ...createForm, openclaw_version_range: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder=">=2026.2.0"
                required
              />
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
              <th className="px-6 py-3 text-left font-medium text-gray-700">名称</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">描述</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">版本范围</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">更新时间</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{config.name}</td>
                <td className="px-6 py-4 text-gray-600">{config.description || '-'}</td>
                <td className="px-6 py-4 text-gray-600">{config.openclaw_version_range}</td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(config.updated_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-right">
                  {canEdit && (
                    <button
                      onClick={() => handleDelete(config.id, config.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {configs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  暂无配置，点击右上角创建
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
