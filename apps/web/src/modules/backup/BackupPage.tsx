import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'

interface BackupInfo {
  filename: string
  path: string
  size: number
  created: number
}

export default function BackupPage() {
  const { getToken } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [backupPath, setBackupPath] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  const loadBackups = useCallback(async () => {
    try {
      const token = getToken() || ''
      const list = await invoke<BackupInfo[]>('list_backups', { token })
      setBackups(list)
    } catch (error) {
      console.error('加载备份列表失败:', error)
    }
  }, [getToken])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  async function handleBackup() {
    setLoading(true)
    try {
      const token = getToken() || ''
      const path = await invoke<string>('backup_database', { token })
      setBackupPath(path)
      toast.success(`✅ 备份成功！\n\n备份文件：${path}`)
      loadBackups()
    } catch (error) {
      toast.error('❌ 备份失败：' + (error as string))
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(backupPath: string) {
    if (!confirm('⚠️ 警告：恢复数据库将覆盖当前数据！\n\n确定要继续吗？')) {
      return
    }

    setRestoring(true)
    try {
      const token = getToken() || ''
      await invoke('restore_database', { token, backupPath })
      toast.success('✅ 恢复成功！')
      loadBackups()
    } catch (error) {
      toast.error('❌ 恢复失败：' + (error as string))
    } finally {
      setRestoring(false)
    }
  }

  async function handleDelete(backupPath: string) {
    if (!confirm('确定要删除这个备份吗？')) {
      return
    }

    try {
      const token = getToken() || ''
      await invoke('delete_backup', { token, backupPath })
      toast.success('✅ 删除成功！')
      loadBackups()
    } catch (error) {
      toast.error('❌ 删除失败：' + (error as string))
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">备份与恢复</h1>
        <p className="text-gray-600">管理数据库备份，支持手动备份和恢复操作</p>
      </div>

      <div className="mb-6 flex space-x-4">
        <button
          onClick={handleBackup}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '备份中...' : '立即备份'}
        </button>
      </div>

      {backupPath && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">✅ 最近备份：{backupPath}</p>
        </div>
      )}

      <div className="border rounded">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold">备份列表</h2>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无备份记录
          </div>
        ) : (
          <div className="divide-y">
            {backups.map((backup) => (
              <div key={backup.filename} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium">{backup.filename}</p>
                  <p className="text-sm text-gray-500">
                    {formatSize(backup.size)} • {formatTime(backup.created)}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleRestore(backup.path)}
                    disabled={restoring}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => handleDelete(backup.path)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
