import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    localStorage.clear()
  })

  it('初始状态未认证', () => {
    const { user, token, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(token).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('login 设置用户和 token', () => {
    useAuthStore.getState().login(
      { id: '1', username: 'admin', role: 'admin' },
      'test-token-123'
    )
    const { user, token, isAuthenticated } = useAuthStore.getState()
    expect(user?.username).toBe('admin')
    expect(user?.role).toBe('admin')
    expect(token).toBe('test-token-123')
    expect(isAuthenticated).toBe(true)
  })

  it('logout 清空状态', () => {
    useAuthStore.getState().login(
      { id: '1', username: 'admin', role: 'admin' },
      'test-token'
    )
    useAuthStore.getState().logout()
    const { user, token, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(token).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('admin 角色拥有所有权限', () => {
    useAuthStore.getState().login(
      { id: '1', username: 'admin', role: 'admin' },
      'token'
    )
    expect(useAuthStore.getState().hasPermission(['employee'])).toBe(true)
    expect(useAuthStore.getState().hasPermission(['operator', 'dept_admin'])).toBe(true)
  })

  it('employee 角色只有 employee 权限', () => {
    useAuthStore.getState().login(
      { id: '2', username: 'user1', role: 'employee' },
      'token'
    )
    expect(useAuthStore.getState().hasPermission(['employee'])).toBe(true)
    expect(useAuthStore.getState().hasPermission(['admin'])).toBe(false)
    expect(useAuthStore.getState().hasPermission(['operator', 'dept_admin'])).toBe(false)
  })

  it('未认证时 hasPermission 返回 false', () => {
    expect(useAuthStore.getState().hasPermission(['admin'])).toBe(false)
  })

  it('getToken 返回当前 token', () => {
    expect(useAuthStore.getState().getToken()).toBeNull()
    useAuthStore.getState().login(
      { id: '1', username: 'admin', role: 'admin' },
      'my-token'
    )
    expect(useAuthStore.getState().getToken()).toBe('my-token')
  })
})
