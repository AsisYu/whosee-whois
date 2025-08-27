import { logger } from './logger';
import { createErrorContext, globalErrorHandler } from './errorHandling';

/**
 * 请求去重管理器
 * 防止相同的请求同时发起多次
 */
export class RequestDeduplicator {
  private static instance: RequestDeduplicator;
  private pendingRequests = new Map<string, Promise<unknown>>();
  private requestCounts = new Map<string, number>();
  private readonly maxConcurrentRequests = 10;
  private readonly requestTimeout = 30000; // 30秒超时

  static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator();
    }
    return RequestDeduplicator.instance;
  }

  /**
   * 执行去重请求
   */
  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      timeout?: number;
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): Promise<T> {
    const { timeout = this.requestTimeout, priority = 'medium' } = options;
    
    // 检查是否已有相同请求在进行
    if (this.pendingRequests.has(key)) {
      logger.info('请求去重命中', { key, priority });
      this.incrementRequestCount(key);
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // 检查并发请求数量限制
    if (this.pendingRequests.size >= this.maxConcurrentRequests) {
      if (priority === 'low') {
        throw new Error('并发请求数量已达上限，低优先级请求被拒绝');
      }
      // 等待一些请求完成
      await this.waitForSlot();
    }

    logger.info('开始新请求', { key, priority, pendingCount: this.pendingRequests.size });
    
    // 创建带超时的请求
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`请求超时: ${key}`)), timeout);
    });

    const requestPromise = Promise.race([
      requestFn(),
      timeoutPromise
    ]).finally(() => {
      // 请求完成后清理
      this.pendingRequests.delete(key);
      this.requestCounts.delete(key);
      logger.info('请求完成并清理', { key, remainingCount: this.pendingRequests.size });
    });

    this.pendingRequests.set(key, requestPromise);
    this.requestCounts.set(key, 1);

    return requestPromise;
  }

  /**
   * 等待请求槽位
   */
  private async waitForSlot(): Promise<void> {
    const maxWaitTime = 5000; // 最多等待5秒
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkSlot = () => {
        if (this.pendingRequests.size < this.maxConcurrentRequests) {
          resolve();
          return;
        }
        
        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('等待请求槽位超时'));
          return;
        }
        
        setTimeout(checkSlot, 100);
      };
      
      checkSlot();
    });
  }

  /**
   * 增加请求计数
   */
  private incrementRequestCount(key: string): void {
    const count = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, count + 1);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    pendingRequests: number;
    totalRequests: number;
    requestKeys: string[];
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      totalRequests: Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0),
      requestKeys: Array.from(this.pendingRequests.keys())
    };
  }

  /**
   * 清理所有请求
   */
  clear(): void {
    this.pendingRequests.clear();
    this.requestCounts.clear();
    logger.info('请求去重器已清理');
  }

  // 兼容方法：deduplicate(key, fn) -> executeRequest(key, fn)
  deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    return this.executeRequest<T>(key, requestFn);
  }
}

/**
 * 批量处理管理器
 * 将多个请求合并为批次处理
 */
export class BatchProcessor<T, R> {
  private batchQueue: Array<{
    item: T;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly batchDelay: number;
  private readonly maxWaitTime: number;

  constructor(
    private processBatch: (items: T[]) => Promise<R[]>,
    options: {
      batchSize?: number;
      batchDelay?: number;
      maxWaitTime?: number;
    } = {}
  ) {
    this.batchSize = options.batchSize || 5;
    this.batchDelay = options.batchDelay || 100;
    this.maxWaitTime = options.maxWaitTime || 5000;
  }

  /**
   * 添加项目到批处理队列
   */
  async process(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.batchQueue.push({
        item,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // 如果达到批次大小，立即处理
      if (this.batchQueue.length >= this.batchSize) {
        this.processBatchQueue();
      } else {
        // 否则设置延迟处理
        this.scheduleBatchProcessing();
      }
    });
  }

  /**
   * 调度批处理
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      return; // 已经有定时器在运行
    }

    this.batchTimer = setTimeout(() => {
      this.processBatchQueue();
    }, this.batchDelay);
  }

  /**
   * 处理批次队列
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) {
      return;
    }

    // 检查是否有超时的项目
    const now = Date.now();
    const validItems = this.batchQueue.filter(item => {
      if (now - item.timestamp > this.maxWaitTime) {
        item.reject(new Error('批处理等待超时'));
        return false;
      }
      return true;
    });

    if (validItems.length === 0) {
      this.batchQueue = [];
      return;
    }

    const currentBatch = validItems.splice(0, this.batchSize);
    this.batchQueue = validItems;

    logger.info('开始批处理', { 
      batchSize: currentBatch.length, 
      remainingQueue: this.batchQueue.length 
    });

    try {
      const items = currentBatch.map(item => item.item);
      const results = await this.processBatch(items);

      // 分发结果
      currentBatch.forEach((item, index) => {
        if (index < results.length) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error('批处理结果不完整'));
        }
      });

      logger.logPerformance(
        'batch-processing',
        Date.now() - startTime,
        true,
        {
          processedCount: currentBatch.length,
          successCount: results.length
        }
      );
    } catch (error) {
      logger.error('批处理失败', { error: error instanceof Error ? error.message : '未知错误' });
      
      // 所有项目都失败
      currentBatch.forEach(item => {
        item.reject(error instanceof Error ? error : new Error('批处理失败'));
      });
    }

    // 如果还有队列项目，继续处理
    if (this.batchQueue.length > 0) {
      this.scheduleBatchProcessing();
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    oldestItemAge: number;
  } {
    const now = Date.now();
    const oldestItem = this.batchQueue[0];
    
    return {
      queueLength: this.batchQueue.length,
      isProcessing: this.batchTimer !== null,
      oldestItemAge: oldestItem ? now - oldestItem.timestamp : 0
    };
  }

  /**
   * 清理队列
   */
  clear(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // 拒绝所有待处理的项目
    this.batchQueue.forEach(item => {
      item.reject(new Error('批处理器已清理'));
    });
    
    this.batchQueue = [];
    logger.info('批处理器已清理');
  }
}

/**
 * 资源管理器
 * 管理内存使用和资源清理
 */
export class ResourceManager {
  private static instance: ResourceManager;
  private memoryUsageThreshold = 100 * 1024 * 1024; // 100MB
  private cleanupCallbacks: Array<() => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly monitoringIntervalMs = 30000; // 30秒

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * 开始资源监控
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // 已经在监控
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.monitoringIntervalMs);

    logger.info('资源监控已启动');
  }

  /**
   * 停止资源监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('资源监控已停止');
    }
  }

  /**
   * 注册清理回调
   */
  registerCleanupCallback(callback: () => void): () => void {
    this.cleanupCallbacks.push(callback);
    return () => {
      const index = this.cleanupCallbacks.indexOf(callback);
      if (index > -1) {
        this.cleanupCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const usedMemory = memory.usedJSHeapSize;
      
      logger.logPerformance(
        'memory-usage-check',
        0,
        true,
        {
          usedMemory,
          totalMemory: memory.totalJSHeapSize,
          memoryLimit: memory.jsHeapSizeLimit,
          usagePercentage: (usedMemory / memory.jsHeapSizeLimit * 100).toFixed(2)
      });

      if (usedMemory > this.memoryUsageThreshold) {
        logger.warn('内存使用量过高，触发清理', { usedMemory, threshold: this.memoryUsageThreshold });
        this.triggerCleanup();
      }
    }
  }

  /**
   * 触发资源清理
   */
  private triggerCleanup(): void {
    logger.info('开始资源清理', { callbackCount: this.cleanupCallbacks.length });
    
    this.cleanupCallbacks.forEach((callback, index) => {
      try {
        callback();
      } catch (error) {
        logger.error(`清理回调 ${index} 执行失败`, { error: error instanceof Error ? error.message : '未知错误' });
      }
    });

    // 强制垃圾回收（如果可用）
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as Window & { gc?: () => void }).gc?.();
        logger.info('手动垃圾回收已触发');
      } catch (error) {
        // 忽略垃圾回收错误
      }
    }
  }

  /**
   * 手动触发清理
   */
  forceCleanup(): void {
    this.triggerCleanup();
  }

  /**
   * 获取资源状态
   */
  getResourceStatus(): {
    isMonitoring: boolean;
    cleanupCallbackCount: number;
    memoryInfo?: {
      used: number;
      total: number;
      limit: number;
    };
  } {
    const status: Record<string, unknown> = {
      isMonitoring: this.monitoringInterval !== null,
      cleanupCallbackCount: this.cleanupCallbacks.length
    };

    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      status.memoryInfo = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }

    return status;
  }

  // 提供内存使用获取，供调用方度量
  getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      return memory?.usedJSHeapSize || 0;
    }
    return 0;
  }
}

// 导出单例实例
export const requestDeduplicator = RequestDeduplicator.getInstance();
export const resourceManager = ResourceManager.getInstance();

// 自动启动资源监控
if (typeof window !== 'undefined') {
  resourceManager.startMonitoring();
}