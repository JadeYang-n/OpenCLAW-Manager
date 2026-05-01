import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'

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

      useAuthStore.getState().login(result.user, result.token)

      localStorage.setItem('auth_token', result.token)
      localStorage.setItem('auth_user', JSON.stringify(result.user))

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-4">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            OpenCLAW Manager
          </h1>
          <p className="text-muted-foreground">多实例企业级管控平台 v1.0.0 Beta</p>
        </div>

        {/* 登录表单 */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-center text-xl">用户登录</CardTitle>
            <CardDescription className="text-center">请输入您的账号和密码</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-error/10 text-error p-4 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">用户名</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">密码</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full"
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>MIT License • 完全免费开源</p>
        </div>
      </div>
    </div>
  )
}
