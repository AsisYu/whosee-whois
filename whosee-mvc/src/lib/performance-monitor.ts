/**
 * 前端性能监控工具库
 * 用于监控CPU占用、内存使用、Web Vitals等性能指标
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { logger } from './logger';
import { defaultConcurrencyManager } from './concurrency-manager';
import { defaultRequestManager } from './request-deduplication';

// 性能指标接口
export interface PerformanceMetrics {
  // Web Vitals 指标
  cls?: number;  // Cumulative Layout Shift
  fid?: number;  // First Input Delay
  fcp?: number;  // First Contentful Paint
  lcp?: number;  // Largest Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // 系统性能指标
  cpuUsage?: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  
  // 渲染性能
  renderTime?: number;
  componentCount?: number;
  
  // 并发性能指标
  concurrency?: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    currentConcurrency: number;
    queueSize: number;
    throughput: number;
    averageExecutionTime: number;
    errorRate: number;
  };
  
  // 缓存性能指标
  cache?: {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
    memoryUsage: number;
    evictions: number;
  };
  
  // 时间戳
  timestamp: number;
}

// 性能警告级别
export enum PerformanceLevel {
  GOOD = 'good',
  NEEDS_IMPROVEMENT = 'needs-improvement',
  POOR = 'poor'
}

// 性能警告接口
export interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'render' | 'vitals' | 'concurrency' | 'cache';
  level: PerformanceLevel;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

// 性能监控配置
export interface PerformanceConfig {
  // 监控间隔（毫秒）
  interval: number;
  
  // CPU 阈值
  cpuThreshold: {
    warning: number;  // 警告阈值
    critical: number; // 严重阈值
  };
  
  // 内存阈值
  memoryThreshold: {
    warning: number;  // 警告阈值（百分比）
    critical: number; // 严重阈值（百分比）
  };
  
  // 是否启用控制台日志
  enableConsoleLog: boolean;
  
  // 是否启用本地存储
  enableLocalStorage: boolean;
  
  // 最大存储的性能记录数
  maxRecords: number;
}

// 默认配置
const DEFAULT_CONFIG: PerformanceConfig = {
  interval: 15000, // 15秒 - 减少监控频率
  cpuThreshold: {
    warning: 80, // 提高警告阈值
    critical: 95 // 提高严重阈值
  },
  memoryThreshold: {
    warning: 80, // 提高警告阈值
    critical: 95 // 提高严重阈值
  },
  enableConsoleLog: false, // 默认关闭控制台日志
  enableLocalStorage: true,
  maxRecords: 50 // 减少最大记录数
};

// 性能监控类
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private observers: PerformanceObserver[] = [];
  private onAlert?: (alert: PerformanceAlert) => void;
  private onMetrics?: (metrics: PerformanceMetrics) => void;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initWebVitals();
    this.initPerformanceObserver();
  }

  // 初始化 Web Vitals 监控
  private initWebVitals() {
    if (typeof window === 'undefined') return;

    onCLS((metric) => {
      this.updateMetric('cls', metric.value);
    });

    onINP((metric) => {
      this.updateMetric('fid', metric.value);
    });

    onFCP((metric) => {
      this.updateMetric('fcp', metric.value);
    });

    onLCP((metric) => {
      this.updateMetric('lcp', metric.value);
    });

    onTTFB((metric) => {
      this.updateMetric('ttfb', metric.value);
    });
  }

  // 初始化性能观察器
  private initPerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // 监控长任务（可能导致CPU占用高）
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            const duration = entry.duration;
            this.handleLongTask(duration, entry);
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

      // 监控导航性能
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.handleNavigationTiming(entry as PerformanceNavigationTiming);
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  // 处理长任务
  private handleLongTask(duration: number, entry: PerformanceEntry) {
    const alert: PerformanceAlert = {
      type: 'cpu',
      level: duration > 100 ? PerformanceLevel.POOR : PerformanceLevel.NEEDS_IMPROVEMENT,
      message: `检测到长任务: ${duration.toFixed(2)}ms`,
      value: duration,
      threshold: 50,
      timestamp: Date.now()
    };

    this.addAlert(alert);
    
    if (this.config.enableConsoleLog) {
      console.warn('🚨 长任务检测:', {
        duration: `${duration.toFixed(2)}ms`,
        name: entry.name,
        startTime: entry.startTime,
        entry
      });
    }
  }

  // 处理导航时间
  private handleNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics: Partial<PerformanceMetrics> = {
      timestamp: Date.now()
    };

    // 计算各种时间指标
    if (entry.loadEventEnd && entry.navigationStart) {
      const loadTime = entry.loadEventEnd - entry.navigationStart;
      if (loadTime > 3000) {
        this.addAlert({
          type: 'render',
          level: PerformanceLevel.NEEDS_IMPROVEMENT,
          message: `页面加载时间过长: ${loadTime.toFixed(2)}ms`,
          value: loadTime,
          threshold: 3000,
          timestamp: Date.now()
        });
      }
    }
  }

  // 获取内存使用情况
  private getMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    if (typeof window === 'undefined' || !(performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      return undefined;
    }

    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }

  // 估算CPU使用率
  private async estimateCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      const iterations = 100000;
      
      setTimeout(() => {
        for (let i = 0; i < iterations; i++) {
          Math.random();
        }
        const end = performance.now();
        const duration = end - start;
        const cpuUsage = Math.min(100, (duration / 16.67) * 100); // 基于60fps计算
        resolve(cpuUsage);
      }, 0);
    });
  }

  // 更新指标
  private updateMetric(key: keyof PerformanceMetrics, value: number) {
    // 避免循环调用，直接创建基础指标对象
    const basicMetrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage()
    };
    (basicMetrics as Record<string, unknown>)[key] = value;
    this.addMetrics(basicMetrics);
  }

  // 获取当前指标
  private getCurrentMetrics(): PerformanceMetrics {
    // 获取并发管理器指标
    const concurrencyMetrics = defaultConcurrencyManager.getMetrics();
    const cacheMetrics = defaultRequestManager.getMetrics();
    
    return {
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage(),
      concurrency: {
        totalTasks: concurrencyMetrics.totalTasks,
        completedTasks: concurrencyMetrics.completedTasks,
        failedTasks: concurrencyMetrics.failedTasks,
        currentConcurrency: concurrencyMetrics.currentConcurrency,
        queueSize: concurrencyMetrics.queueSize,
        throughput: concurrencyMetrics.throughput,
        averageExecutionTime: concurrencyMetrics.averageExecutionTime,
        errorRate: concurrencyMetrics.errorRate
      },
      cache: {
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        hitRate: cacheMetrics.hitRate,
        totalRequests: cacheMetrics.totalRequests,
        cacheSize: cacheMetrics.cacheSize,
        memoryUsage: cacheMetrics.memoryUsage,
        evictions: cacheMetrics.evictions
      }
    };
  }

  // 添加指标记录
  private addMetrics(metrics: PerformanceMetrics) {
    this.metrics.push(metrics);
    
    // 限制记录数量
    if (this.metrics.length > this.config.maxRecords) {
      this.metrics = this.metrics.slice(-this.config.maxRecords);
    }

    // 保存到本地存储
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem('performance-metrics', JSON.stringify(this.metrics.slice(-10)));
      } catch (error) {
        console.warn('Failed to save metrics to localStorage:', error);
      }
    }

    // 记录性能数据
    logger.logPerformance(
      'performance-metrics-collection',
      Date.now() - metrics.timestamp,
      true,
      {
        webVitals: {
          cls: metrics.cls,
          fid: metrics.fid,
          fcp: metrics.fcp,
          lcp: metrics.lcp,
          ttfb: metrics.ttfb
        },
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        concurrencyMetrics: metrics.concurrency,
        cacheMetrics: metrics.cache
      }
    );

    // 检查阈值
    this.checkThresholds(metrics);
    
    // 触发回调
    if (this.onMetrics) {
      this.onMetrics(metrics);
    }
  }

  // 添加警告
  private addAlert(alert: PerformanceAlert) {
    this.alerts.push(alert);
    
    // 限制警告数量
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    if (this.onAlert) {
      this.onAlert(alert);
    }

    if (this.config.enableConsoleLog) {
      console.warn('⚠️ 性能警告:', alert);
    }
  }

  // 检查阈值
  private checkThresholds(metrics: PerformanceMetrics) {
    // 检查CPU使用率
    if (metrics.cpuUsage !== undefined) {
      if (metrics.cpuUsage > this.config.cpuThreshold.critical) {
        const alert = {
          type: 'cpu' as const,
          level: PerformanceLevel.POOR,
          message: `CPU使用率过高: ${metrics.cpuUsage.toFixed(2)}%`,
          value: metrics.cpuUsage,
          threshold: this.config.cpuThreshold.critical,
          timestamp: Date.now()
        };
        this.addAlert(alert);
        
        logger.warn(
          'High CPU usage detected',
          'performance-monitor',
          { cpuUsage: metrics.cpuUsage }
        );
      } else if (metrics.cpuUsage > this.config.cpuThreshold.warning) {
        this.addAlert({
          type: 'cpu',
          level: PerformanceLevel.NEEDS_IMPROVEMENT,
          message: `CPU使用率较高: ${metrics.cpuUsage.toFixed(2)}%`,
          value: metrics.cpuUsage,
          threshold: this.config.cpuThreshold.warning,
          timestamp: Date.now()
        });
      }
    }

    // 检查内存使用率
    if (metrics.memoryUsage) {
      const memoryPercentage = metrics.memoryUsage.percentage;
      if (memoryPercentage > this.config.memoryThreshold.critical) {
        const alert = {
          type: 'memory' as const,
          level: PerformanceLevel.POOR,
          message: `内存使用率过高: ${memoryPercentage.toFixed(2)}%`,
          value: memoryPercentage,
          threshold: this.config.memoryThreshold.critical,
          timestamp: Date.now()
        };
        this.addAlert(alert);
        
        logger.warn(
          'High memory usage detected',
          'performance-monitor',
          {
            memoryUsage: metrics.memoryUsage.used,
            memoryTotal: metrics.memoryUsage.total,
            usagePercentage: memoryPercentage
          }
        );
      } else if (memoryPercentage > this.config.memoryThreshold.warning) {
        this.addAlert({
          type: 'memory',
          level: PerformanceLevel.NEEDS_IMPROVEMENT,
          message: `内存使用率较高: ${memoryPercentage.toFixed(2)}%`,
          value: memoryPercentage,
          threshold: this.config.memoryThreshold.warning,
          timestamp: Date.now()
        });
      }
    }
    
    // 检查并发性能
    if (metrics.concurrency && metrics.concurrency.errorRate > 0.1) {
      const alert = {
        type: 'concurrency' as const,
        level: PerformanceLevel.POOR,
        message: `并发错误率过高: ${Math.round(metrics.concurrency.errorRate * 100)}%`,
        value: metrics.concurrency.errorRate,
        threshold: 0.1,
        timestamp: Date.now()
      };
      this.addAlert(alert);
      
      logger.error(
        'High concurrency error rate detected',
        'performance-monitor',
        {
          errorRate: metrics.concurrency.errorRate,
          totalTasks: metrics.concurrency.totalTasks,
          failedTasks: metrics.concurrency.failedTasks
        }
      );
    }
    
    // 检查缓存性能
    if (metrics.cache && metrics.cache.hitRate < 0.5 && metrics.cache.totalRequests > 10) {
      const alert = {
        type: 'cache' as const,
        level: PerformanceLevel.NEEDS_IMPROVEMENT,
        message: `缓存命中率过低: ${Math.round(metrics.cache.hitRate * 100)}%`,
        value: metrics.cache.hitRate,
        threshold: 0.5,
        timestamp: Date.now()
      };
      this.addAlert(alert);
      
      logger.warn(
        'Low cache hit rate detected',
        'performance-monitor',
        {
          hitRate: metrics.cache.hitRate,
          totalRequests: metrics.cache.totalRequests,
          hits: metrics.cache.hits,
          misses: metrics.cache.misses
        }
      );
    }
  }

  // 开始监控
  public start() {
    if (this.intervalId) {
      console.warn('Performance monitor is already running');
      return;
    }

    this.intervalId = setInterval(async () => {
      try {
        // 安全地获取指标数据，避免循环调用
        const metrics: PerformanceMetrics = {
          timestamp: Date.now(),
          memoryUsage: this.getMemoryUsage(),
          cpuUsage: await this.estimateCPUUsage()
        };

        // 安全地获取并发和缓存指标
        try {
          const concurrencyMetrics = defaultConcurrencyManager.getMetrics();
          metrics.concurrency = {
            totalTasks: concurrencyMetrics.totalTasks,
            completedTasks: concurrencyMetrics.completedTasks,
            failedTasks: concurrencyMetrics.failedTasks,
            currentConcurrency: concurrencyMetrics.currentConcurrency,
            queueSize: concurrencyMetrics.queueSize,
            throughput: concurrencyMetrics.throughput,
            averageExecutionTime: concurrencyMetrics.averageExecutionTime,
            errorRate: concurrencyMetrics.errorRate
          };
        } catch (error) {
          console.warn('Failed to get concurrency metrics:', error);
        }

        try {
          const cacheMetrics = defaultRequestManager.getMetrics();
          metrics.cache = {
            hits: cacheMetrics.hits,
            misses: cacheMetrics.misses,
            hitRate: cacheMetrics.hitRate,
            totalRequests: cacheMetrics.totalRequests,
            cacheSize: cacheMetrics.cacheSize,
            memoryUsage: cacheMetrics.memoryUsage,
            evictions: cacheMetrics.evictions
          };
        } catch (error) {
          console.warn('Failed to get cache metrics:', error);
        }

        this.addMetrics(metrics);
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, this.config.interval);

    if (this.config.enableConsoleLog) {
      console.log('🚀 性能监控已启动');
    }
  }

  // 停止监控
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // 清理观察器
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect observer:', error);
      }
    });
    this.observers = [];

    if (this.config.enableConsoleLog) {
      console.log('⏹️ 性能监控已停止');
    }
  }

  // 获取所有指标
  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // 获取最新指标
  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // 获取所有警告
  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  // 清除警告
  public clearAlerts() {
    this.alerts = [];
  }

  // 设置警告回调
  public onAlertCallback(callback: (alert: PerformanceAlert) => void) {
    this.onAlert = callback;
  }

  // 设置指标回调
  public onMetricsCallback(callback: (metrics: PerformanceMetrics) => void) {
    this.onMetrics = callback;
  }

  // 生成性能报告
  public generateReport(): {
    summary: {
      totalMetrics: number;
      totalAlerts: number;
      avgCpuUsage: number;
      avgMemoryUsage: number;
      criticalAlerts: number;
    };
    recommendations: string[];
  } {
    const totalMetrics = this.metrics.length;
    const totalAlerts = this.alerts.length;
    const criticalAlerts = this.alerts.filter(alert => alert.level === PerformanceLevel.POOR).length;
    
    const avgCpuUsage = this.metrics
      .filter(m => m.cpuUsage !== undefined)
      .reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / Math.max(1, this.metrics.filter(m => m.cpuUsage !== undefined).length);
    
    const avgMemoryUsage = this.metrics
      .filter(m => m.memoryUsage !== undefined)
      .reduce((sum, m) => sum + (m.memoryUsage?.percentage || 0), 0) / Math.max(1, this.metrics.filter(m => m.memoryUsage !== undefined).length);

    const recommendations: string[] = [];
    
    if (avgCpuUsage > 70) {
      recommendations.push('考虑优化CPU密集型操作，使用Web Workers处理复杂计算');
    }
    
    if (avgMemoryUsage > 70) {
      recommendations.push('检查内存泄漏，及时清理不需要的对象引用');
    }
    
    if (criticalAlerts > 5) {
      recommendations.push('存在多个严重性能问题，建议进行全面的性能优化');
    }

    return {
      summary: {
        totalMetrics,
        totalAlerts,
        avgCpuUsage,
        avgMemoryUsage,
        criticalAlerts
      },
      recommendations
    };
  }
}

// 全局监控实例
let globalMonitor: PerformanceMonitor | null = null;

// 获取全局监控实例
export function getPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(config);
  }
  return globalMonitor;
}

// 启动性能监控
export function startPerformanceMonitoring(config?: Partial<PerformanceConfig>) {
  const monitor = getPerformanceMonitor(config);
  monitor.start();
}

// 停止性能监控
export function stopPerformanceMonitoring() {
  if (globalMonitor) {
    globalMonitor.stop();
  }
}

export type { PerformanceMetrics, PerformanceAlert, PerformanceConfig };