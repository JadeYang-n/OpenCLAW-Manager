// 部门管理类型定义

export interface Department {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name: string;
  description?: string;
}

export interface BindInstanceRequest {
  instance_id: string;
  department_id: string;
}

export interface BindUserRequest {
  user_id: string;
  department_id: string;
  is_primary: boolean;
}
