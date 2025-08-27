import { ScreenshotOptions, ScreenshotResult } from '@/types';
import { ApiService } from '@/services/ApiService';
import { logger } from '@/utils/logger';

/**
 * Screenshot Model - 处理截图数据逻辑
 * 负责截图API调用、数据缓存、历史管理等功能
 */
export class ScreenshotModel {
  private apiService: ApiService;
  private cache: Map<string, { data: ScreenshotResult; timestamp: number }> = new Map();
  private history: ScreenshotResult[] = [];
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  private readonly MAX_HISTORY = 100; // 最大历史记录数

  constructor() {
    this.apiService = new ApiService();
    this.loadHistoryFromStorage();
  }

  /**
   * 截图网站
   */
  async captureScreenshot(domain: string, options?: ScreenshotOptions): Promise<ScreenshotResult | null> {
    try {
      // 生成缓存键
      const cacheKey = this.generateCacheKey(domain, options);
      
      // 检查缓存
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // 准备请求参数
      const requestOptions = {
        width: options?.width || 1920,
        height: options?.height || 1080,
        fullPage: options?.fullPage || false,
        quality: options?.quality || 80,
        device: options?.device || 'Desktop HD',
        ...options
      };

      // 调用API
      const startTime = Date.now();
      const response = await this.apiService.request<{
        success: boolean;
        data: {
          imageData: string;
          width: number;
          height: number;
          fileSize: number;
          captureTime: number;
          metadata?: Record<string, unknown>;
        };
        message?: string;
      }>('/api/v1/screenshot', {
        method: 'POST',
        body: JSON.stringify({
          domain: this.normalizeDomain(domain),
          options: requestOptions
        })
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Screenshot capture failed');
      }

      // 构建结果
      const result: ScreenshotResult = {
        domain: this.normalizeDomain(domain),
        imageData: response.data.imageData,
        width: response.data.width,
        height: response.data.height,
        fileSize: response.data.fileSize,
        captureTime: response.data.captureTime,
        timestamp: Date.now(),
        options: requestOptions,
        metadata: response.data.metadata
      };

      // 缓存结果
      this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      logger.error('Screenshot capture error:', error);
      throw error;
    }
  }

  /**
   * 添加到历史记录
   */
  addToHistory(result: ScreenshotResult): void {
    // 避免重复添加
    const exists = this.history.some(item => 
      item.domain === result.domain && 
      Math.abs(item.timestamp - result.timestamp) < 1000
    );
    
    if (!exists) {
      this.history.unshift(result);
      
      // 限制历史记录数量
      if (this.history.length > this.MAX_HISTORY) {
        this.history = this.history.slice(0, this.MAX_HISTORY);
      }
      
      // 保存到本地存储
      this.saveHistoryToStorage();
    }
  }

  /**
   * 获取历史记录
   */
  getHistory(): ScreenshotResult[] {
    return [...this.history];
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistoryToStorage();
  }

  /**
   * 获取历史记录统计
   */
  getHistoryStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: this.history.length,
      today: this.history.filter(item => new Date(item.timestamp) >= today).length,
      thisWeek: this.history.filter(item => new Date(item.timestamp) >= thisWeek).length,
      thisMonth: this.history.filter(item => new Date(item.timestamp) >= thisMonth).length,
      domains: new Set(this.history.map(item => item.domain)).size,
      averageSize: this.history.length > 0 
        ? Math.round(this.history.reduce((sum, item) => sum + (item.fileSize || 0), 0) / this.history.length)
        : 0,
      averageTime: this.history.length > 0
        ? Math.round(this.history.reduce((sum, item) => sum + (item.captureTime || 0), 0) / this.history.length)
        : 0
    };
  }

  /**
   * 按域名搜索历史记录
   */
  searchHistory(query: string): ScreenshotResult[] {
    if (!query.trim()) {
      return this.getHistory();
    }

    const searchTerm = query.toLowerCase();
    return this.history.filter(item => 
      item.domain.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * 按设备类型过滤历史记录
   */
  filterHistoryByDevice(deviceType: string): ScreenshotResult[] {
    if (!deviceType || deviceType === 'all') {
      return this.getHistory();
    }

    return this.history.filter(item => 
      item.options?.device === deviceType
    );
  }

  /**
   * 获取缓存数据
   */
  private getFromCache(key: string): ScreenshotResult | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存数据
   */
  private setCache(key: string, data: ScreenshotResult): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // 清理过期缓存
    this.cleanExpiredCache();
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(domain: string, options?: ScreenshotOptions): string {
    const normalizedDomain = this.normalizeDomain(domain);
    const optionsStr = JSON.stringify({
      width: options?.width || 1920,
      height: options?.height || 1080,
      fullPage: options?.fullPage || false,
      quality: options?.quality || 80,
      device: options?.device || 'Desktop HD'
    });
    
    return `screenshot:${normalizedDomain}:${btoa(optionsStr)}`;
  }

  /**
   * 标准化域名
   */
  private normalizeDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .trim();
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    this.cleanExpiredCache();
    return {
      size: this.cache.size,
      memoryUsage: this.estimateCacheMemoryUsage()
    };
  }

  /**
   * 估算缓存内存使用量
   */
  private estimateCacheMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, value] of this.cache.entries()) {
      totalSize += key.length * 2; // 字符串大小估算
      totalSize += JSON.stringify(value).length * 2;
    }
    return totalSize;
  }

  /**
   * 从本地存储加载历史记录
   */
  private loadHistoryFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('screenshot-history');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.history = parsed.slice(0, this.MAX_HISTORY);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load screenshot history from storage:', error);
      this.history = [];
    }
  }

  /**
   * 保存历史记录到本地存储
   */
  private saveHistoryToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('screenshot-history', JSON.stringify(this.history));
      }
    } catch (error) {
      logger.warn('Failed to save screenshot history to storage:', error);
    }
  }

  /**
   * 导出历史记录
   */
  exportHistory(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: this.history,
      stats: this.getHistoryStats()
    }, null, 2);
  }

  /**
   * 导入历史记录
   */
  importHistory(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.data && Array.isArray(parsed.data)) {
        // 合并历史记录，避免重复
        const existingDomains = new Set(
          this.history.map(item => `${item.domain}-${item.timestamp}`)
        );
        
        const newItems = parsed.data.filter((item: ScreenshotResult) => 
          !existingDomains.has(`${item.domain}-${item.timestamp}`)
        );
        
        this.history = [...newItems, ...this.history].slice(0, this.MAX_HISTORY);
        this.saveHistoryToStorage();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to import history:', error);
      return false;
    }
  }
}