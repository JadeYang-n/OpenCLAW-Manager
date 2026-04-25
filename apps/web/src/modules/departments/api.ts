// 閮ㄩ棬绠＄悊 API 璋冪敤 (B/S 鏋舵瀯 - v5.7)

import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  BindInstanceRequest,
  BindUserRequest
} from './types'
import { fetchAPI } from '../../services/api'

const API_BASE_URL = 'http://localhost:8080/api'

/**
 * 鍒楀嚭鎵€鏈夐儴闂? */
export async function listDepartments(token?: string): Promise<Department[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetchAPI<{ success: boolean; data: Department[] }>(
      'departments',
      { headers }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch departments');
    }
    
    return response.data || [];
  } catch (error) {
    console.error('listDepartments failed:', error);
    throw error;
  }
}

/**
 * 鍒涘缓閮ㄩ棬
 */
export async function createDepartment(
  token: string,
  req: CreateDepartmentRequest
): Promise<string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  try {
    const response = await fetchAPI<{ success: boolean; data: { id: string } }>(
      'departments',
      { 
        method: 'POST',
        headers,
        body: JSON.stringify(req)
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create department');
    }
    
    return response.data?.id || '';
  } catch (error) {
    console.error('createDepartment failed:', error);
    throw error;
  }
}

/**
 * 鏇存柊閮ㄩ棬
 */
export async function updateDepartment(
  token: string,
  departmentId: string,
  req: UpdateDepartmentRequest
): Promise<void> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  try {
    const response = await fetchAPI<{ success: boolean }>(
      `/departments/${departmentId}`,
      { 
        method: 'PUT',
        headers,
        body: JSON.stringify(req)
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update department');
    }
  } catch (error) {
    console.error('updateDepartment failed:', error);
    throw error;
  }
}

/**
 * 鍒犻櫎閮ㄩ棬
 */
export async function deleteDepartment(
  token: string,
  departmentId: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  try {
    const response = await fetchAPI<{ success: boolean }>(
      `/departments/${departmentId}`,
      { 
        method: 'DELETE',
        headers
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete department');
    }
  } catch (error) {
    console.error('deleteDepartment failed:', error);
    throw error;
  }
}

/**
 * 缁戝畾瀹炰緥鍒伴儴闂? */
export async function bindInstanceToDepartment(
  token: string,
  req: BindInstanceRequest
): Promise<void> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  try {
    const response = await fetchAPI<{ success: boolean }>(
      `/instances/${req.instance_id}/departments`,
      { 
        method: 'POST',
        headers,
        body: JSON.stringify({ department_id: req.department_id })
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to bind instance to department');
    }
  } catch (error) {
    console.error('bindInstanceToDepartment failed:', error);
    throw error;
  }
}

/**
 * 浠庨儴闂ㄨВ缁戝疄渚? */
export async function unbindInstanceFromDepartment(
  token: string,
  instanceId: string,
  departmentId: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  try {
    const response = await fetchAPI<{ success: boolean }>(
      `/instances/${instanceId}/departments/${departmentId}`,
      { 
        method: 'DELETE',
        headers
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to unbind instance from department');
    }
  } catch (error) {
    console.error('unbindInstanceFromDepartment failed:', error);
    throw error;
  }
}

/**
 * 鑾峰彇瀹炰緥鐨勯儴闂ㄥ垪琛? */
export async function getInstanceDepartments(
  token?: string,
  instanceId?: string
): Promise<Department[]> {
  if (!instanceId) return [];
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetchAPI<{ success: boolean; data: Department[] }>(
      `/instances/${instanceId}/departments`,
      { headers }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch instance departments');
    }
    
    return response.data || [];
  } catch (error) {
    console.error('getInstanceDepartments failed:', error);
    throw error;
  }
}

/**
 * 鑾峰彇鐢ㄦ埛鐨勯儴闂ㄥ垪琛? */
export async function getUserDepartments(
  token: string,
  userId: string
): Promise<Department[]> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  try {
    const response = await fetchAPI<{ success: boolean; data: Department[] }>(
      `/users/${userId}/departments`,
      { headers }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch user departments');
    }
    
    return response.data || [];
  } catch (error) {
    console.error('getUserDepartments failed:', error);
    throw error;
  }
}

/**
 * 缁戝畾鐢ㄦ埛鍒伴儴闂? */
export async function bindUserToDepartment(
  token: string,
  req: BindUserRequest
): Promise<void> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  try {
    const response = await fetchAPI<{ success: boolean }>(
      `/users/${req.user_id}/departments`,
      { 
        method: 'POST',
        headers,
        body: JSON.stringify({ department_id: req.department_id })
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to bind user to department');
    }
  } catch (error) {
    console.error('bindUserToDepartment failed:', error);
    throw error;
  }
}

/**
 * 浠庨儴闂ㄧЩ闄ょ敤鎴? */
export async function removeUserFromDepartment(
  token: string,
  userId: string,
  departmentId: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  try {
    const response = await fetchAPI<{ success: boolean }>(
      `/users/${userId}/departments/${departmentId}`,
      { 
        method: 'DELETE',
        headers
      }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to remove user from department');
    }
  } catch (error) {
    console.error('removeUserFromDepartment failed:', error);
    throw error;
  }
}
