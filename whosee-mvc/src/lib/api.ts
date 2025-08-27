import { apiClient, ErrorRecoveryStrategy, isNetworkError, isAuthenticationError } from './api-error-handler';
import { logger } from './logger';
import { errorRetryManager } from './error-handler';
import { defaultConcurrencyManager } from './concurrency-manager';
import { dedupedRequest } from './request-deduplication';

// API响应类型定义
export interface WhoisResponse {
  domain: string;
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  nameServers?: string[];
  status?: string[];
  contacts?: {
    registrant?: Contact;
    admin?: Contact;
    tech?: Contact;
    billing?: Contact;
  };
  rawData?: string;
}

export interface Contact {
  name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

export interface DnsResponse {
  domain: string;
  records: DnsRecord[];
  nameServers?: string[];
  responseTime?: number;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    database?: ServiceStatus;
    redis?: ServiceStatus;
    external_apis?: ServiceStatus;
  };
  metrics?: {
    uptime: number;
    memory_usage: number;
    cpu_usage: number;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck?: string;
  error?: string;
}

export interface ScreenshotResponse {
  domain: string;
  screenshot: string; // base64 encoded image
  metadata: {
    timestamp: string;
    viewport: {
      width: number;
      height: number;
    };
    loadTime?: number;
    fileSize?: number;
  };
}

// API配置
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// 设置API客户端配置
apiClient.setTimeout(API_CONFIG.timeout);

// 如果有API密钥，设置认证头
if (process.env.NEXT_PUBLIC_API_KEY) {
  apiClient.setDefaultHeader('X-API-Key', process.env.NEXT_PUBLIC_API_KEY);
}

// WHOIS API
export class WhoisApi {
  // 查询域名WHOIS信息
  static async lookup(domain: string, options: { forceRefresh?: boolean } = {}): Promise<WhoisResponse> {
    const cacheKey = `whois:${domain}`;
    
    return dedupedRequest(
      cacheKey,
      async () => {
        const operationId = `whois-lookup-${domain}`;
        
        return errorRetryManager.withRetry(
          async () => {
            logger.info(`Starting WHOIS lookup for domain: ${domain}`, 'whois-api', { domain });
            
            const startTime = Date.now();
            const response = await apiClient.get<WhoisResponse>(`/v1/whois/${encodeURIComponent(domain)}`);
            const duration = Date.now() - startTime;
            
            logger.performance(
              `WHOIS lookup completed for ${domain}`,
              'whois-api',
              { domain, duration, success: true }
            );
            
            return response;
          },
          operationId,
          API_CONFIG.retryAttempts
        );
      },
      {
        ttl: 10 * 60 * 1000, // 10分钟缓存
        forceRefresh: options.forceRefresh,
        metadata: { domain, operation: 'whois-lookup' }
      }
    );
  }

  // 批量查询WHOIS信息
  static async batchLookup(domains: string[], options: { maxConcurrent?: number } = {}): Promise<Record<string, WhoisResponse | Error>> {
    logger.info(`Starting batch WHOIS lookup for ${domains.length} domains`, 'whois-api', { 
      domains: domains.slice(0, 5), // 只记录前5个域名
      maxConcurrent: options.maxConcurrent
    });
    
    // 使用并发管理器处理批量请求
    const lookupOperations = domains.map(domain => 
      () => this.lookup(domain)
    );
    
    const results = await defaultConcurrencyManager.addBatchTasks(
      lookupOperations,
      {
        priority: 1,
        timeout: 30000,
        metadata: { operation: 'batch-whois-lookup', domainCount: domains.length }
      }
    );
    
    // 处理结果
    const finalResults: Record<string, WhoisResponse | Error> = {};
    domains.forEach((domain, index) => {
      const result = results[index];
      if (result instanceof Error) {
        logger.error(
          `Failed to lookup WHOIS for domain: ${domain}`,
          'whois-api',
          { domain, error: result.message },
          result
        );
      }
      finalResults[domain] = result;
    });
    
    logger.info(
      `Batch WHOIS lookup completed`,
      'whois-api',
      { 
        totalDomains: domains.length,
        successCount: Object.values(finalResults).filter(r => !(r instanceof Error)).length,
        errorCount: Object.values(finalResults).filter(r => r instanceof Error).length
      }
    );
    
    return finalResults;
  }

  // 检查域名可用性
  static async checkAvailability(domain: string): Promise<{ available: boolean; reason?: string }> {
    const operationId = `whois-availability-${domain}`;
    
    return errorRetryManager.withRetry(
      async () => {
        logger.info(`Checking domain availability: ${domain}`, 'whois-api', { domain });
        
        const response = await apiClient.get<{ available: boolean; reason?: string }>(
          `/v1/whois/${encodeURIComponent(domain)}/availability`
        );
        
        logger.info(
          `Domain availability check completed: ${domain}`,
          'whois-api',
          { domain, available: response.available }
        );
        
        return response;
      },
      operationId,
      API_CONFIG.retryAttempts
    );
  }
}

// DNS API
export class DnsApi {
  // 查询DNS记录
  static async lookup(domain: string, recordType?: string, options: { forceRefresh?: boolean } = {}): Promise<DnsResponse> {
    const cacheKey = `dns:${domain}:${recordType || 'all'}`;
    
    return dedupedRequest(
      cacheKey,
      async () => {
        const operationId = `dns-lookup-${domain}-${recordType || 'all'}`;
        
        return errorRetryManager.withRetry(
          async () => {
            logger.info(
              `Starting DNS lookup for domain: ${domain}`,
              'dns-api',
              { domain, recordType }
            );
            
            const startTime = Date.now();
            const params = recordType ? { type: recordType } : undefined;
            const response = await apiClient.get<DnsResponse>(
              `/v1/dns/${encodeURIComponent(domain)}`,
              params
            );
            const duration = Date.now() - startTime;
            
            logger.performance(
              `DNS lookup completed for ${domain}`,
              'dns-api',
              { domain, recordType, duration, recordCount: response.records?.length || 0 }
            );
            
            return response;
          },
          operationId,
          API_CONFIG.retryAttempts
        );
      },
      {
        ttl: 5 * 60 * 1000, // 5分钟缓存（DNS记录变化较快）
        forceRefresh: options.forceRefresh,
        metadata: { domain, recordType, operation: 'dns-lookup' }
      }
    );
  }

  // 批量DNS查询
  static async batchLookup(
    domains: string[],
    recordType?: string,
    options: { maxConcurrent?: number } = {}
  ): Promise<Record<string, DnsResponse | Error>> {
    logger.info(
      `Starting batch DNS lookup for ${domains.length} domains`,
      'dns-api',
      { domains: domains.slice(0, 5), recordType, maxConcurrent: options.maxConcurrent }
    );
    
    // 使用并发管理器处理批量请求
    const lookupOperations = domains.map(domain => 
      () => this.lookup(domain, recordType)
    );
    
    const results = await defaultConcurrencyManager.addBatchTasks(
      lookupOperations,
      {
        priority: 1,
        timeout: 20000,
        metadata: { operation: 'batch-dns-lookup', domainCount: domains.length }
      }
    );
    
    // 处理结果
    const finalResults: Record<string, DnsResponse | Error> = {};
    domains.forEach((domain, index) => {
      const result = results[index];
      if (result instanceof Error) {
        logger.error(
          `Failed to lookup DNS for domain: ${domain}`,
          'dns-api',
          { domain, recordType, error: result.message },
          result
        );
      }
      finalResults[domain] = result;
    });
    
    return finalResults;
  }
}

// 健康检查API
export class HealthApi {
  // 获取系统健康状态
  static async getStatus(): Promise<HealthResponse> {
    return ErrorRecoveryStrategy.withFallback(
      async () => {
        logger.debug('Checking system health status', 'health-api');
        
        const response = await apiClient.get<HealthResponse>('/health');
        
        logger.info(
          `System health check completed`,
          'health-api',
          { status: response.status }
        );
        
        return response;
      },
      async () => {
        // 降级响应
        logger.warn('Health check failed, returning fallback status', 'health-api');
        
        return {
          status: 'degraded' as const,
          timestamp: new Date().toISOString(),
          services: {},
          metrics: {
            uptime: 0,
            memory_usage: 0,
            cpu_usage: 0
          }
        };
      }
    );
  }

  // 获取详细的服务状态
  static async getDetailedStatus(): Promise<HealthResponse> {
    const operationId = 'health-detailed-status';
    
    return errorRetryManager.withRetry(
      async () => {
        logger.debug('Getting detailed health status', 'health-api');
        
        const response = await apiClient.get<HealthResponse>('/health/detailed');
        
        logger.info(
          'Detailed health check completed',
          'health-api',
          { 
            status: response.status,
            serviceCount: Object.keys(response.services || {}).length
          }
        );
        
        return response;
      },
      operationId,
      2 // 健康检查重试次数较少
    );
  }
}

// 截图API
export class ScreenshotApi {
  // 获取网站截图
  static async capture(
    domain: string,
    options: {
      width?: number;
      height?: number;
      fullPage?: boolean;
      delay?: number;
    } = {}
  ): Promise<ScreenshotResponse> {
    const operationId = `screenshot-capture-${domain}`;
    
    return errorRetryManager.withRetry(
      async () => {
        logger.info(
          `Starting screenshot capture for domain: ${domain}`,
          'screenshot-api',
          { domain, options }
        );
        
        const startTime = Date.now();
        const response = await apiClient.post<ScreenshotResponse>(
          `/v1/screenshot/${encodeURIComponent(domain)}`,
          options
        );
        const duration = Date.now() - startTime;
        
        logger.performance(
          `Screenshot capture completed for ${domain}`,
          'screenshot-api',
          { 
            domain, 
            duration, 
            imageSize: response.metadata?.fileSize,
            loadTime: response.metadata?.loadTime
          }
        );
        
        return response;
      },
      operationId,
      2 // 截图重试次数较少，因为比较耗时
    );
  }

  // 批量截图
  static async batchCapture(
    domains: string[],
    options: {
      width?: number;
      height?: number;
      fullPage?: boolean;
      delay?: number;
    } = {}
  ): Promise<Record<string, ScreenshotResponse | Error>> {
    logger.info(
      `Starting batch screenshot capture for ${domains.length} domains`,
      'screenshot-api',
      { domains, options }
    );
    
    const results: Record<string, ScreenshotResponse | Error> = {};
    
    // 截图是重资源操作，串行执行
    for (const domain of domains) {
      try {
        const result = await this.capture(domain, options);
        results[domain] = result;
        
        // 截图间添加延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(
          `Failed to capture screenshot for domain: ${domain}`,
          'screenshot-api',
          { domain, error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined
        );
        results[domain] = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    return results;
  }
}

// 统一的API接口
export const api = {
  whois: WhoisApi,
  dns: DnsApi,
  health: HealthApi,
  screenshot: ScreenshotApi
};

// 错误处理工具
export const apiErrorUtils = {
  isNetworkError,
  isAuthenticationError,
  
  // 处理API错误的通用方法
  handleError: (error: Error, context?: string) => {
    if (isAuthenticationError(error)) {
      // 处理认证错误，可能需要重新登录
      logger.warn('Authentication error detected', 'api-error', { context });
      // 这里可以触发重新登录流程
    } else if (isNetworkError(error)) {
      // 处理网络错误
      logger.warn('Network error detected', 'api-error', { context });
      // 可以显示网络错误提示
    } else {
      // 其他错误
      logger.error('API error occurred', 'api-error', { context, error: error.message }, error);
    }
  }
};

// 导出默认API客户端
export { apiClient };
export default api;