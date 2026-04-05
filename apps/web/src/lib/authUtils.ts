import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/api';

/**
 * 检查用户是否具有管理员权限
 * @param user - 用户对象，包含 role 属性
 * @returns 如果用户是 admin 或 operator 返回 true
 */
export function isAdmin(user: { role?: UserRole } | null): boolean {
  return user?.role === 'admin' || user?.role === 'operator';
}

/**
 * 检查用户是否具有部门管理员权限
 * @param user - 用户对象，包含 role 属性
 * @returns 如果用户是 admin、operator 或 dept_admin 返回 true
 */
export function isDeptAdmin(user: { role?: UserRole } | null): boolean {
  return user?.role === 'admin' || user?.role === 'operator' || user?.role === 'dept_admin';
}

/**
 * 检查用户是否具有技能管理权限
 * @param user - 用户对象，包含 role 属性
 * @returns 如果用户是 admin、operator 或 dept_admin 返回 true
 */
export function canManageSkills(user: { role?: UserRole } | null): boolean {
  return user?.role === 'admin' || user?.role === 'operator' || user?.role === 'dept_admin';
}

/**
 * 检查用户是否有特定角色
 * @param user - 用户对象，包含 role 属性
 * @param roles - 需要检查的角色数组
 * @returns 如果用户角色匹配任一角色返回 true
 */
export function hasRole(user: { role?: UserRole } | null, roles: UserRole[]): boolean {
  return user?.role ? roles.includes(user.role) : false;
}

/**
 * 获取用户角色文本显示
 * @param role - 用户角色
 * @returns 对应的角色文本
 */
export function getUserRoleText(role: UserRole): string {
  const roleTexts: Record<UserRole, string> = {
    admin: '👑 超级管理员',
    operator: '🔧 运维管理员',
    dept_admin: '📋 部门管理员',
    employee: '👤 员工',
    auditor: '📊 审计员',
  };
  return roleTexts[role] || '👤 用户';
}
