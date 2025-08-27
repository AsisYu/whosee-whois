import { BaseController, ValidationRules } from './BaseController';
import { DomainModel, domainModel } from '@/models/DomainModel';
import { ApiService } from '@/services/ApiService';
import { DomainInfo } from '@/types';
import { logger } from '@/lib/logger';
import { resourceManager } from '@/utils/concurrencyManager';

/**
 * Domain控制器 - 处理域名相关的业务逻辑
 */
export class DomainController extends BaseController<DomainInfo> {
  private searchDebounced: (domain: string) => void;
  private lastSearchDomain: string = '';
  private apiService: ApiService;
  private performanceMetrics = {
    searchCount: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    lastSearchTime: 0
  };

  constructor(model: DomainModel = domainModel) {
    super(model);
    this.apiService = new ApiService();
    
    // 创建防抖搜索函数
    this.searchDebounced = this.debounce(
      (domain: string) => this.performSearch(domain),
      500 // 500ms防抖
    );
    
    // 注册性能监控
    resourceManager.registerCleanupCallback(() => {
      this.logPerformanceMetrics();
    });
  }

  /**
   * 搜索域名信息
   */
  async execute(domain: string): Promise<void> {
    const startTime = Date.now();
    this.performanceMetrics.searchCount++;
    
    try {
      await this.searchDomain(domain);
      
      // 更新性能指标
      const responseTime = Date.now() - startTime;
      this.performanceMetrics.lastSearchTime = responseTime;
      this.performanceMetrics.averageResponseTime = 
        (this.performanceMetrics.averageResponseTime * (this.performanceMetrics.searchCount - 1) + responseTime) / 
        this.performanceMetrics.searchCount;
        
      logger.logPerformance(
        'domain-search',
        responseTime,
        true,
        {
          domain,
          searchCount: this.performanceMetrics.searchCount,
          averageResponseTime: this.performanceMetrics.averageResponseTime
        }
      );
      
    } catch (error) {
      logger.error('域名搜索失败', { domain, error, searchCount: this.performanceMetrics.searchCount });
      throw error;
    }
  }

  /**
   * 搜索域名信息（立即执行）
   */
  async searchDomain(domain: string): Promise<void> {
    const trimmedDomain = domain.trim().toLowerCase();
    
    // 验证输入
    const validation = this.validateInput(trimmedDomain, [
      ValidationRules.required('域名'),
      ValidationRules.domain('域名')
    ]);

    if (!validation.isValid) {
      this.setError(validation.errors[0]);
      return;
    }

    // 避免重复搜索
    if (trimmedDomain === this.lastSearchDomain && this.getData()) {
      return;
    }

    this.lastSearchDomain = trimmedDomain;
    await this.performSearch(trimmedDomain);
  }

  /**
   * 搜索域名信息（防抖）
   */
  searchDomainDebounced(domain: string): void {
    const trimmedDomain = domain.trim().toLowerCase();
    
    // 基本验证
    if (!trimmedDomain) {
      this.clear();
      return;
    }

    this.searchDebounced(trimmedDomain);
  }

  /**
   * 执行搜索操作（优化版本）
   */
  private async performSearch(domain: string): Promise<void> {
    const startTime = Date.now();
    
    await this.handleAsyncOperationWithRetry(
      async () => {
        // 检查是否为缓存命中
        const cacheKey = `domain:${domain}`;
        const isCacheHit = (this.apiService as ApiService & { getCachedData?: (key: string) => unknown }).getCachedData?.(cacheKey) !== null;
        
        if (isCacheHit) {
          this.performanceMetrics.cacheHits++;
          logger.debug('域名搜索缓存命中', { domain });
        }
        
        const result = await this.apiService.getDomainInfo(domain);
        this.model.setData(result);
        
        // 记录搜索历史
        this.addToSearchHistory(domain, result);
        
        const responseTime = Date.now() - startTime;
        logger.userBehavior('域名搜索成功', {
          domain,
          responseTime,
          isCacheHit,
          registrar: result.registrar
        });
        
        return result;
      },
      `域名查询-${domain}`,
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000
      },
      (result) => {
        // 搜索成功的回调 - 已在基类中记录日志
      },
      (error) => {
        // 搜索失败的回调 - 已在基类中记录日志和错误处理
        this.setError(error.message);
        logger.error('域名搜索重试失败', { domain, error: error.message });
      }
    );
  }

  /**
   * 添加到搜索历史
   */
  private addToSearchHistory(domain: string, result: DomainInfo): void {
    try {
      const history = this.getSearchHistory();
      const newEntry = {
        domain,
        timestamp: new Date().toISOString(),
        registrar: result.registrar,
        status: result.status?.[0] || 'unknown'
      };
      
      // 添加到历史记录开头，保持最新的在前面
      history.unshift(newEntry);
      
      // 限制历史记录数量
      if (history.length > 50) {
        history.splice(50);
      }
      
      localStorage.setItem('domainSearchHistory', JSON.stringify(history));
    } catch (error) {
      logger.warn('保存搜索历史失败', { domain, error });
    }
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory(): Array<{ domain: string; result: DomainInfo; timestamp: number }> {
    try {
      const history = localStorage.getItem('domainSearchHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      logger.warn('获取搜索历史失败', { error });
      return [];
    }
  }

  /**
   * 清除搜索历史
   */
  clearSearchHistory(): void {
    try {
      localStorage.removeItem('domainSearchHistory');
      logger.info('搜索历史已清除');
    } catch (error) {
      logger.warn('清除搜索历史失败', { error });
    }
  }

  /**
   * 从历史记录搜索
   */
  async searchFromHistory(domain: string): Promise<void> {
    await this.searchDomain(domain);
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; domains: string[] } {
    return (this.model as DomainModel).getCacheStats();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    (this.model as DomainModel).clearCache();
  }

  /**
   * 预加载域名列表
   */
  async preloadDomains(domains: string[]): Promise<void> {
    const validDomains = domains.filter(domain => {
      const validation = this.validateInput(domain, [
        ValidationRules.required('域名'),
        ValidationRules.domain('域名')
      ]);
      return validation.isValid;
    });

    if (validDomains.length > 0) {
      await (this.model as DomainModel).preload(validDomains);
    }
  }

  /**
   * 检查域名是否有效
   */
  isValidDomain(domain: string): boolean {
    const validation = this.validateInput(domain, [
      ValidationRules.required('域名'),
      ValidationRules.domain('域名')
    ]);
    return validation.isValid;
  }

  /**
   * 格式化域名信息用于显示
   */
  formatDomainInfo(domainInfo: DomainInfo | null): FormattedDomainInfo | null {
    if (!domainInfo) return null;

    return {
      domain: domainInfo.domain,
      registrar: domainInfo.registrar || '未知',
      registrationDate: this.formatDate(domainInfo.registrationDate),
      expirationDate: this.formatDate(domainInfo.expirationDate),
      nameServers: domainInfo.nameServers || [],
      status: domainInfo.status || [],
      hasContacts: !!(domainInfo.contacts?.registrant || 
                     domainInfo.contacts?.admin || 
                     domainInfo.contacts?.tech),
      contactsCount: this.getContactsCount(domainInfo)
    };
  }

  /**
   * 格式化日期
   */
  private formatDate(dateString?: string): string {
    if (!dateString) return '未知';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * 获取联系人数量
   */
  private getContactsCount(domainInfo: DomainInfo): number {
    let count = 0;
    if (domainInfo.contacts?.registrant) count++;
    if (domainInfo.contacts?.admin) count++;
    if (domainInfo.contacts?.tech) count++;
    return count;
  }

  /**
   * 设置错误信息
   */
  private setError(message: string): void {
    // 通过模型设置错误
    (this.model as DomainModel & { setError?: (message: string) => void }).setError?.(message);
  }

  /**
   * 记录性能指标
   */
  private logPerformanceMetrics(): void {
    logger.info('域名控制器性能指标', {
      searchCount: this.performanceMetrics.searchCount,
      cacheHits: this.performanceMetrics.cacheHits,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      lastSearchTime: this.performanceMetrics.lastSearchTime,
      cacheHitRate: this.performanceMetrics.searchCount > 0 ? 
        (this.performanceMetrics.cacheHits / this.performanceMetrics.searchCount * 100).toFixed(2) + '%' : '0%'
    });
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }
}

/**
 * 格式化的域名信息接口
 */
export interface FormattedDomainInfo {
  domain: string;
  registrar: string;
  registrationDate: string;
  expirationDate: string;
  nameServers: string[];
  status: string[];
  hasContacts: boolean;
  contactsCount: number;
}

// 导出单例实例
export const domainController = new DomainController();