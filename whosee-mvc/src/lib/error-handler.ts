'use client';

import { logger } from './logger';

// 错误类型定义
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp: string;
  errorId: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

// 错误分类
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 自定义错误类
export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: Partial<ErrorContext>;
  public readonly isRetryable: boolean;
  public readonly errorId: string;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.isRetryable = isRetryable;
    this.errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 确保堆栈跟踪正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// 网络错误
export class NetworkError extends AppError {
  constructor(
    message: string,
    context: Partial<ErrorContext> = {},
    isRetryable: boolean = true
  ) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context, isRetryable);
    this.name = 'NetworkError';
  }
}

// 验证错误
export class ValidationError extends AppError {
  constructor(
    message: string,
    context: Partial<ErrorContext> = {}
  ) {
    super(message, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context, false);
    this.name = 'ValidationError';
  }
}

// 认证错误
export class AuthenticationError extends AppError {
  constructor(
    message: string,
    context: Partial<ErrorContext> = {}
  ) {
    super(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, context, false);
    this.name = 'AuthenticationError';
  }
}

// 权限错误
export class PermissionError extends AppError {
  constructor(
    message: string,
    context: Partial<ErrorContext> = {}
  ) {
    super(message, ErrorCategory.PERMISSION, ErrorSeverity.HIGH, context, false);
    this.name = 'PermissionError';
  }
}

// 业务逻辑错误
export class BusinessLogicError extends AppError {
  constructor(
    message: string,
    context: Partial<ErrorContext> = {},
    isRetryable: boolean = false
  ) {
    super(message, ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, context, isRetryable);
    this.name = 'BusinessLogicError';
  }
}

// 系统错误
export class SystemError extends AppError {
  constructor(
    message: string,
    context: Partial<ErrorContext> = {},
    isRetryable: boolean = true
  ) {
    super(message, ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, context, isRetryable);
    this.name = 'SystemError';
  }
}

// 全局错误处理器类
class GlobalErrorHandler {
  private isInitialized = false;
  private errorQueue: Array<{ error: Error; context: Partial<ErrorContext> }> = [];
  private maxQueueSize = 100;
  private flushInterval = 5000; // 5秒
  private flushTimer?: NodeJS.Timeout;

  // 初始化全局错误处理
  public initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    // 捕获JavaScript错误
    window.addEventListener('error', this.handleGlobalError);
    
    // 捕获资源加载错误
    window.addEventListener('error', this.handleResourceError, true);

    // 启动错误队列刷新定时器
    this.startFlushTimer();

    this.isInitialized = true;
    
    logger.info('Global error handler initialized', 'error-handler');
  }

  // 清理资源
  public cleanup(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('error', this.handleResourceError, true);
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushErrorQueue();
    this.isInitialized = false;
    
    logger.info('Global error handler cleaned up', 'error-handler');
  }

  // 处理未处理的Promise拒绝
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    const context: Partial<ErrorContext> = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      errorId: `unhandled_promise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        type: 'unhandledrejection',
        reason: event.reason
      }
    };

    this.queueError(error, context);
    
    // 阻止默认的控制台错误输出
    event.preventDefault();
  };

  // 处理全局JavaScript错误
  private handleGlobalError = (event: ErrorEvent): void => {
    const error = event.error || new Error(event.message);
    
    const context: Partial<ErrorContext> = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      errorId: `global_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      }
    };

    this.queueError(error, context);
  };

  // 处理资源加载错误
  private handleResourceError = (event: Event): void => {
    const target = event.target as HTMLElement;
    
    if (target && target !== window && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      const error = new Error(`Resource failed to load: ${target.tagName}`);
      
      const context: Partial<ErrorContext> = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        errorId: `resource_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          type: 'resource',
          tagName: target.tagName,
          src: (target as HTMLImageElement | HTMLAnchorElement).src || (target as HTMLAnchorElement).href,
          outerHTML: target.outerHTML
        }
      };

      this.queueError(error, context);
    }
  };

  // 手动报告错误
  public reportError(
    error: Error, 
    context: Partial<ErrorContext> = {},
    immediate: boolean = false
  ): void {
    const enrichedContext: Partial<ErrorContext> = {
      ...context,
      url: context.url || (typeof window !== 'undefined' ? window.location.href : 'unknown'),
      userAgent: context.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : 'unknown'),
      timestamp: context.timestamp || new Date().toISOString(),
      errorId: context.errorId || `manual_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (immediate) {
      this.logError(error, enrichedContext);
    } else {
      this.queueError(error, enrichedContext);
    }
  }

  // 将错误添加到队列
  private queueError(error: Error, context: Partial<ErrorContext>): void {
    this.errorQueue.push({ error, context });
    
    // 如果队列满了，移除最旧的错误
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // 如果是严重错误，立即刷新
    if (error instanceof AppError && error.severity === ErrorSeverity.CRITICAL) {
      this.flushErrorQueue();
    }
  }

  // 记录错误
  private logError(error: Error, context: Partial<ErrorContext>): void {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
      ...(error instanceof AppError ? {
        category: error.category,
        severity: error.severity,
        isRetryable: error.isRetryable
      } : {})
    };

    // 根据错误类型选择日志级别
    if (error instanceof AppError) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          logger.error(`Critical error: ${error.message}`, 'error-handler', errorData, error);
          break;
        case ErrorSeverity.HIGH:
          logger.error(`High severity error: ${error.message}`, 'error-handler', errorData, error);
          break;
        case ErrorSeverity.MEDIUM:
          logger.warn(`Medium severity error: ${error.message}`, 'error-handler', errorData, error);
          break;
        case ErrorSeverity.LOW:
          logger.info(`Low severity error: ${error.message}`, 'error-handler', errorData);
          break;
      }
    } else {
      logger.error(`Unhandled error: ${error.message}`, 'error-handler', errorData, error);
    }
  }

  // 启动刷新定时器
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushErrorQueue();
    }, this.flushInterval);
  }

  // 刷新错误队列
  private flushErrorQueue(): void {
    if (this.errorQueue.length === 0) {
      return;
    }

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    errors.forEach(({ error, context }) => {
      this.logError(error, context);
    });

    logger.debug(`Flushed ${errors.length} errors from queue`, 'error-handler');
  }

  // 获取错误统计
  public getErrorStats(): {
    queueSize: number;
    isInitialized: boolean;
  } {
    return {
      queueSize: this.errorQueue.length,
      isInitialized: this.isInitialized
    };
  }
}

// 创建全局实例
export const globalErrorHandler = new GlobalErrorHandler();

// 错误重试机制
export class ErrorRetryManager {
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000]; // 指数退避

  public async withRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries || this.maxRetries;
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await operation();
        
        // 成功后清除重试计数
        this.retryAttempts.delete(operationId);
        
        if (attempt > 0) {
          logger.info(
            `Operation succeeded after ${attempt} retries`,
            'error-retry',
            { operationId, attempt }
          );
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 记录重试次数
        this.retryAttempts.set(operationId, attempt + 1);
        
        // 如果是最后一次尝试，抛出错误
        if (attempt === retries) {
          logger.error(
            `Operation failed after ${retries} retries`,
            'error-retry',
            { operationId, attempt, error: lastError.message },
            lastError
          );
          throw lastError;
        }
        
        // 检查是否可重试
        if (lastError instanceof AppError && !lastError.isRetryable) {
          logger.warn(
            `Operation marked as non-retryable`,
            'error-retry',
            { operationId, error: lastError.message }
          );
          throw lastError;
        }
        
        // 等待后重试
        const delay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
        
        logger.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`,
          'error-retry',
          { operationId, attempt, delay, error: lastError.message }
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  public getRetryCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  public clearRetryCount(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }
}

// 创建重试管理器实例
export const errorRetryManager = new ErrorRetryManager();

// 工具函数
export function createErrorContext(
  component?: string,
  action?: string,
  metadata?: Record<string, unknown>
): Partial<ErrorContext> {
  return {
    component,
    action,
    metadata,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown'
  };
}

// 错误边界HOC的错误处理
export function handleComponentError(
  error: Error,
  errorInfo: { componentStack?: string },
  componentName?: string
): void {
  const context = createErrorContext(
    componentName,
    'render',
    { componentStack: errorInfo.componentStack }
  );
  
  globalErrorHandler.reportError(error, context, true);
}

// 异步操作错误处理
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  context: Partial<ErrorContext> = {}
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    globalErrorHandler.reportError(err, context);
    return null;
  }
}

// 初始化错误处理系统
export function initializeErrorHandling(): void {
  globalErrorHandler.initialize();
  
  // 在页面卸载时清理
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      globalErrorHandler.cleanup();
    });
  }
}

// 默认导出
export default {
  globalErrorHandler,
  errorRetryManager,
  initializeErrorHandling,
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  PermissionError,
  BusinessLogicError,
  SystemError,
  ErrorCategory,
  ErrorSeverity
};