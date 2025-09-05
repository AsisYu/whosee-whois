import { BaseModel } from '@/models/BaseModel';
import { logger } from '@/lib/logger';
import { 
  errorRetryManager, 
  globalErrorHandler, 
  createErrorContext,
  BusinessLogicError,
  ValidationError
} from '@/lib/error-handler';

/**
 * 基础控制器类 - 提供通用的业务逻辑处理
 */
export abstract class BaseController<T> {
  protected model: BaseModel<T>;
  protected subscribers: Set<() => void> = new Set();

  constructor(model: BaseModel<T>) {
    this.model = model;
    this.setupModelSubscription();
  }

  /**
   * 设置模型订阅
   */
  private setupModelSubscription(): void {
    this.model.subscribe(() => {
      this.notifySubscribers();
    });
  }

  /**
   * 获取数据
   */
  getData(): T | null {
    return this.model.getData();
  }

  /**
   * 获取加载状态
   */
  isLoading(): boolean {
    return this.model.isLoading();
  }

  /**
   * 获取错误信息
   */
  getError(): string | null {
    return this.model.getError();
  }

  /**
   * 清除数据
   */
  clear(): void {
    this.model.clear();
  }

  /**
   * 订阅状态变化
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * 通知订阅者
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }

  /**
   * 验证输入参数
   */
  protected validateInput(input: unknown, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of rules) {
      const error = rule.validate(input);
      if (error) {
        errors.push(error);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 处理异步操作 - 集成日志记录和错误处理
   */
  protected async handleAsyncOperation<R>(
    operation: () => Promise<R>,
    operationName: string,
    onSuccess?: (result: R) => void,
    onError?: (error: Error) => void
  ): Promise<R | null> {
    const startTime = Date.now();
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`开始执行操作: ${operationName}`, { operationId });
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      logger.logPerformance(
        `operation-${operationName}`,
        duration,
        true,
        {
          operationId,
          operationName
        }
      );
      
      logger.userBehavior(`用户操作成功: ${operationName}`, {
        operationId,
        duration
      });
      
      onSuccess?.(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error('未知错误');
      
      logger.error(`操作失败: ${operationName}`, {
        operationId,
        duration,
        error: err.message,
        stack: err.stack
      });
      
      // 创建错误上下文并报告
      const errorContext = createErrorContext({
        operationId,
        operationName,
        duration,
        errorMessage: err.message
      });
      
      globalErrorHandler.handleError(err, errorContext);
      
      onError?.(err);
      return null;
    }
  }

  /**
   * 带重试机制的异步操作
   */
  protected async handleAsyncOperationWithRetry<R>(
    operation: () => Promise<R>,
    operationName: string,
    retryOptions?: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
    },
    onSuccess?: (result: R) => void,
    onError?: (error: Error) => void
  ): Promise<R | null> {
    const startTime = Date.now();
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`开始执行带重试的操作: ${operationName}`, { operationId, retryOptions });
    
    try {
      const result = await errorRetryManager.executeWithRetry(
        operation,
        {
          maxAttempts: retryOptions?.maxAttempts || 3,
          baseDelay: retryOptions?.baseDelay || 1000,
          maxDelay: retryOptions?.maxDelay || 5000
        }
      );
      
      const duration = Date.now() - startTime;
      
      logger.logPerformance(
        `retry-operation-${operationName}`,
        duration,
        true,
        {
          operationId,
          operationName,
        success: true
      });
      
      logger.userBehavior(`用户操作成功(带重试): ${operationName}`, {
        operationId,
        duration
      });
      
      onSuccess?.(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error('未知错误');
      
      logger.error(`带重试操作失败: ${operationName}`, {
        operationId,
        duration,
        error: err.message,
        stack: err.stack
      });
      
      // 创建错误上下文并报告
      const errorContext = createErrorContext({
        operationId,
        operationName: `${operationName}(带重试)`,
        duration,
        errorMessage: err.message,
        retryOptions
      });
      
      globalErrorHandler.handleError(err, errorContext);
      
      onError?.(err);
      return null;
    }
  }

  /**
   * 防抖处理
   */
  protected debounce<Args extends unknown[]>(
    func: (...args: Args) => void,
    delay: number
  ): (...args: Args) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * 节流处理
   */
  protected throttle<Args extends unknown[]>(
    func: (...args: Args) => void,
    delay: number
  ): (...args: Args) => void {
    let lastCall = 0;
    
    return (...args: Args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * 抽象方法 - 子类需要实现具体的业务逻辑
   */
  abstract execute(...args: unknown[]): Promise<void> | void;
}

/**
 * 验证规则接口
 */
export interface ValidationRule {
  validate(input: unknown): string | null;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 常用验证规则
 */
export class ValidationRules {
  /**
   * 必填验证
   */
  static required(fieldName: string): ValidationRule {
    return {
      validate: (input: unknown) => {
        if (!input || (typeof input === 'string' && input.trim() === '')) {
          return `${fieldName}不能为空`;
        }
        return null;
      }
    };
  }

  /**
   * 最小长度验证
   */
  static minLength(fieldName: string, min: number): ValidationRule {
    return {
      validate: (input: unknown) => {
        if (typeof input === 'string' && input.length < min) {
          return `${fieldName}长度不能少于${min}个字符`;
        }
        return null;
      }
    };
  }

  /**
   * 最大长度验证
   */
  static maxLength(fieldName: string, max: number): ValidationRule {
    return {
      validate: (input: unknown) => {
        if (typeof input === 'string' && input.length > max) {
          return `${fieldName}长度不能超过${max}个字符`;
        }
        return null;
      }
    };
  }

  /**
   * 正则表达式验证
   */
  static pattern(fieldName: string, regex: RegExp, message?: string): ValidationRule {
    return {
      validate: (input: unknown) => {
        if (typeof input === 'string' && !regex.test(input)) {
          return message || `${fieldName}格式不正确`;
        }
        return null;
      }
    };
  }

  /**
   * 域名格式验证
   */
  static domain(fieldName: string = '域名'): ValidationRule {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return this.pattern(fieldName, domainRegex, `${fieldName}格式不正确`);
  }

  /**
   * 邮箱格式验证
   */
  static email(fieldName: string = '邮箱'): ValidationRule {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.pattern(fieldName, emailRegex, `${fieldName}格式不正确`);
  }
}