import { BaseController } from './BaseController';
import { HealthModel, healthModel } from '@/models/HealthModel';
import { HealthStatus } from '@/types';
import { resourceManager } from '../utils/concurrencyManager';

/**
 * 健康监控控制器 - 处理系统健康状态相关的业务逻辑
 */
export class HealthController extends BaseController<HealthStatus> {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly DEFAULT_REFRESH_INTERVAL = 30000; // 30秒
  private performanceMetrics = {
    checkCount: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    lastCheckTime: null as Date | null,
    serviceStatusStats: new Map<string, { healthy: number; unhealthy: number }>(),
    errorCount: 0
  };

  constructor(model: HealthModel = healthModel) {
    super(model);
    
    // 注册资源清理回调
    resourceManager.registerCleanupCallback(() => {
      this.logPerformanceMetrics();
    });
  }

  /**
   * 执行健康检查
   */
  async execute(): Promise<void> {
    await this.checkHealth();
  }

  /**
   * 检查系统健康状态（优化版本）
   */
  async checkHealth(): Promise<void> {
    const startTime = Date.now();
    
    await this.handleAsyncOperationWithRetry(
      () => (this.model as HealthModel).fetch(),
      '系统健康检查',
      {
        maxAttempts: 2,
        baseDelay: 1000,
        maxDelay: 3000
      },
      (result) => {
        const responseTime = Date.now() - startTime;
        const services = result?.services ? Object.values(result.services) : [];
        
        this.updatePerformanceMetrics(responseTime, services, false);
        
        // 健康检查成功的回调 - 已在基类中记录日志
      },
      (error) => {
        const responseTime = Date.now() - startTime;
        this.updatePerformanceMetrics(responseTime, [], true);
        
        // 健康检查失败的回调 - 已在基类中记录日志和错误处理
        this.setError(error.message);
      }
    );
  }

  /**
   * 开始自动刷新
   */
  startAutoRefresh(interval: number = this.DEFAULT_REFRESH_INTERVAL): void {
    this.stopAutoRefresh();
    
    this.refreshInterval = setInterval(async () => {
      await this.checkHealth();
    }, interval);
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * 检查特定服务健康状态
   */
  async checkServiceHealth(serviceName: string): Promise<void> {
    await this.handleAsyncOperationWithRetry(
      () => (this.model as HealthModel).fetchServiceHealth(serviceName),
      `服务健康检查-${serviceName}`,
      {
        maxAttempts: 2,
        baseDelay: 1000,
        maxDelay: 3000
      },
      (result) => {
        // 服务健康检查成功的回调 - 已在基类中记录日志
      },
      (error) => {
        // 服务健康检查失败的回调 - 已在基类中记录日志和错误处理
        this.setError(`检查${serviceName}服务失败: ${error.message}`);
      }
    );
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<void> {
    await this.handleAsyncOperation(
      () => (this.model as HealthModel).fetchSystemMetrics(),
      '获取系统指标',
      (result) => {
        // 获取系统指标成功的回调 - 已在基类中记录日志
      },
      (error) => {
        // 获取系统指标失败的回调 - 已在基类中记录日志和错误处理
      }
    );
  }

  /**
   * 获取服务状态摘要
   */
  getServiceStatusSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
    healthyPercentage: number;
  } {
    const data = this.getData();
    if (!data || !data.services) {
      return {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        unknown: 0,
        healthyPercentage: 0
      };
    }

    const services = Object.values(data.services);
    const total = services.length;
    const healthy = services.filter(service => service.status === 'healthy').length;
    const unhealthy = services.filter(service => service.status === 'unhealthy').length;
    const unknown = services.filter(service => service.status === 'unknown').length;
    const healthyPercentage = total > 0 ? Math.round((healthy / total) * 100) : 0;

    return {
      total,
      healthy,
      unhealthy,
      unknown,
      healthyPercentage
    };
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    const data = this.getData();
    if (!data) return 'unknown';

    const summary = this.getServiceStatusSummary();
    
    if (summary.total === 0) return 'unknown';
    if (summary.unhealthy === 0) return 'healthy';
    if (summary.unhealthy < summary.healthy) return 'degraded';
    return 'unhealthy';
  }

  /**
   * 获取关键服务状态
   */
  getCriticalServices(): Array<{ name: string; status: string; message?: string }> {
    const data = this.getData();
    if (!data || !data.services) return [];

    const criticalServiceNames = ['database', 'redis', 'api', 'whois'];
    
    return criticalServiceNames
      .map(name => {
        const service = data.services[name];
        return service ? {
          name,
          status: service.status,
          message: service.message
        } : {
          name,
          status: 'unknown',
          message: '服务状态未知'
        };
      })
      .filter(service => service.status !== 'healthy');
  }

  /**
   * 格式化响应时间
   */
  formatResponseTime(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${(ms / 60000).toFixed(1)}m`;
    }
  }

  /**
   * 获取性能等级
   */
  getPerformanceGrade(responseTime: number): {
    grade: 'excellent' | 'good' | 'fair' | 'poor';
    color: string;
    description: string;
  } {
    if (responseTime < 100) {
      return {
        grade: 'excellent',
        color: 'text-green-600',
        description: '优秀'
      };
    } else if (responseTime < 500) {
      return {
        grade: 'good',
        color: 'text-blue-600',
        description: '良好'
      };
    } else if (responseTime < 1000) {
      return {
        grade: 'fair',
        color: 'text-yellow-600',
        description: '一般'
      };
    } else {
      return {
        grade: 'poor',
        color: 'text-red-600',
        description: '较差'
      };
    }
  }

  /**
   * 获取历史数据
   */
  getHealthHistory(): Array<{ timestamp: number; status: HealthStatus }> {
    return (this.model as HealthModel).getHealthHistory();
  }

  /**
   * 清除历史数据
   */
  clearHealthHistory(): void {
    (this.model as HealthModel).clearHistory();
    this.notifySubscribers();
  }

  /**
   * 导出健康报告
   */
  exportHealthReport(): {
    timestamp: string;
    systemStatus: string;
    serviceSummary: ReturnType<typeof this.getServiceStatusSummary>;
    criticalIssues: ReturnType<typeof this.getCriticalServices>;
    metrics: HealthStatus | null;
  } {
    const data = this.getData();
    
    return {
      timestamp: new Date().toISOString(),
      systemStatus: this.getSystemStatus(),
      serviceSummary: this.getServiceStatusSummary(),
      criticalIssues: this.getCriticalServices(),
      metrics: data
    };
  }

  /**
   * 设置错误信息
   */
  private setError(message: string): void {
    (this.model as HealthModel).setError(message);
  }

  /**
   * 记录性能指标
   */
  private logPerformanceMetrics(): void {
    console.log('Health Controller Performance Metrics:', {
      checkCount: this.performanceMetrics.checkCount,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      serviceStatusStats: Object.fromEntries(
        Array.from(this.performanceMetrics.serviceStatusStats.entries()).map(
          ([service, stats]) => [service, stats]
        )
      ),
      errorCount: this.performanceMetrics.errorCount,
      lastCheckTime: this.performanceMetrics.lastCheckTime,
      uptime: this.performanceMetrics.lastCheckTime ? 
        Date.now() - this.performanceMetrics.lastCheckTime.getTime() : 0
    });
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(responseTime: number, services: Array<{ name: string; status: string; responseTime?: number }>, isError: boolean = false): void {
    this.performanceMetrics.checkCount++;
    this.performanceMetrics.totalResponseTime += responseTime;
    this.performanceMetrics.averageResponseTime = this.performanceMetrics.totalResponseTime / this.performanceMetrics.checkCount;
    this.performanceMetrics.lastCheckTime = new Date();
    
    // 更新服务状态统计
    services.forEach(service => {
      const serviceName = service.name || 'unknown';
      const isHealthy = service.status === 'healthy';
      
      if (!this.performanceMetrics.serviceStatusStats.has(serviceName)) {
        this.performanceMetrics.serviceStatusStats.set(serviceName, { healthy: 0, unhealthy: 0 });
      }
      
      const stats = this.performanceMetrics.serviceStatusStats.get(serviceName)!;
      if (isHealthy) {
        stats.healthy++;
      } else {
        stats.unhealthy++;
      }
    });
    
    if (isError) {
      this.performanceMetrics.errorCount++;
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      serviceStatusStats: Object.fromEntries(this.performanceMetrics.serviceStatusStats)
    };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.logPerformanceMetrics();
    super.destroy();
  }
}

// 导出单例实例
export const healthController = new HealthController();