import { logger } from './logger';
import { createErrorContext, globalErrorHandler, SystemError } from './error-handler';

// 请求状态
export enum RequestStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 缓存项接口
export interface CacheItem<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
  accessCount: number;
  lastAccessed: number;
  size?: number; // 数据大小（字节）
}

// 请求项接口
export interface RequestItem<T = unknown> {
  key: string;
  promise: Promise<T>;
  status: RequestStatus;
  createdAt: number;
  resolvers: Array<(value: T) => void>;
  rejectors: Array<(reason: unknown) => void>;
  metadata?: Record<string, unknown>;
}

// 缓存配置
export interface CacheConfig {
  maxSize: number; // 最大缓存项数
  maxMemory: number; // 最大内存使用（字节）
  defaultTtl: number; // 默认TTL（毫秒）
  cleanupInterval: number; // 清理间隔（毫秒）
  enableMetrics: boolean;
  enablePersistence: boolean; // 是否持久化到localStorage
  persistenceKey: string;
}

// 缓存指标
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
  evictions: number;
  errors: number;
}

// 请求去重和缓存管理器
export class RequestDeduplicationManager {
  private cache = new Map<string, CacheItem>();
  private pendingRequests = new Map<string, RequestItem>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  private memoryUsage = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      maxMemory: 50 * 1024 * 1024, // 50MB
      defaultTtl: 5 * 60 * 1000, // 5分钟
      cleanupInterval: 60 * 1000, // 1分钟
      enableMetrics: true,
      enablePersistence: false,
      persistenceKey: 'whosee_cache',
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0,
      evictions: 0,
      errors: 0
    };

    this.startCleanupTimer();
    
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      this.loadFromPersistence();
    }

    logger.info(
      'Request deduplication manager initialized',
      'request-deduplication',
      {
        maxSize: this.config.maxSize,
        maxMemory: this.config.maxMemory,
        defaultTtl: this.config.defaultTtl,
        enablePersistence: this.config.enablePersistence
      }
    );
  }

  // 执行请求（带去重和缓存）
  public async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      metadata?: Record<string, unknown>;
      enableCache?: boolean;
    } = {}
  ): Promise<T> {
    const {
      ttl = this.config.defaultTtl,
      forceRefresh = false,
      metadata = {},
      enableCache = true
    } = options;

    this.metrics.totalRequests++;

    try {
      // 检查缓存（如果启用且不强制刷新）
      if (enableCache && !forceRefresh) {
        const cachedItem = this.getFromCache(key);
        if (cachedItem) {
          this.metrics.hits++;
          this.updateHitRate();
          
          logger.debug(
            `Cache hit for key: ${key}`,
            'request-deduplication',
            {
              key,
              age: Date.now() - cachedItem.timestamp,
              accessCount: cachedItem.accessCount
            }
          );
          
          return cachedItem.data;
        }
      }

      this.metrics.misses++;
      this.updateHitRate();

      // 检查是否有相同的请求正在进行
      const existingRequest = this.pendingRequests.get(key);
      if (existingRequest && existingRequest.status === RequestStatus.PENDING) {
        logger.debug(
          `Deduplicating request for key: ${key}`,
          'request-deduplication',
          {
            key,
            existingRequestAge: Date.now() - existingRequest.createdAt,
            resolversCount: existingRequest.resolvers.length
          }
        );

        // 返回现有请求的Promise
        return new Promise<T>((resolve, reject) => {
          existingRequest.resolvers.push(resolve);
          existingRequest.rejectors.push(reject);
        });
      }

      // 创建新的请求项
      const requestItem: RequestItem<T> = {
        key,
        promise: this.executeRequest(key, requestFn, ttl, enableCache),
        status: RequestStatus.PENDING,
        createdAt: Date.now(),
        resolvers: [],
        rejectors: [],
        metadata
      };

      this.pendingRequests.set(key, requestItem);

      logger.debug(
        `Starting new request for key: ${key}`,
        'request-deduplication',
        { key, ttl, enableCache, metadata }
      );

      // 执行请求
      const result = await requestItem.promise;
      
      // 通知所有等待的resolvers
      requestItem.resolvers.forEach(resolve => resolve(result));
      
      return result;

    } catch (error) {
      this.metrics.errors++;
      
      const requestItem = this.pendingRequests.get(key);
      if (requestItem) {
        // 通知所有等待的rejectors
        requestItem.rejectors.forEach(reject => reject(error));
      }
      
      logger.error(
        `Request failed for key: ${key}`,
        'request-deduplication',
        {
          key,
          error: error instanceof Error ? error.message : String(error),
          metadata
        },
        error instanceof Error ? error : undefined
      );
      
      throw error;
    } finally {
      // 清理请求项
      this.pendingRequests.delete(key);
    }
  }

  // 执行实际请求
  private async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number,
    enableCache: boolean
  ): Promise<T> {
    try {
      const result = await requestFn();
      
      // 缓存结果（如果启用）
      if (enableCache) {
        this.setCache(key, result, ttl);
      }
      
      const requestItem = this.pendingRequests.get(key);
      if (requestItem) {
        requestItem.status = RequestStatus.COMPLETED;
      }
      
      return result;
    } catch (error) {
      const requestItem = this.pendingRequests.get(key);
      if (requestItem) {
        requestItem.status = RequestStatus.FAILED;
      }
      
      throw error;
    }
  }

  // 从缓存获取数据
  private getFromCache<T>(key: string): CacheItem<T> | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.updateMemoryUsage();
      return null;
    }
    
    // 更新访问信息
    item.accessCount++;
    item.lastAccessed = Date.now();
    
    return item as CacheItem<T>;
  }

  // 设置缓存
  private setCache<T>(key: string, data: T, ttl: number): void {
    try {
      // 计算数据大小
      const size = this.calculateSize(data);
      
      // 检查内存限制
      if (this.memoryUsage + size > this.config.maxMemory) {
        this.evictLRU(size);
      }
      
      // 检查数量限制
      if (this.cache.size >= this.config.maxSize) {
        this.evictLRU();
      }
      
      const cacheItem: CacheItem<T> = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 1,
        lastAccessed: Date.now(),
        size
      };
      
      this.cache.set(key, cacheItem);
      this.updateMemoryUsage();
      
      logger.debug(
        `Cached data for key: ${key}`,
        'request-deduplication',
        {
          key,
          size,
          ttl,
          cacheSize: this.cache.size,
          memoryUsage: this.memoryUsage
        }
      );
      
    } catch (error) {
      logger.error(
        `Failed to cache data for key: ${key}`,
        'request-deduplication',
        {
          key,
          error: error instanceof Error ? error.message : String(error)
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  // LRU淘汰策略
  private evictLRU(requiredSize?: number): void {
    const items = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    let freedSize = 0;
    let evictedCount = 0;
    
    for (const item of items) {
      this.cache.delete(item.key);
      freedSize += item.size || 0;
      evictedCount++;
      this.metrics.evictions++;
      
      // 如果指定了所需大小，检查是否已释放足够空间
      if (requiredSize && freedSize >= requiredSize) {
        break;
      }
      
      // 如果没有指定大小，只淘汰一个项目
      if (!requiredSize) {
        break;
      }
    }
    
    this.updateMemoryUsage();
    
    logger.debug(
      `Evicted ${evictedCount} items from cache`,
      'request-deduplication',
      {
        evictedCount,
        freedSize,
        remainingSize: this.cache.size,
        memoryUsage: this.memoryUsage
      }
    );
  }

  // 计算数据大小
  private calculateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // 如果无法序列化，使用估算值
      return JSON.stringify(data || '').length * 2; // 假设每个字符2字节
    }
  }

  // 更新内存使用量
  private updateMemoryUsage(): void {
    this.memoryUsage = Array.from(this.cache.values())
      .reduce((total, item) => total + (item.size || 0), 0);
    
    this.metrics.cacheSize = this.cache.size;
    this.metrics.memoryUsage = this.memoryUsage;
  }

  // 更新命中率
  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? this.metrics.hits / this.metrics.totalRequests 
      : 0;
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // 清理过期项
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.updateMemoryUsage();
      
      logger.debug(
        `Cleaned up ${cleanedCount} expired cache items`,
        'request-deduplication',
        {
          cleanedCount,
          remainingSize: this.cache.size,
          memoryUsage: this.memoryUsage
        }
      );
    }
    
    // 持久化缓存（如果启用）
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      this.saveToPersistence();
    }
  }

  // 保存到持久化存储
  private saveToPersistence(): void {
    try {
      const cacheData = {
        items: Array.from(this.cache.entries()),
        timestamp: Date.now()
      };
      
      localStorage.setItem(
        this.config.persistenceKey,
        JSON.stringify(cacheData)
      );
      
    } catch (error) {
      logger.error(
        'Failed to save cache to persistence',
        'request-deduplication',
        {
          error: error instanceof Error ? error.message : String(error)
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  // 从持久化存储加载
  private loadFromPersistence(): void {
    try {
      const stored = localStorage.getItem(this.config.persistenceKey);
      if (!stored) {
        return;
      }
      
      const cacheData = JSON.parse(stored);
      const now = Date.now();
      
      // 检查数据是否太旧
      if (now - cacheData.timestamp > 24 * 60 * 60 * 1000) { // 24小时
        localStorage.removeItem(this.config.persistenceKey);
        return;
      }
      
      let loadedCount = 0;
      
      for (const [key, item] of cacheData.items) {
        // 检查是否过期
        if (now - item.timestamp <= item.ttl) {
          this.cache.set(key, item);
          loadedCount++;
        }
      }
      
      this.updateMemoryUsage();
      
      logger.info(
        `Loaded ${loadedCount} items from persistence`,
        'request-deduplication',
        {
          loadedCount,
          cacheSize: this.cache.size,
          memoryUsage: this.memoryUsage
        }
      );
      
    } catch (error) {
      logger.error(
        'Failed to load cache from persistence',
        'request-deduplication',
        {
          error: error instanceof Error ? error.message : String(error)
        },
        error instanceof Error ? error : undefined
      );
      
      // 清除损坏的数据
      try {
        localStorage.removeItem(this.config.persistenceKey);
      } catch {}
    }
  }

  // 手动清除缓存
  public clearCache(pattern?: string): number {
    let clearedCount = 0;
    
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache.entries()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          clearedCount++;
        }
      }
    } else {
      clearedCount = this.cache.size;
      this.cache.clear();
    }
    
    this.updateMemoryUsage();
    
    logger.info(
      `Manually cleared ${clearedCount} cache items`,
      'request-deduplication',
      { clearedCount, pattern, remainingSize: this.cache.size }
    );
    
    return clearedCount;
  }

  // 取消待处理的请求
  public cancelRequest(key: string): boolean {
    const requestItem = this.pendingRequests.get(key);
    
    if (requestItem && requestItem.status === RequestStatus.PENDING) {
      requestItem.status = RequestStatus.CANCELLED;
      
      // 通知所有等待的rejectors
      const cancelError = new Error(`Request cancelled: ${key}`);
      requestItem.rejectors.forEach(reject => reject(cancelError));
      
      this.pendingRequests.delete(key);
      
      logger.info(
        `Cancelled request for key: ${key}`,
        'request-deduplication',
        { key }
      );
      
      return true;
    }
    
    return false;
  }

  // 获取缓存统计信息
  public getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // 获取缓存状态
  public getCacheStatus(): {
    size: number;
    memoryUsage: number;
    pendingRequests: number;
    oldestItem?: { key: string; age: number };
    newestItem?: { key: string; age: number };
  } {
    const items = Array.from(this.cache.values());
    const now = Date.now();
    
    let oldestItem: { key: string; age: number } | undefined;
    let newestItem: { key: string; age: number } | undefined;
    
    if (items.length > 0) {
      const sorted = items.sort((a, b) => a.timestamp - b.timestamp);
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];
      
      oldestItem = {
        key: oldest.key,
        age: now - oldest.timestamp
      };
      
      newestItem = {
        key: newest.key,
        age: now - newest.timestamp
      };
    }
    
    return {
      size: this.cache.size,
      memoryUsage: this.memoryUsage,
      pendingRequests: this.pendingRequests.size,
      oldestItem,
      newestItem
    };
  }

  // 预热缓存
  public async warmup(
    requests: Array<{
      key: string;
      requestFn: () => Promise<unknown>;
      ttl?: number;
    }>
  ): Promise<void> {
    logger.info(
      `Starting cache warmup with ${requests.length} requests`,
      'request-deduplication',
      { requestCount: requests.length }
    );
    
    const promises = requests.map(({ key, requestFn, ttl }) => 
      this.execute(key, requestFn, { ttl }).catch(error => {
        logger.warn(
          `Warmup failed for key: ${key}`,
          'request-deduplication',
          {
            key,
            error: error instanceof Error ? error.message : String(error)
          }
        );
        return null;
      })
    );
    
    await Promise.allSettled(promises);
    
    logger.info(
      'Cache warmup completed',
      'request-deduplication',
      {
        cacheSize: this.cache.size,
        memoryUsage: this.memoryUsage
      }
    );
  }

  // 销毁管理器
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // 取消所有待处理的请求
    for (const [key] of this.pendingRequests.entries()) {
      this.cancelRequest(key);
    }
    
    this.cache.clear();
    this.updateMemoryUsage();
    
    logger.info(
      'Request deduplication manager destroyed',
      'request-deduplication'
    );
  }
}

// 创建默认实例
export const defaultRequestManager = new RequestDeduplicationManager({
  maxSize: 1000,
  maxMemory: 50 * 1024 * 1024, // 50MB
  defaultTtl: 5 * 60 * 1000, // 5分钟
  cleanupInterval: 60 * 1000, // 1分钟
  enableMetrics: true,
  enablePersistence: true,
  persistenceKey: 'whosee_cache'
});

// 便捷函数
export const dedupedRequest = <T>(
  key: string,
  requestFn: () => Promise<T>,
  options?: {
    ttl?: number;
    forceRefresh?: boolean;
    metadata?: Record<string, unknown>;
    enableCache?: boolean;
  }
): Promise<T> => {
  return defaultRequestManager.execute(key, requestFn, options);
};

export default {
  RequestDeduplicationManager,
  defaultRequestManager,
  dedupedRequest,
  RequestStatus
};