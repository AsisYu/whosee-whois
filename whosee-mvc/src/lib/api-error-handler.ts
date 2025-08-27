import { 
  AppError, 
  NetworkError, 
  ValidationError, 
  AuthenticationError, 
  PermissionError, 
  BusinessLogicError,
  SystemError,
  ErrorCategory,
  ErrorSeverity,
  createErrorContext,
  globalErrorHandler
} from './error-handler';
import { logger } from './logger';

// API错误响应接口
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId?: string;
  };
}

// API成功响应接口
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// API响应类型
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// HTTP状态码到错误类型的映射
const HTTP_STATUS_TO_ERROR_TYPE: Record<number, typeof AppError> = {
  400: ValidationError,
  401: AuthenticationError,
  403: PermissionError,
  404: BusinessLogicError,
  422: ValidationError,
  429: NetworkError,
  500: SystemError,
  502: NetworkError,
  503: NetworkError,
  504: NetworkError
};

// 错误代码到错误类型的映射
const ERROR_CODE_TO_TYPE: Record<string, typeof AppError> = {
  'VALIDATION_ERROR': ValidationError,
  'AUTHENTICATION_ERROR': AuthenticationError,
  'PERMISSION_ERROR': PermissionError,
  'NETWORK_ERROR': NetworkError,
  'BUSINESS_LOGIC_ERROR': BusinessLogicError,
  'SYSTEM_ERROR': SystemError,
  'RATE_LIMIT_ERROR': NetworkError,
  'TIMEOUT_ERROR': NetworkError
};

// API错误处理器类
export class ApiErrorHandler {
  private requestId: string;
  private endpoint: string;
  private method: string;
  private startTime: number;

  constructor(endpoint: string, method: string = 'GET') {
    this.endpoint = endpoint;
    this.method = method;
    this.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
  }

  // 处理fetch响应
  public async handleResponse(response: Response): Promise<unknown> {
    const duration = Date.now() - this.startTime;
    
    try {
      // 记录请求性能
      logger.logPerformance(
        `api-request-${this.method}-${this.endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`,
        duration,
        response.ok,
        {
          requestId: this.requestId,
          method: this.method,
          endpoint: this.endpoint,
          status: response.status
        }
      );

      if (!response.ok) {
        await this.handleHttpError(response, duration);
      }

      const data = await response.json();
      
      // 检查业务逻辑错误
      if (data && !data.success && data.error) {
        this.handleBusinessError(data, duration);
      }

      return data;
    } catch (error) {
      this.handleParseError(error as Error, response, duration);
    }
  }

  // 处理HTTP错误
  private async handleHttpError(response: Response, duration: number): Promise<never> {
    let errorData: Record<string, unknown> = {};
    
    try {
      errorData = await response.json();
    } catch {
      // 如果无法解析响应体，使用默认错误信息
      errorData = {
        error: {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'Unknown error'
        }
      };
    }

    const ErrorClass = HTTP_STATUS_TO_ERROR_TYPE[response.status] || SystemError;
    const isRetryable = this.isRetryableStatus(response.status);
    
    const context = createErrorContext(
      'api-client',
      `${this.method} ${this.endpoint}`,
      {
        requestId: this.requestId,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        duration,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        errorData
      }
    );

    const error = new ErrorClass(
      errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      context,
      isRetryable
    );

    // 记录错误
    globalErrorHandler.reportError(error, context, true);
    
    throw error;
  }

  // 处理业务逻辑错误
  private handleBusinessError(data: ApiErrorResponse, duration: number): never {
    const { error: errorInfo } = data;
    const ErrorClass = ERROR_CODE_TO_TYPE[errorInfo.code] || BusinessLogicError;
    
    const context = createErrorContext(
      'api-client',
      `${this.method} ${this.endpoint}`,
      {
        requestId: this.requestId,
        errorCode: errorInfo.code,
        errorDetails: errorInfo.details,
        duration,
        businessError: true
      }
    );

    const error = new ErrorClass(
      errorInfo.message,
      context,
      false // 业务逻辑错误通常不可重试
    );

    // 记录错误
    globalErrorHandler.reportError(error, context, true);
    
    throw error;
  }

  // 处理响应解析错误
  private handleParseError(error: Error, response: Response, duration: number): never {
    const context = createErrorContext(
      'api-client',
      `${this.method} ${this.endpoint}`,
      {
        requestId: this.requestId,
        parseError: true,
        httpStatus: response.status,
        duration,
        originalError: error.message
      }
    );

    const parseError = new SystemError(
      `Failed to parse response: ${error.message}`,
      context,
      false
    );

    // 记录错误
    globalErrorHandler.reportError(parseError, context, true);
    
    throw parseError;
  }

  // 处理网络错误
  public handleNetworkError(error: Error): never {
    const duration = Date.now() - this.startTime;
    
    const context = createErrorContext(
      'api-client',
      `${this.method} ${this.endpoint}`,
      {
        requestId: this.requestId,
        networkError: true,
        duration,
        originalError: error.message
      }
    );

    const networkError = new NetworkError(
      `Network request failed: ${error.message}`,
      context,
      true // 网络错误通常可重试
    );

    // 记录错误
    globalErrorHandler.reportError(networkError, context, true);
    
    throw networkError;
  }

  // 处理超时错误
  public handleTimeoutError(): never {
    const duration = Date.now() - this.startTime;
    
    const context = createErrorContext(
      'api-client',
      `${this.method} ${this.endpoint}`,
      {
        requestId: this.requestId,
        timeoutError: true,
        duration
      }
    );

    const timeoutError = new NetworkError(
      `Request timeout after ${duration}ms`,
      context,
      true // 超时错误可重试
    );

    // 记录错误
    globalErrorHandler.reportError(timeoutError, context, true);
    
    throw timeoutError;
  }

  // 判断HTTP状态码是否可重试
  private isRetryableStatus(status: number): boolean {
    // 5xx服务器错误和部分4xx错误可重试
    return status >= 500 || status === 408 || status === 429;
  }

  // 获取请求ID
  public getRequestId(): string {
    return this.requestId;
  }
}

// 增强的fetch函数
export async function enhancedFetch(
  url: string,
  options: RequestInit = {},
  timeout: number = 30000
): Promise<unknown> {
  const method = options.method || 'GET';
  const errorHandler = new ApiErrorHandler(url, method);
  
  // 创建超时控制器
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    // 合并选项
    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': errorHandler.getRequestId(),
        ...options.headers
      }
    };

    // 记录请求开始
    logger.debug(
      `Starting API request: ${method} ${url}`,
      'api-client',
      {
        requestId: errorHandler.getRequestId(),
        method,
        url,
        headers: fetchOptions.headers
      }
    );

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    return await errorHandler.handleResponse(response);
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorHandler.handleTimeoutError();
      } else if (error instanceof AppError) {
        // 重新抛出已处理的错误
        throw error;
      } else {
        errorHandler.handleNetworkError(error);
      }
    }
    
    throw error;
  }
}

// API客户端基类
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(
    baseUrl: string = '',
    defaultHeaders: Record<string, string> = {},
    timeout: number = 30000
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
    this.timeout = timeout;
  }

  // GET请求
  public async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>(url, { method: 'GET' });
  }

  // POST请求
  public async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // PUT请求
  public async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // DELETE请求
  public async delete<T = unknown>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>(url, { method: 'DELETE' });
  }

  // PATCH请求
  public async patch<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // 通用请求方法
  private async request<T>(url: string, options: RequestInit): Promise<T> {
    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    return enhancedFetch(url, mergedOptions, this.timeout);
  }

  // 构建URL
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  // 设置默认头部
  public setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  // 移除默认头部
  public removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  // 设置超时时间
  public setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}

// 创建默认API客户端实例
export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  {
    'Content-Type': 'application/json'
  }
);

// 错误处理工具函数
export function isApiError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isPermissionError(error: unknown): error is PermissionError {
  return error instanceof PermissionError;
}

export function isBusinessLogicError(error: unknown): error is BusinessLogicError {
  return error instanceof BusinessLogicError;
}

export function isSystemError(error: unknown): error is SystemError {
  return error instanceof SystemError;
}

// 错误恢复策略
export class ErrorRecoveryStrategy {
  // 自动重试策略
  public static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // 如果是不可重试的错误，直接抛出
        if (error instanceof AppError && !error.isRetryable) {
          throw error;
        }
        
        // 如果是最后一次尝试，抛出错误
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
      }
    }
    
    throw lastError!;
  }

  // 降级策略
  public static async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T> | T
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      logger.warn(
        'Primary operation failed, using fallback',
        'error-recovery',
        { error: error instanceof Error ? error.message : String(error) }
      );
      
      return await fallback();
    }
  }

  // 断路器模式
  public static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000
  ) {
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (): Promise<T> => {
      const now = Date.now();
      
      // 检查是否应该重置断路器
      if (state === 'OPEN' && now - lastFailureTime > resetTimeoutMs) {
        state = 'HALF_OPEN';
        failureCount = 0;
      }
      
      // 如果断路器打开，直接抛出错误
      if (state === 'OPEN') {
        throw new SystemError(
          'Circuit breaker is open',
          createErrorContext('circuit-breaker', 'execute'),
          false
        );
      }
      
      try {
        const result = await operation();
        
        // 成功时重置计数器
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
        }
        failureCount = 0;
        
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;
        
        // 如果失败次数超过阈值，打开断路器
        if (failureCount >= failureThreshold) {
          state = 'OPEN';
          
          logger.warn(
            `Circuit breaker opened after ${failureCount} failures`,
            'circuit-breaker'
          );
        }
        
        throw error;
      }
    };
  }
}

export default {
  ApiErrorHandler,
  enhancedFetch,
  ApiClient,
  apiClient,
  ErrorRecoveryStrategy
};