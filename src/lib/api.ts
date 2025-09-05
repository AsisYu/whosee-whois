import type { DomainInfo, DNSInfo, HealthInfo, ScreenshotInfo, DNSRecord } from '@/types';
import type { 
  BlogPost, 
  BlogCategory, 
  BlogTag, 
  BlogPostsResponse, 
  BlogPostResponse, 
  BlogCategoriesResponse, 
  BlogTagsResponse, 
  BlogQueryParams, 
  StrapiResponse
} from '@/types';
import { toCMSLocale } from '@/i18n/config';
import { logger } from './logger';
import { 
  AppError, 
  NetworkError, 
  ValidationError, 
  AuthenticationError, 
  BusinessLogicError,
  createErrorContext,
  globalErrorHandler
} from './error-handler';
import { errorRetryManager } from './error-handler';

// API 基础配置 - 修复端口配置问题
// 开发环境：使用环境变量配置的API地址
// 生产环境：使用完整API地址
const isDevelopment = typeof window !== 'undefined' 
  ? window.location.hostname === 'localhost' 
  : process.env.NODE_ENV !== 'production';

const API_BASE_URL = isDevelopment 
  ? (process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.NEXT_PUBLIC_API_PORT || '3001'}`)
  : (process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.NEXT_PUBLIC_API_PORT || '3000'}`);

// CMS API 配置
const CMS_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || `http://localhost:${process.env.NEXT_PUBLIC_STRAPI_PORT || '1337'}`;
const CMS_API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN || process.env.STRAPI_API_TOKEN;

// 仅在开发环境输出调试信息
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 API Strategy:', isDevelopment ? 'Using Next.js Proxy' : 'Direct API calls');
  console.log('🔗 API Base URL:', `"${API_BASE_URL}"`);
  console.log('🎨 CMS Base URL:', `"${CMS_BASE_URL}"`);
  console.log('🌍 Environment:', isDevelopment ? 'development' : 'production');
}

// 请求配置
const defaultHeaders = {
  'Content-Type': 'application/json',
  'User-Agent': 'Whosee-Client/1.0',
};

// CMS 请求头
const cmsHeaders = {
  'Content-Type': 'application/json',
  ...(CMS_API_TOKEN && { 'Authorization': `Bearer ${CMS_API_TOKEN}` }),
};

// JWT Token 管理
class TokenManager {
  private static token: string | null = null;
  private static tokenExpiry: number = 0;

  static async getToken(): Promise<string> {
    // 检查token是否还有效（提前5秒过期）
    const now = Date.now();
    if (this.token && now < this.tokenExpiry - 5000) {
      logger.debug('Using cached JWT token', 'token-manager');
      return this.token;
    }

    // 获取新token - 参考后端auth.go，获取token时不需要X-API-KEY
    try {
      logger.info('Requesting new JWT token', 'token-manager');
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Whosee-Client/1.0',
        },
      });

      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        const context = createErrorContext(
          'token-manager',
          'getToken',
          { httpStatus: response.status, duration }
        );
        const error = new AuthenticationError(
          `Failed to get token: ${response.status}`,
          context
        );
        globalErrorHandler.reportError(error, context);
        throw error;
      }

      const data = await response.json();
      this.token = data.token;
      
      // JWT token有效期30秒
      this.tokenExpiry = now + 30 * 1000;
      
      logger.performance(
        'JWT token obtained successfully',
        'token-manager',
        { duration, tokenExpiry: this.tokenExpiry }
      );
      
      return this.token!
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      const context = createErrorContext(
        'token-manager',
        'getToken',
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
      const authError = new AuthenticationError(
        '认证失败，无法获取访问令牌',
        context
      );
      globalErrorHandler.reportError(authError, context);
      throw authError;
    }
  }

  static clearToken(): void {
    logger.debug('Clearing JWT token', 'token-manager');
    this.token = null;
    this.tokenExpiry = 0;
  }
}

// 后端API响应格式
interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: string;
    cached?: boolean;
    cachedAt?: string;
    processingTimeMs?: number;
    processing?: number;
    requestId?: string;
  };
}

// 后端域名查询响应
interface ApiDomainResponse {
  available: boolean;
  domain: string;
  registrar?: string;
  creationDate?: string;
  expiryDate?: string;
  updatedDate?: string;
  status?: string[];
  nameServers?: string[];
  statusCode?: number;
  statusMessage?: string;
  sourceProvider?: string;
  protocol?: string;
}

// 后端DNS响应（实际格式）
interface ApiDnsResponse {
  CloudflareDNS?: DNSServerResult;
  GoogleDNS?: DNSServerResult;
  '中国DNS'?: DNSServerResult;
  cacheTime?: string;
  isCached?: boolean;
  [key: string]: DNSServerResult | string | boolean | undefined;
}

interface DNSServerResult {
  available: boolean;
  responseTime: number;
  testResults: Array<{
    domain: string;
    ips: string[];
    message: string;
    responseTime: number;
    success: boolean;
    timestamp: string;
  }>;
  testSuccessful: boolean;
}

// 后端健康检查响应
interface ApiHealthResponse {
  status: string;
  version: string;
  time: string;
  services: {
    redis?: {
      status: string;
      latency?: number;
      lastCheck?: string;
    };
    dns?: {
      status: string;
      total?: number;
      available?: number;
      servers?: Array<{
        server: string;
        status: string;
        responseTime?: number;
      }>;
      lastCheck?: string;
    };
    whois?: {
      status: string;
      total?: number;
      available?: number;
      testSuccessful?: number;
      providers?: Record<string, {
        available: boolean;
        testSuccessful: boolean;
        responseTime?: number;
        statusCode?: number;
        callCount?: number;
        lastUsed?: string;
      }>;
      lastCheck?: string;
    };
    screenshot?: {
      status: string;
      total?: number;
      available?: number;
      servers?: Array<{
        service: string;
        status: string;
        mode?: string;
        lastUsed?: string;
      }>;
      lastCheck?: string;
    };
    itdog?: {
      status: string;
      total?: number;
      available?: number;
      servers?: Array<{
        service: string;
        status: string;
        endpoint?: string;
        lastCheck?: string;
      }>;
      lastCheck?: string;
    };
  };
  lastCheck?: string;
}

// 后端截图响应
interface ApiScreenshotResponse {
  domain: string;
  imageUrl?: string;
  imageData?: string;
  status: string;
  title?: string;
  timestamp: string;
}

// 通用错误处理
class ApiError extends Error {
  constructor(public status: number, message: string, public response?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

// 增强的API错误类，继承自新的错误处理系统
class EnhancedApiError extends AppError {
  constructor(
    message: string,
    public status: number,
    context?: any,
    public response?: unknown
  ) {
    super(message, context, status >= 500 || status === 408 || status === 429);
    this.name = 'EnhancedApiError';
  }
}

// 通用请求函数
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // 记录请求开始
  logger.debug(
    `Starting API request: ${options.method || 'GET'} ${endpoint}`,
    'api-client',
    { requestId, url, method: options.method || 'GET' }
  );
  
  // 为需要认证的接口添加JWT token
  const needsAuth = !endpoint.includes('/api/health') && !endpoint.includes('/api/auth/token');
  const headers: Record<string, string> = { ...defaultHeaders };
  
  // 合并用户提供的headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  if (needsAuth) {
    try {
      const token = await TokenManager.getToken();
      headers['Authorization'] = `Bearer ${token}`;
      
      // 添加X-API-KEY用于IP白名单验证（实际API调用时需要）
      headers['X-API-KEY'] = process.env.NEXT_PUBLIC_API_KEY || 'default-api-key-for-development';
    } catch (error) {
      const context = createErrorContext(
        'api-client',
        'authentication',
        { requestId, endpoint }
      );
      const authError = new AuthenticationError('认证失败', context);
      globalErrorHandler.reportError(authError, context);
      throw authError;
    }
  }

  headers['X-Request-ID'] = requestId;

  const config: RequestInit = {
    headers,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const duration = Date.now() - startTime;
    
    // 记录请求性能
    logger.performance(
      `API Request completed: ${options.method || 'GET'} ${endpoint}`,
      'api-client',
      {
        requestId,
        method: options.method || 'GET',
        endpoint,
        status: response.status,
        duration,
        success: response.ok
      }
    );
    
    if (!response.ok) {
      // 尝试解析错误响应
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // 忽略JSON解析错误
      }

      // 如果是认证错误，清除token
      if (response.status === 401) {
        TokenManager.clearToken();
      }

      const context = createErrorContext(
        'api-client',
        endpoint,
        {
          requestId,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          duration,
          errorData
        }
      );
      
      // 根据状态码选择错误类型
      let ErrorClass = BusinessLogicError;
      if (response.status >= 500) {
        ErrorClass = NetworkError;
      } else if (response.status === 400 || response.status === 422) {
        ErrorClass = ValidationError;
      } else if (response.status === 401) {
        ErrorClass = AuthenticationError;
      }
      
      const errorMessage = errorData.message || errorData.error || 
                          `API请求失败: ${response.status} ${response.statusText}`;
      
      const error = new ErrorClass(errorMessage, context, response.status >= 500);
      globalErrorHandler.reportError(error, context);
      throw error;
    }

    const data = await response.json();
    
    // 检查API响应格式
    if (data.success === false) {
      const context = createErrorContext(
        'api-client',
        endpoint,
        {
          requestId,
          businessError: true,
          duration,
          responseData: data
        }
      );
      
      const error = new BusinessLogicError(
        data.error || data.message || '请求失败',
        context
      );
      
      globalErrorHandler.reportError(error, context);
      throw error;
    }

    // 记录成功的用户行为
    logger.userBehavior(
      `API request successful: ${endpoint}`,
      'api-success',
      { requestId, endpoint, duration }
    );

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof AppError) {
      throw error;
    }
    
    // 网络错误或其他错误
    const context = createErrorContext(
      'api-client',
      endpoint,
      {
        requestId,
        networkError: true,
        duration,
        originalError: error instanceof Error ? error.message : 'Unknown error'
      }
    );
    
    const networkError = new NetworkError(
      `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
      context,
      true
    );
    
    globalErrorHandler.reportError(networkError, context);
    throw networkError;
  }
}

// CMS 请求函数
async function cmsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${CMS_BASE_URL}${endpoint}`;
  const requestId = `cms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // 记录CMS请求开始
  logger.debug(
    `Starting CMS request: ${options.method || 'GET'} ${endpoint}`,
    'cms-client',
    { requestId, url, method: options.method || 'GET' }
  );
  
  const headers: Record<string, string> = {
    ...cmsHeaders,
    'X-Request-ID': requestId,
  };
  
  // 合并用户提供的headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const config: RequestInit = {
    headers,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const duration = Date.now() - startTime;
    
    // 记录CMS请求性能
    logger.performance(
      `CMS Request completed: ${options.method || 'GET'} ${endpoint}`,
      'cms-client',
      {
        requestId,
        method: options.method || 'GET',
        endpoint,
        status: response.status,
        duration,
        success: response.ok
      }
    );
    
    if (!response.ok) {
      // 尝试解析错误响应
      let errorData: any = {};
      let errorText = '';
      
      try {
        const responseText = await response.text();
        errorText = responseText;
        
        // 尝试解析为JSON
        if (responseText) {
          errorData = JSON.parse(responseText);
        }
      } catch (parseError) {
        // 如果不是JSON，使用原始文本
        errorData = { rawError: errorText };
      }

      // 构建详细错误信息
      let errorMessage = '';
      
      if (errorData.error) {
        // Strapi 4/5 错误格式
        if (typeof errorData.error === 'object') {
          errorMessage = errorData.error.message || errorData.error.name || 'CMS错误';
          if (errorData.error.details) {
            errorMessage += `: ${JSON.stringify(errorData.error.details)}`;
          }
        } else {
          errorMessage = String(errorData.error);
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorText) {
        errorMessage = errorText;
      } else {
        errorMessage = `CMS请求失败: ${response.status} ${response.statusText}`;
      }

      console.error('🚨 CMS Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url,
        errorData,
        errorText: errorText.substring(0, 500) // 限制日志长度
      });
      
      const context = createErrorContext(
        'cms-client',
        endpoint,
        {
          requestId,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          duration,
          errorData
        }
      );
      
      // 根据状态码选择错误类型
      let ErrorClass = BusinessLogicError;
      if (response.status >= 500) {
        ErrorClass = NetworkError;
      } else if (response.status === 400 || response.status === 422) {
        ErrorClass = ValidationError;
      } else if (response.status === 401 || response.status === 403) {
        ErrorClass = AuthenticationError;
      }
      
      const error = new ErrorClass(errorMessage, context, response.status >= 500);
      globalErrorHandler.reportError(error, context);
      throw error;
    }

    const data = await response.json();
    
    // 检查CMS响应格式
    if (data.error) {
      const context = createErrorContext(
        'cms-client',
        endpoint,
        {
          requestId,
          businessError: true,
          duration,
          responseData: data
        }
      );
      
      const error = new BusinessLogicError(
        data.error.message || data.error.name || '请求失败',
        context
      );
      
      globalErrorHandler.reportError(error, context);
      throw error;
    }

    // 记录成功的CMS请求
    logger.userBehavior(
      `CMS request successful: ${endpoint}`,
      'cms-success',
      { requestId, endpoint, duration }
    );

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof AppError) {
      throw error;
    }
    
    // 网络错误或其他错误
    const context = createErrorContext(
      'cms-client',
      endpoint,
      {
        requestId,
        networkError: true,
        duration,
        originalError: error instanceof Error ? error.message : 'Unknown error'
      }
    );
    
    const networkError = new NetworkError(
      `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
      context,
      true
    );
    
    globalErrorHandler.reportError(networkError, context);
    throw networkError;
  }
}

// CMS 错误类
class CMSError extends Error {
  constructor(
    public status: number, 
    public name: string, 
    message: string, 
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = name;
  }
}

// 域名 WHOIS 查询
export async function queryDomainInfo(domain: string): Promise<DomainInfo> {
  const operation = async () => {
    logger.info(`Querying domain info for: ${domain}`, 'domain-api');
    
    const response = await apiRequest<ApiResponse<ApiDomainResponse>>(`/api/v1/whois/${encodeURIComponent(domain)}`);
    
    const data = response.data;
    if (!data) {
      throw new BusinessLogicError('未收到有效的响应数据');
    }

    // 将后端响应转换为前端格式
    const result: DomainInfo = {
      domain: data.domain,
      available: data.available,
      registrar: data.registrar || '未知',
      status: data.status || [],
      created: data.creationDate || '',
      updated: data.updatedDate || '',
      expires: data.expiryDate || '',
      nameservers: data.nameServers || [],
      sourceProvider: data.sourceProvider,
      protocol: data.protocol,
      // 简化联系人信息（后端暂未提供详细联系人信息）
      contacts: {},
    };
    
    logger.userBehavior(
      `Domain info retrieved successfully: ${domain}`,
      'domain-lookup',
      { domain, sourceProvider: result.sourceProvider, protocol: result.protocol }
    );
    
    return result;
  };
  
  return errorRetryManager.executeWithRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2
    },
    `queryDomainInfo-${domain}`
  );
}

// RDAP 查询（新增）
export async function queryRDAPInfo(domain: string): Promise<DomainInfo> {
  const response = await apiRequest<ApiResponse<ApiDomainResponse>>(`/api/v1/rdap/${encodeURIComponent(domain)}`);
  
  const data = response.data;
  if (!data) {
    throw new ApiError(500, '未收到有效的响应数据');
  }

  return {
    domain: data.domain,
    available: data.available,
    registrar: data.registrar || '未知',
    status: data.status || [],
    created: data.creationDate || '',
    updated: data.updatedDate || '',
    expires: data.expiryDate || '',
    nameservers: data.nameServers || [],
    sourceProvider: data.sourceProvider,
    protocol: data.protocol || 'RDAP',
    contacts: {},
  };
}

// DNS 记录查询
export async function queryDNSInfo(domain: string): Promise<DNSInfo> {
  const operation = async () => {
    logger.info(`Querying DNS info for: ${domain}`, 'dns-api');
    
    const response = await apiRequest<ApiResponse<ApiDnsResponse>>(`/api/v1/dns/${encodeURIComponent(domain)}`);
    
    const data = response.data;
    if (!data) {
      throw new BusinessLogicError('未收到有效的响应数据');
    }

    // 转换DNS服务器测试结果为标准DNS记录格式
    const records: DNSInfo['records'] = {};
    let overallStatus = 'success';
    
    // 从所有DNS服务器的测试结果中提取A记录
    const aRecords: DNSRecord[] = [];
    
    Object.entries(data).forEach(([serverName, serverData]) => {
      if (serverName === 'cacheTime' || serverName === 'isCached') return;
      
      // 类型保护：确保serverData是DNSServerResult类型
      if (serverData && typeof serverData === 'object' && 'testSuccessful' in serverData) {
        const dnsResult = serverData as DNSServerResult;
        
        if (dnsResult.testSuccessful && dnsResult.testResults) {
          dnsResult.testResults.forEach((result: any) => {
            if (result.success && result.ips) {
              result.ips.forEach((ip: string) => {
                // 避免重复IP
                if (!aRecords.find(record => record.value === ip)) {
                  aRecords.push({
                    type: 'A',
                    value: ip,
                    ttl: 300, // 默认TTL
                  });
                }
              });
            }
          });
        } else {
          overallStatus = 'partial';
        }
      }
    });

    if (aRecords.length > 0) {
      records.A = aRecords;
    } else {
      overallStatus = 'error';
    }

    const result: DNSInfo = {
      domain,
      records,
      status: overallStatus,
      // 添加原始测试结果供前端显示详细信息
      testResults: data,
      cached: data.isCached,
      cacheTime: data.cacheTime,
    };
    
    logger.userBehavior(
      `DNS info retrieved successfully: ${domain}`,
      'dns-lookup',
      { 
        domain, 
        cached: result.cached, 
        status: result.status,
        recordCount: aRecords.length
      }
    );
    
    return result;
  };
  
  return errorRetryManager.executeWithRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2
    },
    `queryDNSInfo-${domain}`
  );
}

// 健康检查查询
export async function queryHealthInfo(detailed: boolean = false): Promise<HealthInfo> {
  const operation = async () => {
    logger.info('Querying health info', 'health-api');
    
    const response = await apiRequest<ApiHealthResponse>(`/api/health${detailed ? '?detailed=true' : ''}`);
    
    const result: HealthInfo = {
      status: response.status,
      version: response.version,
      timestamp: response.time,
      services: response.services,
      lastCheck: response.lastCheck,
    };
    
    logger.userBehavior(
      'Health info retrieved successfully',
      'health-check',
      { 
        status: result.status,
        serviceCount: Object.keys(result.services || {}).length,
        detailed
      }
    );
    
    return result;
  };
  
  return errorRetryManager.executeWithRetry(
    operation,
    {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 2000,
      backoffMultiplier: 2
    },
    'queryHealthInfo'
  );
}

// 网站截图查询
export async function queryScreenshotInfo(domain: string): Promise<ScreenshotInfo> {
  const operation = async () => {
    logger.info(`Querying screenshot info for: ${domain}`, 'screenshot-api');
    
    const response = await apiRequest<ApiResponse<ApiScreenshotResponse>>(`/api/v1/screenshot/${encodeURIComponent(domain)}`);
    
    const data = response.data;
    if (!data) {
      throw new BusinessLogicError('未收到有效的响应数据');
    }

    const result: ScreenshotInfo = {
      domain: data.domain,
      imageUrl: data.imageUrl,
      status: data.status,
      title: data.title,
      timestamp: data.timestamp,
    };
    
    logger.userBehavior(
      `Screenshot info retrieved successfully: ${domain}`,
      'screenshot-capture',
      { 
        domain, 
        status: result.status,
        hasImage: !!result.imageUrl,
        title: result.title
      }
    );
    
    return result;
  };
  
  return errorRetryManager.executeWithRetry(
    operation,
    {
      maxAttempts: 2,
      baseDelay: 2000,
      maxDelay: 8000,
      backoffMultiplier: 2
    },
    `queryScreenshotInfo-${domain}`
  );
}

// Base64截图查询
export async function queryScreenshotBase64(domain: string): Promise<ScreenshotInfo> {
  const response = await apiRequest<{ 
    success: boolean;
    domain: string;
    imageData: string;
    title?: string;
    timestamp: string;
    processingTime?: number;
  }>(`/api/v1/screenshot/base64/${encodeURIComponent(domain)}`);
  
  return {
    domain: response.domain,
    imageData: response.imageData,
    status: response.success ? 'success' : 'error',
    title: response.title,
    timestamp: response.timestamp,
  };
}

// ITDog测速查询
export async function queryITDogInfo(domain: string): Promise<ScreenshotInfo> {
  const response = await apiRequest<ApiResponse<ApiScreenshotResponse>>(`/api/v1/itdog/${encodeURIComponent(domain)}`);
  
  const data = response.data;
  if (!data) {
    throw new ApiError(500, '未收到有效的响应数据');
  }

  return {
    domain: data.domain,
    imageUrl: data.imageUrl,
    status: data.status,
    timestamp: data.timestamp,
  };
}

// ITDog Base64查询
export async function queryITDogBase64(domain: string): Promise<ScreenshotInfo> {
  const response = await apiRequest<{
    success: boolean;
    domain: string;
    imageData: string;
    testResults?: any;
    timestamp: string;
    processingTime?: number;
  }>(`/api/v1/itdog/base64/${encodeURIComponent(domain)}`);
  
  return {
    domain: response.domain,
    imageData: response.imageData,
    status: response.success ? 'success' : 'error',
    timestamp: response.timestamp,
    testResults: response.testResults,
  };
}

// 综合查询（可选择查询类型）
export async function queryDomainAll(domain: string, options: {
  includeWhois?: boolean;
  includeRDAP?: boolean;
  includeDNS?: boolean;
  includeScreenshot?: boolean;
  includeITDog?: boolean;
} = {}) {
  const {
    includeWhois = true,
    includeRDAP = false,
    includeDNS = true,
    includeScreenshot = false,
    includeITDog = false,
  } = options;

  const results: any = {};

  try {
    // 并行执行多个查询
    const promises: Promise<any>[] = [];
    const queryTypes: string[] = [];

    if (includeWhois) {
      promises.push(queryDomainInfo(domain));
      queryTypes.push('whois');
    }

    if (includeRDAP) {
      promises.push(queryRDAPInfo(domain));
      queryTypes.push('rdap');
    }

    if (includeDNS) {
      promises.push(queryDNSInfo(domain));
      queryTypes.push('dns');
    }

    if (includeScreenshot) {
      promises.push(queryScreenshotInfo(domain));
      queryTypes.push('screenshot');
    }

    if (includeITDog) {
      promises.push(queryITDogInfo(domain));
      queryTypes.push('itdog');
    }

    const responses = await Promise.allSettled(promises);

    // 处理结果
    responses.forEach((response, index) => {
      const queryType = queryTypes[index];
      if (response.status === 'fulfilled') {
        results[queryType] = response.value;
      } else {
        results[queryType] = {
          error: response.reason?.message || '查询失败',
          status: 'error'
        };
      }
    });

  } catch (error) {
    throw new ApiError(500, `综合查询失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  return results;
}

// =============================================================================
  // CMS 博客相关 API 函数
  // =============================================================================

// 构建查询参数
function buildQueryParams(params: BlogQueryParams = {}): string {
  const searchParams = new URLSearchParams();
  
  // 语言环境 - 自动转换前端 locale 到 CMS locale
  if (params.locale) {
    const cmsLocale = toCMSLocale(params.locale);
    searchParams.append('locale', cmsLocale);
  }
  
  // 关联数据填充 - 支持简化格式
  if (params.populate) {
    if (params.populate === '*') {
      // 简化格式：populate=* (填充所有关系)
      searchParams.append('populate', '*');
    } else if (Array.isArray(params.populate)) {
      // 数组格式：populate[fieldName]=*
      params.populate.forEach(field => {
        searchParams.append(`populate[${field}]`, '*');
      });
    } else {
      // 字符串格式：拆分并处理
      const fields = params.populate.split(',').map(f => f.trim());
      fields.forEach(field => {
        searchParams.append(`populate[${field}]`, '*');
      });
    }
  }
  
  // 排序
  if (params.sort) {
    if (Array.isArray(params.sort)) {
      params.sort.forEach(sortItem => {
        searchParams.append('sort', sortItem);
      });
    } else {
      searchParams.append('sort', params.sort);
    }
  }
  
  // 过滤器 - 修复嵌套对象和数组处理
  if (params.filters) {
    const buildFilterParams = (filters: any, prefix = 'filters') => {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            // 处理数组，如 $or: [condition1, condition2]
            value.forEach((item, index) => {
              if (typeof item === 'object') {
                buildFilterParams(item, `${prefix}[${key}][${index}]`);
              } else {
                searchParams.append(`${prefix}[${key}][${index}]`, String(item));
              }
            });
          } else if (typeof value === 'object') {
            // 递归处理嵌套对象
            buildFilterParams(value, `${prefix}[${key}]`);
          } else {
            // 原始值直接添加
            searchParams.append(`${prefix}[${key}]`, String(value));
          }
        }
      });
    };
    
    buildFilterParams(params.filters);
  }
  
  // 分页
  if (params.pagination) {
    Object.entries(params.pagination).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(`pagination[${key}]`, String(value));
      }
    });
  }
  
  // 字段选择
  if (params.fields) {
    searchParams.append('fields', params.fields.join(','));
  }
  
  // 发布状态
  if (params.publicationState) {
    searchParams.append('publicationState', params.publicationState);
  }
  
  return searchParams.toString();
}

// 获取所有博客文章
export async function getBlogPosts(params: BlogQueryParams = {}): Promise<BlogPostsResponse> {
  const operation = async () => {
    logger.info(`Querying blog posts with params: ${JSON.stringify(params)}`, 'blog-api');
    
    const queryParams = buildQueryParams({
      ...params,
      locale: params.locale || 'en',  // 确保传递locale参数
      populate: params.populate || '*',  // 使用简化格式，自动填充所有关系
      sort: params.sort || ['publishedAt:desc'],
      publicationState: params.publicationState || 'live'
    });
    
    const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
    
    logger.userBehavior(
      'Blog posts retrieved successfully',
      'blog-list',
      { 
        locale: params.locale || 'en',
        totalPosts: response.meta?.pagination?.total || 0,
        postsCount: response.data?.length || 0,
        page: params.pagination?.page || 1,
        pageSize: params.pagination?.pageSize || 25
      }
    );
    
    return response;
  };
  
  return errorRetryManager.executeWithRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2
    },
    `getBlogPosts-${JSON.stringify(params)}`
  );
}

// 根据 slug 获取单篇博客文章
export async function getBlogPostBySlug(slug: string, locale: string = 'en'): Promise<BlogPost | null> {
  const cmsLocale = toCMSLocale(locale);
  
  // 首先尝试获取指定语言版本
  let queryParams = buildQueryParams({
    locale: cmsLocale,
    filters: { slug: { $eq: slug } },
    populate: '*',  // 使用简化格式
    publicationState: 'live'
  });
  
  try {
    let response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
    
    // 如果找到了文章，直接返回
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    
    // 如果没有找到，尝试获取所有语言版本中匹配slug的文章
    queryParams = buildQueryParams({
      filters: { slug: { $eq: slug } },
      populate: '*',
      publicationState: 'live'
    });
    
    response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
    
    // 返回找到的第一个文章（任何语言版本）
    return response.data?.[0] || null;
    
  } catch (error) {
    if (error instanceof CMSError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// 获取博客文章（带语言回退和重定向信息）
export async function getBlogPostBySlugWithFallback(
  slug: string, 
  requestedLocale: string = 'en'
): Promise<{
  post: BlogPost | null;
  foundLocale: string | null;
  needsRedirect: boolean;
  availableLocales: Array<{ locale: string; slug: string }>;
}> {
  const cmsLocale = toCMSLocale(requestedLocale);
  
  try {
    // 首先尝试获取指定语言版本
    let queryParams = buildQueryParams({
      locale: cmsLocale,
      filters: { slug: { $eq: slug } },
      populate: '*',
      publicationState: 'live'
    });
    
    let response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
    
    // 如果找到了指定语言版本的文章
    if (response.data && response.data.length > 0) {
      const post = response.data[0];
      
      // 验证文章ID是否有效
      if (!post.id) {
        console.warn('文章ID无效:', post);
        return {
          post: null,
          foundLocale: null,
          needsRedirect: false,
          availableLocales: []
        };
      }
      
      let localizations = [];
      try {
        localizations = await getBlogPostLocalizations(post.documentId || post.id.toString());
      } catch (error) {
        console.warn('获取文章本地化版本失败:', error);
        // 如果获取本地化版本失败，仍然返回当前文章
        localizations = [{ id: post.id, documentId: post.documentId || post.id.toString(), locale: requestedLocale, slug: post.slug }];
      }
      
      return {
        post,
        foundLocale: requestedLocale,
        needsRedirect: false,
        availableLocales: localizations.map(loc => ({
          locale: loc.locale,
          slug: loc.slug || slug
        }))
      };
    }
    
    // 如果没有找到指定语言版本，尝试查找其他语言版本
    queryParams = buildQueryParams({
      filters: { slug: { $eq: slug } },
      populate: '*',
      publicationState: 'live'
    });
    
    response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
    
    if (response.data && response.data.length > 0) {
      const post = response.data[0];
      
      // 验证文章ID是否有效
      if (!post.id) {
        console.warn('文章ID无效:', post);
        return {
          post: null,
          foundLocale: null,
          needsRedirect: false,
          availableLocales: []
        };
      }
      
      let localizations = [];
      try {
        localizations = await getBlogPostLocalizations(post.documentId || post.id.toString());
      } catch (error) {
        console.warn('获取文章本地化版本失败:', error);
        // 如果获取本地化版本失败，使用当前文章信息
        localizations = [{ id: post.id, locale: post.locale || 'en', slug: post.slug }];
      }
      
      // 检查是否有请求的语言版本
      const targetLocalization = localizations.find(loc => loc.locale === requestedLocale);
      
      if (targetLocalization && targetLocalization.slug) {
        // 找到了目标语言版本，但slug不同，需要重定向
        return {
          post: null,
          foundLocale: requestedLocale,
          needsRedirect: true,
          availableLocales: localizations.map(loc => ({
            locale: loc.locale,
            slug: loc.slug || slug
          }))
        };
      } else {
        // 没有目标语言版本，返回找到的版本
        return {
          post,
          foundLocale: post.locale || 'en',
          needsRedirect: true,
          availableLocales: localizations.map(loc => ({
            locale: loc.locale,
            slug: loc.slug || slug
          }))
        };
      }
    }
    
    // 完全没有找到文章
    return {
      post: null,
      foundLocale: null,
      needsRedirect: false,
      availableLocales: []
    };
    
  } catch (error) {
    console.error('获取文章失败:', error);
    return {
      post: null,
      foundLocale: null,
      needsRedirect: false,
      availableLocales: []
    };
  }
}

// 根据 ID 获取博客文章
export async function getBlogPostById(id: number, locale: string = 'en'): Promise<BlogPost | null> {
  const operation = async () => {
    logger.info(`Querying blog post by ID: id=${id}, locale=${locale}`, 'blog-api');
    
    const queryParams = buildQueryParams({
      locale,
      populate: '*',  // 使用简化格式
      publicationState: 'live'
    });
    
    try {
      const response = await cmsRequest<StrapiResponse<BlogPost>>(`/api/blog-posts/${id}?${queryParams}`);
      
      logger.userBehavior(
        `Blog post retrieved successfully by ID: ${id}`,
        'blog-detail',
        { 
          id,
          locale,
          title: response.data?.title || 'Unknown',
          hasContent: !!response.data?.content
        }
      );
      
      return response.data;
    } catch (error) {
      if (error instanceof CMSError && error.status === 404) {
        return null;
      }
      throw error;
    }
  };
  
  return errorRetryManager.executeWithRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2
    },
    `getBlogPostById-${id}-${locale}`
  );
}

// 获取推荐博客文章
export async function getFeaturedBlogPosts(locale: string = 'en', limit: number = 6): Promise<BlogPost[]> {
  const queryParams = buildQueryParams({
    locale,
    filters: { featured: { $eq: true } },
    populate: '*',  // 使用简化格式
    sort: ['publishedAt:desc'],
    pagination: { limit },
    publicationState: 'live'
  });
  
  const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
  return response.data;
}

// 根据分类获取博客文章
export async function getBlogPostsByCategory(categorySlug: string, locale: string = 'en', params: BlogQueryParams = {}): Promise<BlogPostsResponse> {
  const queryParams = buildQueryParams({
    ...params,
    locale,
    filters: {
      ...params.filters,
      category: { slug: { $eq: categorySlug } }
    },
    populate: params.populate || '*',  // 使用简化格式
    sort: params.sort || ['publishedAt:desc'],
    publicationState: 'live'
  });
  
  return await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
}

// 根据标签获取博客文章
export async function getBlogPostsByTag(tagSlug: string, locale: string = 'en', params: BlogQueryParams = {}): Promise<BlogPostsResponse> {
  const queryParams = buildQueryParams({
    ...params,
    locale,
    filters: {
      ...params.filters,
      tags: { slug: { $eq: tagSlug } }
    },
    populate: params.populate || '*',  // 使用简化格式
    sort: params.sort || ['publishedAt:desc'],
    publicationState: 'live'
  });
  
  return await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
}

// 搜索博客文章
export async function searchBlogPosts(searchTerm: string, locale: string = 'en', params: BlogQueryParams = {}): Promise<BlogPostsResponse> {
  const queryParams = buildQueryParams({
    ...params,
    locale,
    filters: {
      ...params.filters,
      $or: [
        { title: { $containsi: searchTerm } },
        { excerpt: { $containsi: searchTerm } },
        { content: { $containsi: searchTerm } }
      ]
    },
    populate: params.populate || '*',  // 使用简化格式
    sort: params.sort || ['publishedAt:desc'],
    publicationState: 'live'
  });
  
  return await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
}

// 获取相关博客文章
export async function getRelatedBlogPosts(postId: number, locale: string = 'en', limit: number = 4): Promise<BlogPost[]> {
  // 首先获取当前文章的分类和标签
  const currentPost = await getBlogPostById(postId, locale);
  if (!currentPost) return [];
  
  const categoryId = currentPost.category?.id;
  const tagIds = currentPost.tags?.map(tag => tag.id) || [];
  
  // 构建查询条件：同分类或有相同标签的文章，排除当前文章
  const filters: any = {
    id: { $ne: postId }
  };
  
  if (categoryId || tagIds.length > 0) {
    const orConditions = [];
    
    if (categoryId) {
      orConditions.push({ category: { id: { $eq: categoryId } } });
    }
    
    if (tagIds.length > 0) {
      orConditions.push({ tags: { id: { $in: tagIds } } });
    }
    
    filters.$or = orConditions;
  }
  
  const queryParams = buildQueryParams({
    locale,
    filters,
    populate: '*',  // 使用简化格式
    sort: ['publishedAt:desc'],
    pagination: { limit },
    publicationState: 'live'
  });
  
  const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
  return response.data;
}

// 获取所有博客分类
export async function getBlogCategories(locale: string = 'en'): Promise<BlogCategoriesResponse> {
  const queryParams = buildQueryParams({
    locale,
    populate: '*',  // 使用简化格式
    sort: ['name:asc'],
    publicationState: 'live'
  });
  
  return await cmsRequest<BlogCategoriesResponse>(`/api/categories?${queryParams}`);
}

// 根据 slug 获取博客分类
export async function getBlogCategoryBySlug(slug: string, locale: string = 'en'): Promise<BlogCategory | null> {
  const queryParams = buildQueryParams({
    locale,
    filters: { slug: { $eq: slug } },
    populate: '*'  // 使用简化格式
  });
  
  try {
    const response = await cmsRequest<BlogCategoriesResponse>(`/api/categories?${queryParams}`);
    return response.data[0] || null;
  } catch (error) {
    if (error instanceof CMSError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// 获取所有博客标签
export async function getBlogTags(locale: string = 'en'): Promise<BlogTag[]> {
  const queryParams = buildQueryParams({
    locale,
    sort: ['name:asc']
  });
  
  const response = await cmsRequest<BlogTagsResponse>(`/api/tags?${queryParams}`);
  return response.data;
}

// 根据 slug 获取博客标签
export async function getBlogTagBySlug(slug: string, locale: string = 'en'): Promise<BlogTag | null> {
  const queryParams = buildQueryParams({
    locale,
    filters: { slug: { $eq: slug } }
  });
  
  try {
    const response = await cmsRequest<BlogTagsResponse>(`/api/tags?${queryParams}`);
    return response.data[0] || null;
  } catch (error) {
    if (error instanceof CMSError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// 获取博客文章的所有静态路径（用于静态生成）
export async function getBlogPostPaths(locales: string[] = ['en', 'zh']): Promise<Array<{ params: { slug: string }; locale: string }>> {
  const paths: Array<{ params: { slug: string }; locale: string }> = [];
  
  for (const frontendLocale of locales) {
    try {
      const queryParams = buildQueryParams({
        locale: frontendLocale, // buildQueryParams 会自动转换为 CMS locale
        fields: ['slug'],
        pagination: { limit: 100 }, // 根据实际需要调整
        publicationState: 'live'
      });
      
      const response = await cmsRequest<BlogPostsResponse>(`/api/blog-posts?${queryParams}`);
      
      response.data.forEach(post => {
        paths.push({
          params: { slug: post.slug },
          locale: frontendLocale // 返回前端使用的 locale
        });
      });
    } catch (error) {
      console.error(`获取 ${frontendLocale} 语言的博客路径失败:`, error);
    }
  }
  
  return paths;
}

// 增加文章浏览次数
export async function incrementBlogPostViews(id: number): Promise<void> {
  try {
    // 首先获取当前浏览次数
    const currentPost = await getBlogPostById(id);
    if (!currentPost) return;
    
    const currentViews = currentPost.views || 0;
    
    // 更新浏览次数
    await cmsRequest(`/api/blog-posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          views: currentViews + 1
        }
      })
    });
  } catch (error) {
    // 浏览次数更新失败不应该影响页面渲染，所以静默处理
    console.error('更新文章浏览次数失败:', error);
  }
}

// 获取博客文章的本地化版本信息
// 获取所有可用的locales
export async function getAvailableLocales(): Promise<string[]> {
  try {
    const response = await cmsRequest<{ data: Array<{ code: string }> }>('/api/i18n/locales');
    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(locale => locale.code);
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('获取可用locales失败:', error);
    return ['en', 'zh']; // 返回默认locales
  }
}

// 根据documentId获取所有locale版本的博客文章
export async function getBlogPostLocalizations(documentId: string): Promise<Array<{ id: number; documentId: string; locale: string; slug?: string }>> {
  try {
    const availableLocales = await getAvailableLocales();
    const localizations: Array<{ id: number; documentId: string; locale: string; slug?: string }> = [];
    
    // 为每个locale查询文档
    for (const locale of availableLocales) {
      try {
        const queryParams = buildQueryParams({
          populate: '*',
          publicationState: 'live'
        });
        
        const response = await cmsRequest<StrapiResponse<BlogPost>>(`/api/blog-posts/${documentId}?locale=${locale}&${queryParams}`);
        
        if (response.data) {
          localizations.push({
            id: response.data.id,
            documentId: response.data.documentId || documentId,
            locale: response.data.locale || locale,
            slug: response.data.slug
          });
        }
      } catch (localeError) {
        // 如果某个locale不存在，跳过
        console.log(`Locale ${locale} not available for document ${documentId}`);
      }
    }
    
    return localizations;
  } catch (error) {
    console.error('获取文章本地化版本失败:', error);
    return [];
  }
}

// 导出所有 CMS API 函数的对象
export const cmsApi = {
  // 博客文章
  getBlogPosts,
  getBlogPostBySlug,
  getBlogPostBySlugWithFallback,
  getBlogPostById,
  getFeaturedBlogPosts,
  getBlogPostsByCategory,
  getBlogPostsByTag,
  searchBlogPosts,
  getRelatedBlogPosts,
  getBlogPostLocalizations,
  incrementBlogPostViews,
  
  // 分类和标签
  getBlogCategories,
  getBlogCategoryBySlug,
  getBlogTags,
  getBlogTagBySlug,
  
  // 国际化
  getAvailableLocales,
  
  // 工具函数
  getBlogPostPaths,
};

// 导出错误类
export { ApiError };

// 导出Token管理器（用于调试）
export { TokenManager };