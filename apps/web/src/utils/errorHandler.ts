// 统一错误处理工具

/**
 * 应用错误类型定义
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * 统一错误结构
 */
export interface AppError {
  type: ErrorType;
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  stack?: string;
}

/**
 * 错误级别
 */
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 错误处理配置
 */
export interface ErrorConfig {
  silent?: boolean;
  logToConsole?: boolean;
  reportToServer?: boolean;
  userMessage?: string;
}

/**
 * 创建应用错误
 */
export function createError(
  type: ErrorType,
  code: string,
  message: string,
  details?: string,
  stack?: string
): AppError {
  return {
    type,
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    stack,
  };
}

/**
 * 从 HTTP 响应创建错误
 */
export function createHttpError(
  status: number,
  statusText: string,
  responseBody?: string
): AppError {
  let type: ErrorType;
  let code: string;

  if (status >= 500) {
    type = ErrorType.SERVER;
    code = `HTTP_${status}`;
  } else if (status === 404) {
    type = ErrorType.NOT_FOUND;
    code = 'NOT_FOUND';
  } else if (status === 401 || status === 403) {
    type = ErrorType.AUTH;
    code = status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
  } else if (status >= 400) {
    type = ErrorType.VALIDATION;
    code = `HTTP_${status}`;
  } else {
    type = ErrorType.UNKNOWN;
    code = 'UNKNOWN';
  }

  return createError(
    type,
    code,
    `HTTP Error: ${status} ${statusText}`,
    responseBody
  );
}

/**
 * 从 Tauri invoke 错误创建应用错误
 */
export function createInvokeError(error: unknown): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // 检查是否是权限错误
  if (errorMessage.includes('权限不足')) {
    return createError(
      ErrorType.PERMISSION,
      'PERMISSION_DENIED',
      '权限不足，无法执行此操作',
      errorMessage
    );
  }
  
  // 检查是否是认证错误
  if (errorMessage.includes('token') || errorMessage.includes('认证')) {
    return createError(
      ErrorType.AUTH,
      'AUTH_FAILED',
      '认证失败，请重新登录',
      errorMessage
    );
  }
  
  // 检查是否是网络错误
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return createError(
      ErrorType.NETWORK,
      'NETWORK_ERROR',
      '网络错误，请检查网络连接',
      errorMessage
    );
  }
  
  // 默认未知错误
  return createError(
    ErrorType.UNKNOWN,
    'UNKNOWN_ERROR',
    '发生未知错误',
    errorMessage
  );
}

/**
 * 获取错误的用户友好消息
 */
export function getUserMessage(error: AppError): string {
  const defaultMessages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: '网络连接失败，请检查网络后重试',
    [ErrorType.AUTH]: '认证失败，请重新登录',
    [ErrorType.PERMISSION]: '权限不足，无法执行此操作',
    [ErrorType.VALIDATION]: '数据验证失败，请检查输入',
    [ErrorType.NOT_FOUND]: '请求的资源不存在',
    [ErrorType.SERVER]: '服务器错误，请稍后重试',
    [ErrorType.UNKNOWN]: '发生错误，请稍后重试',
  };

  return defaultMessages[error.type];
}

/**
 * 错误日志记录
 */
export function logError(
  error: AppError,
  level: ErrorLevel = ErrorLevel.ERROR,
  context?: string
): void {
  const logEntry = {
    level,
    error,
    context,
    timestamp: new Date().toISOString(),
  };

  // 控制台日志
  console.error('[App Error]', logEntry);

  // TODO: 发送到错误收集服务
  // if (error.type !== ErrorType.UNKNOWN || level === ErrorLevel.CRITICAL) {
  //   sendToErrorService(logEntry);
  // }
}

/**
 * 错误恢复策略
 */
export enum RecoveryStrategy {
  NONE = 'none',           // 不恢复
  RETRY = 'retry',         // 重试
  REFRESH = 'refresh',     // 刷新页面
  RELOGIN = 'relogin',     // 重新登录
  FALLBACK = 'fallback',   // 使用备用方案
}

/**
 * 获取错误的恢复策略
 */
export function getRecoveryStrategy(error: AppError): RecoveryStrategy {
  switch (error.type) {
    case ErrorType.NETWORK:
      return RecoveryStrategy.RETRY;
    case ErrorType.AUTH:
      return RecoveryStrategy.RELOGIN;
    case ErrorType.SERVER:
      return RecoveryStrategy.RETRY;
    case ErrorType.PERMISSION:
      return RecoveryStrategy.NONE;
    case ErrorType.NOT_FOUND:
      return RecoveryStrategy.FALLBACK;
    default:
      return RecoveryStrategy.NONE;
  }
}

/**
 * 带重试的错误处理
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * 错误边界包装器
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  config?: ErrorConfig
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const appError = createInvokeError(error);
    
    if (!config?.silent) {
      logError(appError, ErrorLevel.ERROR, config?.userMessage);
    }
    
    return { success: false, error: appError };
  }
}
