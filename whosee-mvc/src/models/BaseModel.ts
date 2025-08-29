import { ApiResponse } from '@/types';
import { logger } from '@/lib/logger';

/**
 * 基础模型类 - 提供通用的数据操作方法
 */
export abstract class BaseModel<T> {
  protected data: T | null = null;
  protected loading = false;
  protected error: string | null = null;
  protected listeners: Set<() => void> = new Set();

  constructor() {
    this.data = null;
    this.loading = false;
    this.error = null;
  }

  /**
   * 获取当前数据
   */
  getData(): T | null {
    return this.data;
  }

  /**
   * 获取加载状态
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * 获取错误信息
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * 设置数据
   */
  protected setData(data: T | null): void {
    this.data = data;
    this.notifyListeners();
  }

  /**
   * 设置加载状态
   */
  protected setLoading(loading: boolean): void {
    this.loading = loading;
    this.notifyListeners();
  }

  /**
   * 设置错误信息
   */
  protected setError(error: string | null): void {
    this.error = error;
    this.notifyListeners();
  }

  /**
   * 清除数据
   */
  clear(): void {
    this.data = null;
    this.error = null;
    this.loading = false;
    this.notifyListeners();
  }

  /**
   * 订阅数据变化
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * 处理API响应
   */
  protected async handleApiResponse<R>(
    apiCall: () => Promise<ApiResponse<R>>
  ): Promise<R | null> {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const response = await apiCall();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        this.setError(response.error || response.message || '请求失败');
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.setError(errorMessage);
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 抽象方法 - 子类需要实现具体的数据获取逻辑
   */
  abstract fetch(...args: unknown[]): Promise<void>;
}

/**
 * 单例模式的基础模型
 */
export abstract class SingletonModel<T> extends BaseModel<T> {
  private static instances: Map<string, unknown> = new Map();

  constructor() {
    super();
    const className = this.constructor.name;
    if (SingletonModel.instances.has(className)) {
      return SingletonModel.instances.get(className);
    }
    SingletonModel.instances.set(className, this);
  }

  /**
   * 获取单例实例
   */
  static getInstance<T extends SingletonModel<unknown>>(
    this: new () => T
  ): T {
    const className = this.name;
    if (!SingletonModel.instances.has(className)) {
      new this();
    }
    return SingletonModel.instances.get(className);
  }
}