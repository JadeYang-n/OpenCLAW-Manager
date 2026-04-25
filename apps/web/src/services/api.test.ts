import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/authStore'

// Mock auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      getToken: () => 'mock-token',
      logout: vi.fn(),
    })),
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API fetchAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-ignore
    useAuthStore.getState = vi.fn(() => ({
      getToken: () => 'mock-token',
      logout: vi.fn(),
    }))
  })

  it('GET 请求构造正确 URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: [] }),
    })

    const { fetchAPI } = await import('@/services/api')
    await fetchAPI('/skills')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/skills'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        }),
      })
    )
  })

  it('POST 请求包含 body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    })

    const { fetchAPI } = await import('@/services/api')
    await fetchAPI('/skills', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: '{"name":"test"}',
      })
    )
  })

  it('401 抛出错误', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const { fetchAPI } = await import('@/services/api')
    await expect(fetchAPI('/skills')).rejects.toThrow('Unauthorized')
  })

  it('500 抛出错误', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const { fetchAPI } = await import('@/services/api')
    await expect(fetchAPI('/skills')).rejects.toThrow('API error: 500')
  })
})
