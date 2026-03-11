// 部门管理 API 调用

import { invoke } from '@tauri-apps/api/core'
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  BindInstanceRequest,
  BindUserRequest
} from './types'

/**
 * 列出所有部门
 */
export async function listDepartments(token: string): Promise<Department[]> {
  return await invoke<Department[]>('list_departments', { token })
}

/**
 * 创建部门
 */
export async function createDepartment(
  token: string,
  req: CreateDepartmentRequest
): Promise<string> {
  return await invoke<string>('create_department', { token, req })
}

/**
 * 更新部门
 */
export async function updateDepartment(
  token: string,
  departmentId: string,
  req: UpdateDepartmentRequest
): Promise<void> {
  return await invoke<void>('update_department', { token, departmentId, req })
}

/**
 * 删除部门
 */
export async function deleteDepartment(
  token: string,
  departmentId: string
): Promise<void> {
  return await invoke<void>('delete_department', { token, departmentId })
}

/**
 * 绑定实例到部门
 */
export async function bindInstanceToDepartment(
  token: string,
  req: BindInstanceRequest
): Promise<void> {
  return await invoke<void>('bind_instance_to_department', { token, req })
}

/**
 * 从部门解绑实例
 */
export async function unbindInstanceFromDepartment(
  token: string,
  instanceId: string,
  departmentId: string
): Promise<void> {
  return await invoke<void>('unbind_instance_from_department', { token, instanceId, departmentId })
}

/**
 * 获取实例的部门列表
 */
export async function getInstanceDepartments(
  token: string,
  instanceId: string
): Promise<Department[]> {
  return await invoke<Department[]>('get_instance_departments', { token, instanceId })
}

/**
 * 获取用户的部门列表
 */
export async function getUserDepartments(
  token: string,
  userId: string
): Promise<Department[]> {
  return await invoke<Department[]>('get_user_departments', { token, userId })
}

/**
 * 绑定用户到部门
 */
export async function bindUserToDepartment(
  token: string,
  req: BindUserRequest
): Promise<void> {
  return await invoke<void>('bind_user_to_department', { token, req })
}

/**
 * 从部门移除用户
 */
export async function removeUserFromDepartment(
  token: string,
  userId: string,
  departmentId: string
): Promise<void> {
  return await invoke<void>('remove_user_from_department', { token, userId, departmentId })
}
