/**
 * 前端性能监控工具库
 * 用于监控CPU占用、内存使用、Web Vitals等性能指标
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

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
  type: 'cpu' | 'memory' | 'render' | 'vitals';
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
  interval: 5000, // 5秒
  cpuThreshold: {
    warning: 70,
    critical: 90
  },
  memoryThreshold: {
    warning: 70,
    critical: 90
  },
  enableConsoleLog: true,
  enableLocalStorage: true,
  maxRecords: 100
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
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return undefined;
    }

    const memory = (performance as any).memory;
    const used = memory.usedJSHeapSize;
    const total = memory.totalJSHeapSize;
    const percentage = (used / total) * 100;

    return {
      used,
      total,
      percentage
    };
  }

  // 估算CPU使用率
  private async estimateCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      const iterations = 100000;
      
      // 执行一些计算密集型操作来测试CPU响应
      let result = 0;
      for (let i = 0; i < iterations; i++) {
        result += Math.random();
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // 基于执行时间估算CPU使用率（这是一个简化的估算）
      const expectedDuration = 1; // 预期的执行时间（毫秒）
      const cpuUsage = Math.min(100, (duration / expectedDuration) * 10);
      
      resolve(cpuUsage);
    });
  }

  // 更新指标
  private updateMetric(key: keyof PerformanceMetrics, value: number) {
    const currentMetrics = this.getCurrentMetrics();
    currentMetrics[key] = value as any;
    this.addMetrics(currentMetrics);
  }

  // 获取当前指标
  private getCurrentMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage()
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
    if (this.config.enableLocalStorage) {
      try {
        localStorage.setItem('performance-metrics', JSON.stringify(this.metrics.slice(-10)));
      } catch (error) {
        console.warn('无法保存性能指标到本地存储:', error);
      }
    }

    // 触发回调
    if (this.onMetrics) {
      this.onMetrics(metrics);
    }

    // 检查是否需要发出警告
    this.checkThresholds(metrics);
  }

  // 添加警告
  private addAlert(alert: PerformanceAlert) {
    this.alerts.push(alert);
    
    // 限制警告数量
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // 触发回调
    if (this.onAlert) {
      this.onAlert(alert);
    }

    if (this.config.enableConsoleLog) {
      const emoji = alert.level === PerformanceLevel.POOR ? '🔴' : '🟡';
      console.warn(`${emoji} 性能警告:`, alert.message, alert);
    }
  }

  // 检查阈值
  private checkThresholds(metrics: PerformanceMetrics) {
    // 检查内存使用
    if (metrics.memoryUsage) {
      const { percentage } = metrics.memoryUsage;
      if (percentage > this.config.memoryThreshold.critical) {
        this.addAlert({
          type: 'memory',
          level: PerformanceLevel.POOR,
          message: `内存使用率过高: ${percentage.toFixed(1)}%`,
          value: percentage,
          threshold: this.config.memoryThreshold.critical,
          timestamp: Date.now()
        });
      } else if (percentage > this.config.memoryThreshold.warning) {
        this.addAlert({
          type: 'memory',
          level: PerformanceLevel.NEEDS_IMPROVEMENT,
          message: `内存使用率较高: ${percentage.toFixed(1)}%`,
          value: percentage,
          threshold: this.config.memoryThreshold.warning,
          timestamp: Date.now()
        });
      }
    }

    // 检查CPU使用
    if (metrics.cpuUsage) {
      if (metrics.cpuUsage > this.config.cpuThreshold.critical) {
        this.addAlert({
          type: 'cpu',
          level: PerformanceLevel.POOR,
          message: `CPU使用率过高: ${metrics.cpuUsage.toFixed(1)}%`,
          value: metrics.cpuUsage,
          threshold: this.config.cpuThreshold.critical,
          timestamp: Date.now()
        });
      } else if (metrics.cpuUsage > this.config.cpuThreshold.warning) {
        this.addAlert({
          type: 'cpu',
          level: PerformanceLevel.NEEDS_IMPROVEMENT,
          message: `CPU使用率较高: ${metrics.cpuUsage.toFixed(1)}%`,
          value: metrics.cpuUsage,
          threshold: this.config.cpuThreshold.warning,
          timestamp: Date.now()
        });
      }
    }
  }

  // 开始监控
  public start() {
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = setInterval(async () => {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: await this.estimateCPUUsage()
      };

      this.addMetrics(metrics);
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
      observer.disconnect();
    });
    this.observers = [];

    if (this.config.enableConsoleLog) {
      console.log('⏹️ 性能监控已停止');
    }
  }

  // 获取性能指标
  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // 获取最新指标
  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // 获取警告
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
    const metrics = this.getMetrics();
    const alerts = this.getAlerts();

    const cpuValues = metrics.filter(m => m.cpuUsage).map(m => m.cpuUsage!);
    const memoryValues = metrics.filter(m => m.memoryUsage).map(m => m.memoryUsage!.percentage);
    
    const avgCpuUsage = cpuValues.length > 0 ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0;
    const avgMemoryUsage = memoryValues.length > 0 ? memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length : 0;
    
    const criticalAlerts = alerts.filter(a => a.level === PerformanceLevel.POOR).length;

    const recommendations: string[] = [];
    
    if (avgCpuUsage > 70) {
      recommendations.push('CPU使用率较高，建议优化计算密集型操作');
    }
    
    if (avgMemoryUsage > 70) {
      recommendations.push('内存使用率较高，建议检查内存泄漏');
    }
    
    if (alerts.filter(a => a.type === 'cpu').length > 5) {
      recommendations.push('频繁出现长任务，建议使用Web Workers或代码分割');
    }

    return {
      summary: {
        totalMetrics: metrics.length,
        totalAlerts: alerts.length,
        avgCpuUsage,
        avgMemoryUsage,
        criticalAlerts
      },
      recommendations
    };
  }
}

// 创建全局监控实例
let globalMonitor: PerformanceMonitor | null = null;

// 获取全局监控实例
export function getPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(config);
  }
  return globalMonitor;
}

// 快速启动监控
export function startPerformanceMonitoring(config?: Partial<PerformanceConfig>) {
  const monitor = getPerformanceMonitor(config);
  monitor.start();
  return monitor;
}

// 停止监控
export function stopPerformanceMonitoring() {
  if (globalMonitor) {
    globalMonitor.stop();
  }
}

// 导出类型
export type { PerformanceMetrics, PerformanceAlert, PerformanceConfig };