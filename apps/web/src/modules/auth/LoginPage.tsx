import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'

interface LoginResponse {
  token: string
  user: {
    id: string
    username: string
    role: 'admin' | 'operator' | 'dept_admin' | 'employee' | 'auditor'
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/instances', { replace: true })
    }
  }, [isAuthenticated, navigate])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post<LoginResponse>('/users/login', {
        username,
        password,
      })

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '登录失败')
      }

      const result = response.data

      // 使用 Zustand store 的 login 方法（会自动 persist）
      useAuthStore.getState().login(result.user, result.token)

      // 额外存储到 localStorage（双重保险）
      localStorage.setItem('auth_token', result.token)
      localStorage.setItem('auth_user', JSON.stringify(result.user))
      
      // 强制刷新一下 store 状态
      setTimeout(() => {
        navigate('/instances', { replace: true })
      }, 100)
    } catch (err) {
      const errorMsg = err as string
      setError('登录失败：' + (errorMsg || '未知错误，请检查用户名和密码'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            OpenCLAW Manager
          </h1>
          <p className="text-gray-600">企业版 v4.0</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white p-8 rounded-lg shadow-lg border">
          <h2 className="text-2xl font-bold mb-6 text-center">用户登录</h2>

          {error && (
            <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户名"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 初始账号提示 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800 font-medium mb-2">
              📝 初始管理员账号
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p>用户名：<code className="bg-white px-2 py-1 rounded">admin</code></p>
              <p>密码：<code className="bg-white px-2 py-1 rounded">admin123</code></p>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              ⚠️ 首次登录后请立即修改密码
            </p>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>MIT License • 完全免费开源</p>
        </div>
      </div>
    </div>
  )
}
