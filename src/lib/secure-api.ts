/**
 * 🛡️ 安全增强的API客户端
 * 实现HMAC签名、防重放攻击、请求完整性验证
 */

import { DomainInfo, HealthInfo, DNSInfo, ApiErrorResponse, AuthTokenResponse } from '@/types';

// 安全配置
const SECURITY_CONFIG = {
  signatureAlgorithm: 'SHA-256',
  timestampTolerance: 300, // 5分钟
  maxRetries: 3,
  requestTimeout: 10000,
} as const;

// 错误类型
export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// 安全工具类
class SecurityUtils {
  // 生成随机nonce
  static generateNonce(): string {
    return crypto.randomUUID();
  }

  // 获取当前时间戳
  static getTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  // 生成HMAC签名
  static async generateSignature(
    timestamp: number, 
    nonce: string, 
    method: string, 
    path: string,
    secret: string
  ): Promise<string> {
    const message = `${timestamp}.${nonce}.${method}.${path}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  // 验证时间戳有效性
  static isTimestampValid(timestamp: number): boolean {
    const now = this.getTimestamp();
    const diff = Math.abs(now - timestamp);
    return diff <= SECURITY_CONFIG.timestampTolerance;
  }
}

// 安全的Token管理器
class SecureTokenManager {
  private static token: string | null = null;
  private static tokenExpiry: number = 0;
  private static refreshPromise: Promise<string> | null = null;

  // 获取API密钥（支持环境变量轮换）
  private static getApiSecret(): string {
    const envSecret = process.env.NEXT_PUBLIC_API_SECRET;
    if (!envSecret) {
      throw new SecurityError('API密钥未配置', 'MISSING_API_SECRET');
    }
    return envSecret;
  }

  // 生成安全的认证头部
  private static async generateSecureHeaders(method: string, path: string) {
    const timestamp = SecurityUtils.getTimestamp();
    const nonce = SecurityUtils.generateNonce();
    const secret = this.getApiSecret();
    
    const signature = await SecurityUtils.generateSignature(
      timestamp, nonce, method, path, secret
    );

    return {
      'X-Timestamp': timestamp.toString(),
      'X-Nonce': nonce,
      'X-Signature': signature,
      'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'default-api-key-for-development',
    };
  }

  // 安全获取token
  static async getToken(): Promise<string> {
    // 检查token是否有效
    if (this.token && Date.now() < this.tokenExpiry - 5000) { // 提前5秒刷新
      return this.token;
    }

    // 防止并发请求
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchNewToken();
    
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  // 获取新token
  private static async fetchNewToken(): Promise<string> {
    const API_BASE_URL = this.getApiBaseUrl();
    const path = '/api/auth/token';
    
    try {
      const secureHeaders = await this.generateSecureHeaders('POST', path);
      
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...secureHeaders,
        },
        signal: AbortSignal.timeout(SECURITY_CONFIG.requestTimeout),
      });

      if (!response.ok) {
        const errorData = await response.json() as ApiErrorResponse;
        throw new SecurityError(
          errorData.message || `认证失败: ${response.status}`,
          'AUTH_FAILED'
        );
      }

      const data = await response.json() as AuthTokenResponse;
      
      this.token = data.token;
      this.tokenExpiry = Date.now() + 25000; // 25秒后过期（比服务器30秒提前）
      
      return data.token;
    } catch (error) {
      this.token = null;
      this.tokenExpiry = 0;
      
      if (error instanceof SecurityError) {
        throw error;
      }
      
      throw new SecurityError(
        `Token获取失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'TOKEN_FETCH_FAILED'
      );
    }
  }

  // 获取API基础URL（从环境变量读取，避免硬编码）
  private static getApiBaseUrl(): string {
    const isClient = typeof window !== 'undefined';
    
    // 优先使用完整的API URL
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.trim();
    }
    
    // 客户端环境：动态构建URL
    if (isClient) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = process.env.NEXT_PUBLIC_API_PORT || '8080';
      return `${protocol}//${hostname}:${port}`;
    }
    
    // 服务端环境：使用环境变量配置的端口
    const defaultPort = process.env.NEXT_PUBLIC_API_PORT || '8080';
    return `http://localhost:${defaultPort}`;
  }

  // 清除token（用于登出或错误处理）
  static clearToken(): void {
    this.token = null;
    this.tokenExpiry = 0;
    this.refreshPromise = null;
  }
}

// 安全的API客户端
export class SecureApiClient {
  private static async secureRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const API_BASE_URL = SecureTokenManager['getApiBaseUrl']();
    const url = `${API_BASE_URL}${endpoint}`;
    
    let lastError: Error | null = null;
    
    // 重试机制
    for (let attempt = 1; attempt <= SECURITY_CONFIG.maxRetries; attempt++) {
      try {
        const token = await SecureTokenManager.getToken();
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
          signal: AbortSignal.timeout(SECURITY_CONFIG.requestTimeout),
        });

        if (!response.ok) {
          // 如果是认证错误，清除token并重试
          if (response.status === 401 && attempt < SECURITY_CONFIG.maxRetries) {
            SecureTokenManager.clearToken();
            continue;
          }
          
          const errorData = await response.json() as ApiErrorResponse;
          throw new SecurityError(
            errorData.message || `请求失败: ${response.status}`,
            'REQUEST_FAILED'
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        
        // 如果是认证错误且还有重试次数，继续重试
        if (error instanceof SecurityError && 
            error.code.includes('AUTH') && 
            attempt < SECURITY_CONFIG.maxRetries) {
          SecureTokenManager.clearToken();
          continue;
        }
        
        // 其他错误直接抛出
        if (attempt === SECURITY_CONFIG.maxRetries) {
          break;
        }
      }
    }
    
    throw lastError || new SecurityError('请求失败', 'REQUEST_FAILED');
  }

  // 查询域名信息（增强安全版本）
  static async queryDomainInfo(domain: string): Promise<DomainInfo> {
    if (!domain || typeof domain !== 'string') {
      throw new SecurityError('无效的域名参数', 'INVALID_DOMAIN');
    }
    
    // 域名安全验证
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      throw new SecurityError('域名格式不合法', 'INVALID_DOMAIN_FORMAT');
    }
    
    return this.secureRequest<DomainInfo>(`/api/whois?domain=${encodeURIComponent(domain)}`);
  }

  // 查询DNS信息
  static async queryDNSInfo(domain: string): Promise<DNSInfo> {
    if (!domain || typeof domain !== 'string') {
      throw new SecurityError('无效的域名参数', 'INVALID_DOMAIN');
    }
    
    return this.secureRequest<DNSInfo>(`/api/dns?domain=${encodeURIComponent(domain)}`);
  }

  // 查询健康状态
  static async queryHealthInfo(): Promise<HealthInfo> {
    return this.secureRequest<HealthInfo>('/api/health');
  }

  // 查询截图信息
  static async queryScreenshotInfo(domain: string): Promise<any> {
    if (!domain || typeof domain !== 'string') {
      throw new SecurityError('无效的域名参数', 'INVALID_DOMAIN');
    }
    
    return this.secureRequest(`/api/screenshot?domain=${encodeURIComponent(domain)}`);
  }

  // 安全性检查
  static performSecurityCheck(): boolean {
    try {
      // 检查环境变量
      if (!process.env.NEXT_PUBLIC_API_SECRET) {
        console.error('🚨 安全警告: API密钥未配置');
        return false;
      }
      
      // 检查浏览器安全功能
      if (typeof window !== 'undefined') {
        if (!window.crypto || !window.crypto.subtle) {
          console.error('🚨 安全警告: 浏览器不支持Web Crypto API');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('🚨 安全检查失败:', error);
      return false;
    }
  }
}

// 导出安全API（向后兼容）
export const secureApi = SecureApiClient;
export default SecureApiClient;