import { SingletonModel } from './BaseModel';
import { ApiService } from '@/services/ApiService';
import { HealthStatus } from '@/types';
import { logger } from '@/lib/logger';

/**
 * 健康监控数据模型 - 处理系统健康状态相关的数据操作
 */
export class HealthModel extends SingletonModel<HealthStatus> {
  private healthHistory: Array<{ timestamp: number; status: HealthStatus }> = [];
  private cache = new Map<string, { data: HealthStatus | Record<string, unknown>; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 1000; // 30秒缓存
  private readonly MAX_HISTORY = 100; // 最大历史记录数

  constructor() {
    super();
  }

  /**
   * 获取系统健康状态
   */
  async fetch(): Promise<HealthStatus> {
    const cacheKey = 'health_status';
    
    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.setData(cached);
      return cached;
    }

    try {
      const startTime = Date.now();
      
      // 并发获取各种健康信息
      const [healthResponse, metricsResponse] = await Promise.allSettled([
        ApiService.get<HealthStatus>('/api/health'),
        ApiService.get<Record<string, unknown>>('/api/health/metrics').catch(() => ({ data: null }))
      ]);

      const responseTime = Date.now() - startTime;

      let healthData: HealthStatus;
      
      if (healthResponse.status === 'fulfilled') {
        healthData = {
          ...healthResponse.value.data,
          responseTime,
          timestamp: new Date().toISOString()
        };
      } else {
        // 如果主要健康检查失败，创建一个基本的状态
        healthData = {
          status: 'unhealthy',
          message: '无法连接到健康检查端点',
          responseTime,
          timestamp: new Date().toISOString(),
          services: {},
          metrics: null
        };
      }

      // 添加指标数据（如果可用）
      if (metricsResponse.status === 'fulfilled' && metricsResponse.value.data) {
        healthData.metrics = metricsResponse.value.data;
      }

      // 缓存结果
      this.setCache(cacheKey, healthData);
      
      // 添加到历史记录
      this.addToHistory(healthData);
      
      // 更新数据
      this.setData(healthData);
      
      return healthData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '健康检查失败';
      
      // 创建错误状态
      const errorHealthData: HealthStatus = {
        status: 'unhealthy',
        message: errorMessage,
        responseTime: 0,
        timestamp: new Date().toISOString(),
        services: {},
        metrics: null
      };
      
      this.setError(errorMessage);
      this.setData(errorHealthData);
      throw error;
    }
  }

  /**
   * 获取特定服务的健康状态
   */
  async fetchServiceHealth(serviceName: string): Promise<Record<string, unknown>> {
    const cacheKey = `service_health_${serviceName}`;
    
    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await ApiService.get(`/api/health/service/${serviceName}`);
      
      // 缓存结果
      this.setCache(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      const errorMessage = `获取${serviceName}服务状态失败: ${error instanceof Error ? error.message : '未知错误'}`;
      this.setError(errorMessage);
      throw error;
    }
  }

  /**
   * 获取系统指标
   */
  async fetchSystemMetrics(): Promise<Record<string, unknown> | null> {
    const cacheKey = 'system_metrics';
    
    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await ApiService.get('/api/health/metrics');
      
      // 缓存结果
      this.setCache(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      logger.warn('获取系统指标失败:', error);
      return null;
    }
  }

  /**
   * 批量检查多个服务
   */
  async fetchMultipleServices(serviceNames: string[]): Promise<Record<string, Record<string, unknown>>> {
    const results: Record<string, Record<string, unknown>> = {};
    
    const promises = serviceNames.map(async (serviceName) => {
      try {
        const serviceHealth = await this.fetchServiceHealth(serviceName);
        results[serviceName] = serviceHealth;
      } catch (error) {
        results[serviceName] = {
          status: 'unhealthy',
          message: `检查${serviceName}失败`,
          error: error instanceof Error ? error.message : '未知错误'
        };
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): HealthStatus | Record<string, unknown> | null {
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
  private setCache(key: string, data: HealthStatus | Record<string, unknown>): void {
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
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
   * 添加到历史记录
   */
  private addToHistory(status: HealthStatus): void {
    const historyItem = {
      timestamp: Date.now(),
      status: JSON.parse(JSON.stringify(status)) // 深拷贝
    };
    
    // 添加到开头
    this.healthHistory.unshift(historyItem);
    
    // 限制历史记录数量
    if (this.healthHistory.length > this.MAX_HISTORY) {
      this.healthHistory = this.healthHistory.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * 获取健康历史
   */
  getHealthHistory(): Array<{ timestamp: number; status: HealthStatus }> {
    return [...this.healthHistory];
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.healthHistory = [];
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 分析健康趋势
   */
  analyzeHealthTrend(timeRange: number = 3600000): { // 默认1小时
    trend: 'improving' | 'stable' | 'degrading';
    score: number;
    changes: number;
  } {
    const cutoffTime = Date.now() - timeRange;
    const recentHistory = this.healthHistory.filter(
      item => item.timestamp >= cutoffTime
    );

    if (recentHistory.length < 2) {
      return { trend: 'stable', score: 0, changes: 0 };
    }

    // 计算状态变化次数
    let changes = 0;
    let healthyCount = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      if (recentHistory[i].status.status !== recentHistory[i - 1].status.status) {
        changes++;
      }
      if (recentHistory[i].status.status === 'healthy') {
        healthyCount++;
      }
    }

    const healthyRatio = healthyCount / recentHistory.length;
    const score = Math.round(healthyRatio * 100);

    // 判断趋势
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    
    if (recentHistory.length >= 5) {
      const recent = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
      const older = recentHistory.slice(Math.floor(recentHistory.length / 2));
      
      const recentHealthy = recent.filter(item => item.status.status === 'healthy').length / recent.length;
      const olderHealthy = older.filter(item => item.status.status === 'healthy').length / older.length;
      
      if (recentHealthy > olderHealthy + 0.1) {
        trend = 'improving';
      } else if (recentHealthy < olderHealthy - 0.1) {
        trend = 'degrading';
      }
    }

    return { trend, score, changes };
  }

  /**
   * 获取服务可用性统计
   */
  getServiceUptime(serviceName: string, timeRange: number = 86400000): { // 默认24小时
    uptime: number;
    downtime: number;
    availability: number;
  } {
    const cutoffTime = Date.now() - timeRange;
    const relevantHistory = this.healthHistory.filter(
      item => item.timestamp >= cutoffTime && item.status.services[serviceName]
    );

    if (relevantHistory.length === 0) {
      return { uptime: 0, downtime: 0, availability: 0 };
    }

    const healthyCount = relevantHistory.filter(
      item => item.status.services[serviceName]?.status === 'healthy'
    ).length;

    const availability = (healthyCount / relevantHistory.length) * 100;
    const uptime = (availability / 100) * timeRange;
    const downtime = timeRange - uptime;

    return {
      uptime: Math.round(uptime),
      downtime: Math.round(downtime),
      availability: Math.round(availability * 100) / 100
    };
  }

  /**
   * 重置模型状态
   */
  reset(): void {
    super.reset();
    this.healthHistory = [];
    this.cache.clear();
  }
}

// 导出单例实例
export const healthModel = new HealthModel();