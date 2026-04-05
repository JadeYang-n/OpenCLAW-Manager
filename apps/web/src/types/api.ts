// API 类型定义

/**
 * 通用 API 响应
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp?: string;
}

/**
 * 分页请求参数
 */
export interface PageRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== 认证相关类型 ====================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  role: UserRole;
  departmentId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  DEPT_ADMIN = 'dept_admin',
  EMPLOYEE = 'employee',
  AUDITOR = 'auditor',
}

// ==================== 实例管理类型 ====================

export interface Instance {
  id: string;
  name: string;
  manager_endpoint?: string;
  endpoint?: string;
  port?: number;
  status: InstanceStatus;
  version?: string;
  lastHeartbeat?: number;
  metadataJson?: string;
  createdAt: string;
  updatedAt: string;
}

export enum InstanceStatus {
  RUNNING = 'running',
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  DEGRADED = 'degraded',
  ERROR = 'error',
}

export interface CreateInstanceRequest {
  name: string;
  endpoint: string;
  apiKey: string;
  manager_endpoint?: string;
  port?: number;
  admin_token?: string;
}

export interface UpdateInstanceRequest {
  name?: string;
  endpoint?: string;
  manager_endpoint?: string;
  port?: number;
  apiKey?: string;
  status?: InstanceStatus;
}

// ==================== Token 监控类型 ====================

export interface TokenStats {
  today: number;
  todayCost: number;
  monthly: number;
  monthlyCost: number;
  budget: number;
  remaining: number;
}

export interface TokenHistoryItem {
  id: string;
  instanceId: string;
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  departmentId?: string | null;
  departmentName?: string;
}

export interface TokenHistoryRequest {
  date?: string;
  instanceId?: string;
  startDate?: string;
  endDate?: string;
}

// ==================== 密钥管理类型 ====================

export interface ApiKey {
  id: string;
  maskedValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveApiKeyRequest {
  keyId: string;
  keyValue: string;
}

// ==================== Skills 管理类型 ====================

export interface Skill {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  installedAt?: string;
  installed: boolean;
  enabled: boolean;
  dependencies?: string[];
}

export interface InstallSkillRequest {
  skillId: string;
}

export interface SkillsScanResult {
  name: string;
  version: string;
  risk: 'low' | 'medium' | 'high';
  issues: string[];
}

export interface SkillsScanReport {
  skills: SkillsScanResult[];
  totalRisk: string;
}

// ==================== 价格表类型 ====================

export interface ModelPrice {
  input: number;
  output: number;
}

export interface PriceTable {
  [model: string]: ModelPrice;
}

// ==================== 错误知识库类型 ====================

export interface ErrorExplanation {
  errorCode: string;
  errorMessage: string;
  explanationZh: string;
  solutionZh: string;
  updatedAt: string;
}

export interface UnknownErrorReport {
  errorCode: string;
  errorMessage: string;
  context: string;
  timestamp: string;
}

// ==================== 部署类型 ====================

export enum DeployMode {
  WINDOWS = 'windows',
  WSL2 = 'wsl2',
  DOCKER = 'docker',
}

export interface DeployConfig {
  installPath?: string;
  port?: number;
  autoStart?: boolean;
}

export interface DeployRequest {
  mode: DeployMode;
  config: DeployConfig;
}

export interface DeployStatus {
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  message?: string;
  error?: string;
}

// ==================== 环境检查类型 ====================

export interface EnvironmentCheckItem {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
  fixable: boolean;
}

export interface EnvironmentReport {
  items: EnvironmentCheckItem[];
  overall: 'ok' | 'warning' | 'error';
}

// ==================== 部门管理类型 ====================

export interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
}

// ==================== 审计日志类型 ====================

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  resource: string;
  operation: string;
  riskLevel: 'L' | 'M' | 'H';
  result: 'success' | 'failure';
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogFilter {
  userId?: string;
  resource?: string;
  operation?: string;
  riskLevel?: 'L' | 'M' | 'H';
  startDate?: string;
  endDate?: string;
  result?: 'success' | 'failure';
}

// ==================== 配置管理类型 ====================

export interface Config {
  id: string;
  name: string;
  description?: string;
  configJson: string;
  openclawVersionRange: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfigRequest {
  name: string;
  description?: string;
  configJson: string;
  openclawVersionRange: string;
}

export interface UpdateConfigRequest {
  name?: string;
  description?: string;
  configJson?: string;
  openclawVersionRange?: string;
}

// ==================== 用户管理类型 ====================

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  departmentId?: string;
}

export interface UpdateUserRequest {
  username?: string;
  role?: UserRole;
  departmentId?: string;
}

// ==================== OAuth/SAML 类型 ====================

export interface OAuthConfig {
  id: string;
  provider: string;
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  enabled: boolean;
}

export interface SAMLConfig {
  id: string;
  provider: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  enabled: boolean;
}

// ==================== 备份类型 ====================

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  checksum?: string;
}

export interface BackupRequest {
  description?: string;
}

export interface RestoreRequest {
  backupId: string;
}

// ==================== 导出报表类型 ====================

export interface CostReport {
  startDate: string;
  endDate: string;
  totalCost: number;
  totalTokens: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  byInstance: Record<string, { tokens: number; cost: number }>;
}

export interface ExportRequest {
  format: 'csv' | 'json' | 'xlsx';
  startDate: string;
  endDate: string;
}
