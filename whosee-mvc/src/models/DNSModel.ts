import { SingletonModel } from './BaseModel';
import { ApiService } from '@/services/ApiService';
import { DNSRecord } from '@/types';
import { logger } from '@/utils/logger';

/**
 * DNS数据模型 - 处理DNS查询相关的数据操作
 */
export class DNSModel extends SingletonModel<DNSRecord[]> {
  private queryHistory: Array<{ domain: string; types: string[]; timestamp: number }> = [];
  private cache = new Map<string, { data: DNSRecord[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  private readonly MAX_HISTORY = 50; // 最大历史记录数

  constructor() {
    super();
  }

  /**
   * 查询DNS记录
   */
  async fetch(domain: string, types: string[]): Promise<DNSRecord[]> {
    const cacheKey = this.getCacheKey(domain, types);
    
    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.setData(cached);
      return cached;
    }

    try {
      // 并发查询所有DNS记录类型
      const queries = types.map(type => 
        ApiService.get<DNSRecord[]>(`/api/v1/dns/${encodeURIComponent(domain)}`, {
          params: { type }
        }).catch(error => {
          logger.warn(`查询${type}记录失败:`, error);
          return { data: [] as DNSRecord[] };
        })
      );

      const results = await Promise.allSettled(queries);
      
      // 合并所有成功的查询结果
      const allRecords: DNSRecord[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          allRecords.push(...result.value.data);
        }
      });

      // 去重和排序
      const uniqueRecords = this.deduplicateRecords(allRecords);
      const sortedRecords = this.sortRecords(uniqueRecords);

      // 缓存结果
      this.setCache(cacheKey, sortedRecords);
      
      // 添加到历史记录
      this.addToHistory(domain, types);
      
      // 更新数据
      this.setData(sortedRecords);
      
      return sortedRecords;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '查询DNS记录失败';
      this.setError(errorMessage);
      throw error;
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(domain: string, types: string[]): string {
    return `${domain.toLowerCase()}:${types.sort().join(',')}`;
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): DNSRecord[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    // 清除过期缓存
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: DNSRecord[]): void {
    this.cache.set(key, {
      data: [...data],
      timestamp: Date.now()
    });
    
    // 清理过期缓存
    this.cleanExpiredCache();
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 去重DNS记录
   */
  private deduplicateRecords(records: DNSRecord[]): DNSRecord[] {
    const seen = new Set<string>();
    return records.filter(record => {
      const key = `${record.type}:${record.name}:${record.value}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 排序DNS记录
   */
  private sortRecords(records: DNSRecord[]): DNSRecord[] {
    const typeOrder = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV'];
    
    return records.sort((a, b) => {
      // 首先按类型排序
      const aIndex = typeOrder.indexOf(a.type);
      const bIndex = typeOrder.indexOf(b.type);
      
      if (aIndex !== bIndex) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      }
      
      // 然后按名称排序
      if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }
      
      // 最后按值排序
      return a.value.localeCompare(b.value);
    });
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(domain: string, types: string[]): void {
    const historyItem = {
      domain: domain.toLowerCase(),
      types: [...types].sort(),
      timestamp: Date.now()
    };
    
    // 移除重复项
    this.queryHistory = this.queryHistory.filter(
      item => !(item.domain === historyItem.domain && 
               JSON.stringify(item.types) === JSON.stringify(historyItem.types))
    );
    
    // 添加到开头
    this.queryHistory.unshift(historyItem);
    
    // 限制历史记录数量
    if (this.queryHistory.length > this.MAX_HISTORY) {
      this.queryHistory = this.queryHistory.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * 获取查询历史
   */
  getQueryHistory(): Array<{ domain: string; types: string[]; timestamp: number }> {
    return [...this.queryHistory];
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.queryHistory = [];
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; queries: Array<{ domain: string; types: string[] }> } {
    const queries = Array.from(this.cache.keys()).map(key => {
      const [domain, typesStr] = key.split(':');
      return {
        domain,
        types: typesStr.split(',')
      };
    });
    
    return {
      size: this.cache.size,
      queries
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 预热缓存
   */
  async warmupCache(queries: Array<{ domain: string; types: string[] }>): Promise<void> {
    const promises = queries.map(({ domain, types }) => 
      this.fetch(domain, types).catch(error => {
        logger.warn(`预热缓存失败 ${domain}:`, error);
        return [];
      })
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * 获取记录类型统计
   */
  getRecordTypeStats(records: DNSRecord[]): Record<string, number> {
    return records.reduce((stats, record) => {
      stats[record.type] = (stats[record.type] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
  }

  /**
   * 按类型分组记录
   */
  groupRecordsByType(records: DNSRecord[]): Record<string, DNSRecord[]> {
    return records.reduce((groups, record) => {
      if (!groups[record.type]) {
        groups[record.type] = [];
      }
      groups[record.type].push(record);
      return groups;
    }, {} as Record<string, DNSRecord[]>);
  }

  /**
   * 验证DNS记录
   */
  validateRecord(record: DNSRecord): boolean {
    if (!record.type || !record.name || !record.value) {
      return false;
    }
    
    // 基本格式验证
    switch (record.type) {
      case 'A':
        return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(record.value);
      case 'AAAA':
        return /^[0-9a-fA-F:]+$/.test(record.value);
      case 'MX':
        return /^\d+\s+.+$/.test(record.value);
      default:
        return true;
    }
  }

  /**
   * 重置模型状态
   */
  reset(): void {
    super.reset();
    this.queryHistory = [];
    this.cache.clear();
  }
}

// 导出单例实例
export const dnsModel = new DNSModel();