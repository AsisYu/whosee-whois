import { BaseController, ValidationRules } from './BaseController';
import { DNSModel, dnsModel } from '@/models/DNSModel';
import { DNSRecord } from '@/types';
import { resourceManager } from '@/utils/concurrencyManager';

/**
 * DNS控制器 - 处理DNS查询相关的业务逻辑
 */
export class DNSController extends BaseController<DNSRecord[]> {
  private queryDebounced: (domain: string, types: string[]) => void;
  private lastQueryDomain: string = '';
  private lastQueryTypes: string[] = [];
  private performanceMetrics = {
    queryCount: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    lastQueryTime: 0,
    recordTypeStats: new Map<string, number>()
  };

  constructor(model: DNSModel = dnsModel) {
    super(model);
    
    // 创建防抖查询函数
    this.queryDebounced = this.debounce(
      (domain: string, types: string[]) => this.performQuery(domain, types),
      500 // 500ms防抖
    );
    
    // 注册性能监控
    resourceManager.registerCleanupCallback(() => {
      this.logPerformanceMetrics();
    });
  }

  /**
   * 查询DNS记录
   */
  async execute(domain: string, types: string[] = ['A', 'AAAA', 'MX']): Promise<void> {
    await this.queryDNS(domain, types);
  }

  /**
   * 查询DNS记录（立即执行）
   */
  async queryDNS(domain: string, types: string[] = ['A', 'AAAA', 'MX']): Promise<void> {
    const trimmedDomain = domain.trim().toLowerCase();
    const startTime = Date.now();
    
    // 验证输入
    const validation = this.validateInput(trimmedDomain, [
      ValidationRules.required('域名'),
      ValidationRules.domain('域名')
    ]);

    if (!validation.isValid) {
      this.setError(validation.errors[0]);
      return;
    }

    if (types.length === 0) {
      this.setError('请至少选择一种DNS记录类型');
      return;
    }

    // 避免重复查询
    if (trimmedDomain === this.lastQueryDomain && 
        JSON.stringify(types.sort()) === JSON.stringify(this.lastQueryTypes.sort()) &&
        this.getData()) {
      return;
    }

    this.lastQueryDomain = trimmedDomain;
    this.lastQueryTypes = [...types];

    await this.handleAsyncOperationWithRetry(
      async () => {
        // 检查是否为缓存命中
        const cacheKey = `dns:${trimmedDomain}`;
        const isCacheHit = (this.model as DNSModel).getCachedData?.(cacheKey) !== null;
        
        if (isCacheHit) {
          console.debug('DNS查询缓存命中', { domain: trimmedDomain, types });
        }
        
        const result = await (this.model as DNSModel).fetch(trimmedDomain, types);
         
         // 记录查询历史
         this.addToQueryHistory(trimmedDomain, types, result);
         
         const responseTime = Date.now() - startTime;
         this.updatePerformanceMetrics(responseTime, types, isCacheHit);
         
         console.log('DNS查询成功', {
           domain: trimmedDomain,
           types,
           responseTime,
           isCacheHit,
           recordCount: result?.length || 0
         });
        
        return result;
      },
      `DNS查询-${trimmedDomain}-${types.join(',')}`,
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000
      },
      (result) => {
        // 查询成功的回调 - 已在基类中记录日志
      },
      (error) => {
        // 查询失败的回调 - 已在基类中记录日志和错误处理
        this.setError(error.message);
        console.error('DNS查询重试失败', { domain: trimmedDomain, types, error: error.message });
      }
    );
  }

  /**
   * 防抖查询DNS记录
   */
  queryDNSDebounced(domain: string, types: string[]): void {
    if (domain.trim()) {
      this.queryDebounced(domain.trim(), types);
    } else {
      this.clear();
    }
  }

  /**
   * 执行实际的DNS查询
   */
  private async performQuery(domain: string, types: string[]): Promise<void> {
    await this.queryDNS(domain, types);
  }

  /**
   * 获取查询历史
   */
  getQueryHistory(): Array<{ domain: string; types: string[]; timestamp: number }> {
    return (this.model as DNSModel).getQueryHistory();
  }

  /**
   * 清除查询历史
   */
  clearQueryHistory(): void {
    (this.model as DNSModel).clearHistory();
    this.notifySubscribers();
  }

  /**
   * 从历史记录查询
   */
  async queryFromHistory(domain: string, types: string[]): Promise<void> {
    await this.queryDNS(domain, types);
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; queries: Array<{ domain: string; types: string[] }> } {
    return (this.model as DNSModel).getCacheStats();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    (this.model as DNSModel).clearCache();
    this.notifySubscribers();
  }

  /**
   * 预加载DNS记录
   */
  async preloadDNSRecords(queries: Array<{ domain: string; types: string[] }>): Promise<void> {
    const results = await Promise.allSettled(
      queries.map(({ domain, types }) => this.queryDNS(domain, types))
    );
    
    const failed = results.filter(result => result.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`预加载完成，${failed}个查询失败`);
    }
  }

  /**
   * 验证域名格式
   */
  isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  /**
   * 格式化DNS记录信息
   */
  formatDNSRecords(records: DNSRecord[] | null): FormattedDNSInfo | null {
    if (!records || records.length === 0) {
      return null;
    }

    const groupedRecords = records.reduce((acc, record) => {
      if (!acc[record.type]) {
        acc[record.type] = [];
      }
      acc[record.type].push(record);
      return acc;
    }, {} as Record<string, DNSRecord[]>);

    return {
      totalRecords: records.length,
      recordTypes: Object.keys(groupedRecords),
      groupedRecords,
      hasIPv4: groupedRecords['A']?.length > 0,
      hasIPv6: groupedRecords['AAAA']?.length > 0,
      hasMX: groupedRecords['MX']?.length > 0,
      queryTimestamp: new Date().toISOString()
    };
  }

  /**
   * 设置错误信息
   */
  private setError(message: string): void {
    (this.model as DNSModel).setError(message);
  }

  /**
   * 添加到查询历史
   */
  private addToQueryHistory(domain: string, types: string[], result: DNSRecord[]): void {
    try {
      const history = this.getQueryHistory();
      const newEntry = {
        domain,
        types,
        timestamp: new Date().toISOString(),
        recordCount: result?.length || 0,
        servers: result?.servers || []
      };
      
      // 添加到历史记录开头
      history.unshift(newEntry);
      
      // 限制历史记录数量
      if (history.length > 30) {
        history.splice(30);
      }
      
      localStorage.setItem('dnsQueryHistory', JSON.stringify(history));
    } catch (error) {
      console.warn('保存DNS查询历史失败', { domain, error });
    }
  }

  /**
   * 获取查询历史
   */
  getQueryHistory(): Array<{ domain: string; types: string[]; result: DNSRecord[]; timestamp: number }> {
    try {
      const history = localStorage.getItem('dnsQueryHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn('获取DNS查询历史失败', { error });
      return [];
    }
  }

  /**
   * 清除查询历史
   */
  clearQueryHistory(): void {
    try {
      localStorage.removeItem('dnsQueryHistory');
      console.log('DNS查询历史已清除');
    } catch (error) {
      console.warn('清除DNS查询历史失败', { error });
    }
  }

  /**
   * 记录性能指标
   */
  private logPerformanceMetrics(): void {
    console.log('DNS Controller Performance Metrics:', {
      queryCount: this.performanceMetrics.queryCount,
      cacheHits: this.performanceMetrics.cacheHits,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      lastQueryTime: this.performanceMetrics.lastQueryTime,
      cacheHitRate: this.performanceMetrics.queryCount > 0 ? 
        (this.performanceMetrics.cacheHits / this.performanceMetrics.queryCount * 100).toFixed(2) + '%' : '0%',
      recordTypeStats: Object.fromEntries(this.performanceMetrics.recordTypeStats)
    });
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(responseTime: number, types: string[], fromCache: boolean = false): void {
    this.performanceMetrics.queryCount++;
    this.performanceMetrics.lastQueryTime = responseTime;
    
    if (fromCache) {
      this.performanceMetrics.cacheHits++;
    }
    
    // 更新平均响应时间
    this.performanceMetrics.averageResponseTime = 
      (this.performanceMetrics.averageResponseTime * (this.performanceMetrics.queryCount - 1) + responseTime) / 
      this.performanceMetrics.queryCount;
    
    // 更新记录类型统计
    types.forEach(type => {
      const current = this.performanceMetrics.recordTypeStats.get(type) || 0;
      this.performanceMetrics.recordTypeStats.set(type, current + 1);
    });
  }
}

/**
 * 格式化的DNS信息接口
 */
export interface FormattedDNSInfo {
  totalRecords: number;
  recordTypes: string[];
  groupedRecords: Record<string, DNSRecord[]>;
  hasIPv4: boolean;
  hasIPv6: boolean;
  hasMX: boolean;
  queryTimestamp: string;
}

// 导出单例实例
export const dnsController = new DNSController();