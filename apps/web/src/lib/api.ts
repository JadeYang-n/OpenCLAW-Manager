const API_BASE = 'http://localhost:8080/api/v1'

interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: {
    type: string
    code: string
    message: string
    details: Record<string, unknown>
  } | null
  timestamp: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // Add auth token if available
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  const response = await fetch(url, config)

  // 只解析一次 JSON
  let jsonData: Record<string, unknown> | null = null
  if (response.headers.get('content-type')?.includes('application/json')) {
    try {
      jsonData = await response.clone().json()  // 使用 clone() 避免读取 body
    } catch {
      jsonData = null
    }
  }

  // Handle 401 Unauthorized - 只有真正的认证失败才跳转
  if (response.status === 401) {
    // 如果是登录端点的"用户名或密码错误"，不跳转，让调用方处理
    if (jsonData && jsonData['success'] === false && jsonData['error']?.['code'] === 'INVALID_CREDENTIALS') {
      // 这是登录失败，不跳转，让调用方处理
    } else {
      // 这是真正的认证失败（没有token或token无效），跳转到登录页
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
      throw new Error('Unauthorized. Please login again.')
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.json()
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
}

export type { ApiResponse }