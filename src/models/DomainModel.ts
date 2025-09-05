import { SingletonModel } from './BaseModel';
import { DomainInfo } from '@/types';
import { apiClient } from '@/services/ApiService';

/**
 * Domain模型 - 管理域名相关数据
 */
export class DomainModel extends SingletonModel<DomainInfo> {
  private searchHistory: string[] = [];
  private cache: Map<string, { data: DomainInfo; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 搜索域名信息
   */
  async fetch(domain: string): Promise<void> {
    if (!domain || !this.isValidDomain(domain)) {
      this.setError('请输入有效的域名');
      return;
    }

    // 检查缓存
    const cached = this.getFromCache(domain);
    if (cached) {
      this.setData(cached);
      return;
    }

    try {
      this.setLoading(true);
      this.setError(null);
      const result = await apiClient.getDomainInfo(domain);
      this.setData(result);
      this.addToCache(domain, result);
      this.addToHistory(domain);
    } catch (error) {
      const message = error instanceof Error ? error.message : '请求失败';
      this.setError(message);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * 清除搜索历史
   */
  clearHistory(): void {
    this.searchHistory = [];
    this.notifyListeners();
  }

  /**
   * 验证域名格式
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain.toLowerCase());
  }

  /**
   * 添加到搜索历史
   */
  private addToHistory(domain: string): void {
    const normalizedDomain = domain.toLowerCase();
    
    // 移除重复项
    this.searchHistory = this.searchHistory.filter(d => d !== normalizedDomain);
    
    // 添加到开头
    this.searchHistory.unshift(normalizedDomain);
    
    // 限制历史记录数量
    if (this.searchHistory.length > 10) {
      this.searchHistory = this.searchHistory.slice(0, 10);
    }
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(domain: string): DomainInfo | null {
    const cached = this.cache.get(domain.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    // 清除过期缓存
    if (cached) {
      this.cache.delete(domain.toLowerCase());
    }
    
    return null;
  }

  /**
   * 添加到缓存
   */
  private addToCache(domain: string, data: DomainInfo): void {
    this.cache.set(domain.toLowerCase(), {
      data,
      timestamp: Date.now()
    });
    
    // 限制缓存大小
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; domains: string[] } {
    return {
      size: this.cache.size,
      domains: Array.from(this.cache.keys())
    };
  }

  /**
   * 预加载域名信息
   */
  async preload(domains: string[]): Promise<void> {
    const validDomains = domains.filter(domain => 
      this.isValidDomain(domain) && !this.getFromCache(domain)
    );

    const promises = validDomains.map(domain => 
      apiClient.getDomainInfo(domain)
        .then((info) => {
          this.addToCache(domain, info);
        })
        .catch(() => {}) // 忽略预加载错误
    );

    await Promise.allSettled(promises);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// 导出单例实例
export const domainModel = DomainModel.getInstance();