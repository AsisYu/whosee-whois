import { DomainInfo, DNSInfo, HealthInfo, ScreenshotInfo, ApiResponse, DNSRecord } from '@/types';
import { logger } from '@/lib/logger';
import { 
  AppError, 
  NetworkError, 
  ValidationError, 
  AuthenticationError, 
  BusinessLogicError,
  createErrorContext,
  globalErrorHandler,
  errorRetryManager
} from '@/lib/error-handler';
import { BatchProcessor } from '@/utils/concurrencyManager';
import { defaultRequestManager } from '@/lib/request-deduplication';
import { resourceManager } from '@/utils/concurrencyManager';

// 内部类型：健康检查响应
type HealthResponse = {
  status: string;
  services?: Record<string, any>;
  time?: string;
  version?: string;
};

/**
 * JWT Token 管理器
 */
class TokenManager {
  private static token: string | null = null;
  private static tokenExpiry: number = 0;
  private static inflight: Promise<string> | null = null;

  static async getToken(): Promise<string> {
    const now = Date.now();
    // 预留提前刷新窗口，避免边界过期抖动
    const earlyRefreshMs = 10_000;
    if (this.token && now < this.tokenExpiry - earlyRefreshMs) {
      logger.debug('Using cached JWT token', 'auth');
      return this.token;
    }

    // 并发单飞：如果已有获取中的请求，直接复用
    if (this.inflight) {
      return this.inflight;
    }

    try {
      logger.info('Requesting new JWT token', 'auth');

      this.inflight = (async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Whosee-Client/1.0',
          },
        });

        if (!response.ok) {
          const error = new AuthenticationError(`Failed to get token: ${response.status}`);
          globalErrorHandler.handleError(
            error,
            createErrorContext('TokenManager.getToken', { status: response.status })
          );
          throw error;
        }

        const data = await response.json();
        this.token = data.token;

        // 优先采用服务端返回的过期时间（秒），否则使用较长的默认值（5分钟）
        const expiresInSec = typeof data.expiresIn === 'number' ? data.expiresIn : 300;
        // 引入抖动，避免雪崩
        const jitterMs = 5_000 + Math.floor(Math.random() * 5_000);
        this.tokenExpiry = Date.now() + Math.max(30_000, expiresInSec * 1000) - jitterMs;

        logger.info('JWT token obtained successfully', 'auth', {
          expiresInMs: Math.max(30_000, expiresInSec * 1000)
        });

        return this.token!;
      })();

      return await this.inflight;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      const authError = new AuthenticationError('认证失败，无法获取访问令牌');
      globalErrorHandler.handleError(
        authError,
        createErrorContext('TokenManager.getToken', { originalError: error })
      );
      throw authError;
    } finally {
      // 重置单飞状态
      this.inflight = null;
    }
  }

  static clearToken(): void {
    logger.info('Clearing JWT token', 'auth');
    this.token = null;
    this.tokenExpiry = 0;
    this.inflight = null;
  }
}

/**
 * API服务 - 处理所有API请求
 */
export class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private domainBatchProcessor: BatchProcessor<string, DomainInfo>;
  private dnsBatchProcessor: BatchProcessor<string, DNSInfo>;
  private requestCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // 初始化批处理器
    this.domainBatchProcessor = new BatchProcessor(
      (domains: string[]) => this.batchGetDomainInfo(domains),
      { batchSize: 3, batchDelay: 200, maxWaitTime: 3000 }
    );
    
    this.dnsBatchProcessor = new BatchProcessor(
      (domains: string[]) => this.batchGetDNSInfo(domains),
      { batchSize: 5, batchDelay: 150, maxWaitTime: 2000 }
    );
    
    // 注册资源清理回调
    resourceManager.registerCleanupCallback(() => {
      this.clearCache();
      logger.info('ApiService缓存已清理');
    });
    
    logger.info('ApiService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const overallTimeoutMs = 30_000;
    
    logger.debug(`API Request initiated: ${options.method || 'GET'} ${endpoint}`, 'api-service', {
      requestId,
      endpoint,
      method: options.method || 'GET',
      requiresAuth
    });
    
    try {
      const headers = { ...this.defaultHeaders, ...options.headers } as Record<string, string>;
      
      // 添加JWT认证
      if (requiresAuth) {
        const token = await TokenManager.getToken();
        headers['X-API-KEY'] = token;
      }

      // 为请求添加 AbortController 与超时
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(`timeout:${overallTimeoutMs}ms`), overallTimeoutMs);
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));
      
      const duration = Date.now() - startTime;
      
      // 记录性能指标
      logger.logPerformance(
        `api-request-${options.method || 'GET'}-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`,
        duration,
        response.ok,
        {
          requestId,
          endpoint,
          method: options.method || 'GET',
          status: response.status
        }
      );

      if (!response.ok) {
        await this.handleHttpError(response, endpoint, requestId, duration);
      }

      const data = await response.json();
      
      logger.userBehavior(
        `API request successful: ${endpoint}`,
        'api-success',
        {
          requestId,
          endpoint,
          method: options.method || 'GET',
          duration
        }
      );
      
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof AppError) {
        throw error;
      }
      
      const networkError = new NetworkError(
        `Network request failed: ${endpoint}`,
        { originalError: error, endpoint, duration }
      );
      
      globalErrorHandler.handleError(
        networkError,
        createErrorContext('ApiService.request', {
          requestId,
          endpoint,
          method: options.method || 'GET',
          duration,
          originalError: error
        })
      );
      
      throw networkError;
    }
  }
  
  /**
   * 处理HTTP错误
   */
  private async handleHttpError(
    response: Response,
    endpoint: string,
    requestId: string,
    duration: number
  ): Promise<never> {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorData: Record<string, unknown> | null = null;
    
    try {
      errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // 如果不是JSON，使用原始错误文本
      if (errorText) errorMessage = errorText;
    }
    
    // 根据HTTP状态码创建相应的错误类型
    let error: AppError;
    
    switch (response.status) {
      case 400:
        error = new ValidationError(errorMessage, { errorData, endpoint });
        break;
      case 401:
        // 清除过期的token
        TokenManager.clearToken();
        error = new AuthenticationError(errorMessage, { errorData, endpoint });
        break;
      case 403:
        error = new AuthenticationError(errorMessage, { errorData, endpoint });
        break;
      case 404:
        error = new BusinessLogicError(errorMessage, { errorData, endpoint });
        break;
      case 422:
        error = new ValidationError(errorMessage, { errorData, endpoint });
        break;
      case 429:
        error = new NetworkError('请求过于频繁，请稍后重试', { errorData, endpoint });
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        error = new NetworkError(errorMessage, { errorData, endpoint });
        break;
      default:
        error = new NetworkError(errorMessage, { errorData, endpoint });
    }
    
    globalErrorHandler.handleError(
      error,
      createErrorContext('ApiService.handleHttpError', {
        requestId,
        endpoint,
        status: response.status,
        duration,
        errorData
      })
    );
    
    throw error;
  }

  /**
   * 缓存管理方法
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      logger.debug('Cache hit', { key });
      return cached.data as T;
    }
    if (cached) {
      this.requestCache.delete(key);
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T, ttl: number = this.defaultCacheTTL): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * 批量获取域名信息
   */
  private async batchGetDomainInfo(domains: string[]): Promise<Map<string, DomainInfo>> {
    const results = new Map<string, DomainInfo>();
    
    // 并发请求所有域名
    const promises = domains.map(async (domain) => {
      try {
        const data = await this.request<DomainInfo>(`/api/v1/whois/${encodeURIComponent(domain)}`);
        
        // 转换后端响应格式到前端类型
        const result = {
          domain: data.domain || domain,
          registrar: data.registrar,
          registrationDate: data.creationDate,
          expirationDate: data.expiryDate,
          nameServers: data.nameServers || [],
          status: data.status || [],
          contacts: {
            registrant: data.contacts?.registrant,
            admin: data.contacts?.admin,
            tech: data.contacts?.tech,
          }
        };
        
        results.set(domain, result);
      } catch (error) {
        logger.warn('批量域名查询失败', { domain, error });
        throw error;
      }
    });
    
    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 批量获取DNS信息
   */
  private async batchGetDNSInfo(domains: string[]): Promise<Map<string, DNSInfo>> {
    const results = new Map<string, DNSInfo>();
    
    const promises = domains.map(async (domain) => {
      try {
        const data = await this.request<Record<string, DNSRecord[]>>(`/api/v1/dns/${encodeURIComponent(domain)}`);
        
        const records: DNSRecord[] = [];
        const servers: string[] = [];
        
        // 处理多个DNS服务器的响应
        Object.entries(data).forEach(([serverName, serverData]: [string, DNSRecord[]]) => {
          if (typeof serverData === 'object' && serverData.testResults) {
            servers.push(serverName);
            serverData.testResults.forEach((result: Record<string, unknown>) => {
              if (result.ips && Array.isArray(result.ips)) {
                result.ips.forEach((ip: string) => {
                  records.push({
                    type: 'A' as const,
                    name: result.domain || domain,
                    value: ip,
                    ttl: 300,
                    server: serverName
                  });
                });
              }
            });
          }
        });
        
        const result = {
          domain,
          records,
          servers,
          timestamp: new Date().toISOString()
        };
        
        results.set(domain, result);
      } catch (error) {
        logger.warn('批量DNS查询失败', { domain, error });
        throw error;
      }
    });
    
    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 获取域名WHOIS信息（支持去重和批处理）
   */
  async getDomainInfo(domain: string): Promise<DomainInfo> {
    const cacheKey = `domain:${domain}`;
    
    // 检查缓存
    const cached = this.getCachedData<DomainInfo>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 使用请求去重
    const requestKey = `getDomainInfo:${domain}`;
    return defaultRequestManager.execute(requestKey, async () => {
      logger.info('开始获取域名WHOIS信息', { domain });
      
      const operation = async () => {
        // 使用批处理器
        const result = await this.domainBatchProcessor.add(domain);
        
        // 缓存结果
        this.setCachedData(cacheKey, result);
        
        logger.userBehavior('成功获取域名WHOIS信息', { domain, registrar: result.registrar });
        return result;
      };
      
      try {
        return await errorRetryManager.executeWithRetry(
          operation,
          { maxAttempts: 3, backoffType: 'exponential' }
        );
      } catch (error) {
        throw new BusinessLogicError(
          `获取域名 ${domain} 的WHOIS信息失败`,
          { domain, originalError: error }
        );
      }
    });
  }

  /**
   * 获取DNS记录信息（支持去重和批处理）
   */
  async getDNSInfo(domain: string): Promise<DNSInfo> {
    const cacheKey = `dns:${domain}`;
    
    // 检查缓存
    const cached = this.getCachedData<DNSInfo>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 使用请求去重
    const requestKey = `getDNSInfo:${domain}`;
    return defaultRequestManager.execute(requestKey, async () => {
      logger.info('开始获取DNS记录信息', { domain });
      
      const operation = async () => {
        // 使用批处理器
        const result = await this.dnsBatchProcessor.add(domain);
        
        // 缓存结果（DNS记录缓存时间较短）
        this.setCachedData(cacheKey, result, 2 * 60 * 1000); // 2分钟缓存
        
        logger.userBehavior('成功获取DNS记录信息', { domain, recordCount: result.records.length, serverCount: result.servers.length });
        return result;
      };
      
      try {
        return await errorRetryManager.executeWithRetry(
          operation,
          { maxAttempts: 3, backoffType: 'exponential' }
        );
      } catch (error) {
        throw new BusinessLogicError(
          `获取域名 ${domain} 的DNS记录失败`,
          { domain, originalError: error }
        );
      }
    });
  }

  /**
   * 获取系统健康状态
   */
  async getHealthInfo(): Promise<HealthInfo> {
    logger.info('开始获取系统健康状态');
    
    const operation = async () => {
      const data = await this.request<HealthResponse>('/api/health', {}, false);
      
      const result = {
        status: data.status === 'ok' ? 'healthy' : 'unhealthy',
        services: {
          database: data.services?.redis?.status === 'ok',
          redis: data.services?.redis?.status === 'ok',
          api: data.status === 'ok'
        },
        metrics: {
          responseTime: data.services?.redis?.latency || 0,
          uptime: 99.9, // 默认值
          memoryUsage: 0, // 默认值
          cpuUsage: 0 // 默认值
        },
        timestamp: data.time || new Date().toISOString(),
        version: data.version || '1.0.0'
      };
      
      logger.userBehavior('成功获取系统健康状态', { status: result.status, version: result.version });
      return result;
    };
    
    try {
      return await errorRetryManager.executeWithRetry(
        operation,
        { maxAttempts: 2, backoffType: 'exponential' }
      );
    } catch (error) {
      throw new BusinessLogicError(
        '获取系统健康状态失败',
        { originalError: error }
      );
    }
  }

  /**
   * 获取网站截图
   */
  async getScreenshot(domain: string, device: 'desktop' | 'mobile' | 'tablet' = 'desktop'): Promise<ScreenshotInfo> {
    logger.info('开始获取网站截图', { domain, device });
    
    const operation = async () => {
      const data = await this.request<ScreenshotResponse>(`/api/v1/screenshot/${encodeURIComponent(domain)}`);
      
      const result = {
        domain: data.domain || domain,
        device,
        imageData: data.imageData || data.imageUrl || '',
        timestamp: data.timestamp || new Date().toISOString(),
        size: {
          width: 1920,
          height: 1080
        },
        title: data.title
      };
      
      logger.userBehavior('成功获取网站截图', { domain, device, hasImage: !!result.imageData });
      return result;
    };
    
    try {
      return await errorRetryManager.executeWithRetry(
        operation,
        { maxAttempts: 2, backoffType: 'exponential' }
      );
    } catch (error) {
      throw new BusinessLogicError(
        `获取域名 ${domain} 的截图失败`,
        { domain, device, originalError: error }
      );
    }
  }

  /**
   * 获取所有信息（优化并发请求）
   */
  async getAllInfo(domain: string): Promise<{
    domain?: DomainInfo;
    dns?: DNSInfo;
    screenshot?: ScreenshotInfo;
    errors: Record<string, string>;
  }> {
    const startTime = Date.now();
    const requestId = `getAllInfo:${domain}:${Date.now()}`;
    
    logger.info('开始获取所有域名信息', { domain, requestId });
    
    // 使用请求去重避免重复的getAllInfo调用
    return defaultRequestManager.execute(`getAllInfo:${domain}`, async () => {
      // 监控内存使用情况
      const memoryBefore = resourceManager.getMemoryUsage();
      
      try {
        // 并发请求所有信息，利用各自的缓存和去重机制
        const results = await Promise.allSettled([
          this.getDomainInfo(domain),
          this.getDNSInfo(domain),
          this.getScreenshot(domain)
        ]);

        const response: { errors: Record<string, string[]> } = { errors: {} };
        let successCount = 0;
        
        if (results[0].status === 'fulfilled') {
          response.domain = results[0].value;
          successCount++;
        } else {
          response.errors.domain = results[0].reason?.message || '获取域名信息失败';
          logger.warn('获取域名信息失败', { domain, error: results[0].reason });
        }
        
        if (results[1].status === 'fulfilled') {
          response.dns = results[1].value;
          successCount++;
        } else {
          response.errors.dns = results[1].reason?.message || '获取DNS信息失败';
          logger.warn('获取DNS信息失败', { domain, error: results[1].reason });
        }
        
        if (results[2].status === 'fulfilled') {
          response.screenshot = results[2].value;
          successCount++;
        } else {
          response.errors.screenshot = results[2].reason?.message || '获取截图失败';
          logger.warn('获取截图失败', { domain, error: results[2].reason });
        }
        
        const duration = Date.now() - startTime;
        const errorCount = Object.keys(response.errors).length;
        const memoryAfter = resourceManager.getMemoryUsage();
        
        // 记录性能和用户行为
        logger.logPerformance(
          'get-all-info',
          duration,
          successCount > 0,
          {
            domain,
            requestId,
            successCount,
            errorCount,
            totalRequests: 3,
            memoryUsage: {
              before: memoryBefore,
              after: memoryAfter,
              delta: memoryAfter - memoryBefore
            },
          cacheHits: this.requestCache.size,
          successRate: successCount / 3
        });
        
        logger.userBehavior('完成域名信息并发查询', {
          domain,
          successCount,
          hasErrors: errorCount > 0,
          duration,
          successRate: successCount / 3
        });
        
        return response;
        
      } catch (error) {
        logger.error('getAllInfo执行失败', { domain, requestId, error });
        throw error;
      }
    });
  }
}

// 导出单例实例
export const apiClient = new ApiService();
export { TokenManager };