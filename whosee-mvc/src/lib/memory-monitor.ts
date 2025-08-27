/**
 * 内存监控模块
 * 监控应用的内存使用情况，检测内存泄漏
 */

import { logger } from './logger';

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
  memoryUsagePercentage: number;
}

export interface MemoryMonitorConfig {
  interval: number; // 监控间隔（毫秒）
  enableConsoleLog: boolean;
  memoryThreshold: number; // 内存使用阈值（百分比）
  leakDetectionEnabled: boolean;
  leakDetectionSamples: number; // 用于检测内存泄漏的样本数量
  maxHistorySize: number;
}

const DEFAULT_CONFIG: MemoryMonitorConfig = {
  interval: 5000, // 5秒
  enableConsoleLog: false,
  memoryThreshold: 80, // 80%
  leakDetectionEnabled: true,
  leakDetectionSamples: 10,
  maxHistorySize: 100
};

export class MemoryMonitor {
  private config: MemoryMonitorConfig;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryMetrics[] = [];
  private lastMemoryCheck = 0;

  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public start(): void {
    if (this.isRunning || typeof window === 'undefined') {
      return;
    }

    // 检查是否支持 performance.memory
    if (!this.isMemoryAPISupported()) {
      logger.warn('Memory monitoring not supported in this browser', 'memory-monitor');
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.collectMemoryMetrics();
    }, this.config.interval);

    logger.info('Memory monitor started', 'memory-monitor', {
      interval: this.config.interval,
      threshold: this.config.memoryThreshold
    });
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Memory monitor stopped', 'memory-monitor');
  }

  private isMemoryAPISupported(): boolean {
    return typeof window !== 'undefined' && 
           'performance' in window && 
           'memory' in (window.performance as any);
  }

  private collectMemoryMetrics(): void {
    if (!this.isMemoryAPISupported()) {
      return;
    }

    const memory = (window.performance as any).memory;
    const timestamp = Date.now();
    
    const metrics: MemoryMetrics = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp,
      memoryUsagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };

    // 添加到历史记录
    this.memoryHistory.push(metrics);
    
    // 保持历史记录大小在限制内
    if (this.memoryHistory.length > this.config.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // 检查内存使用阈值
    this.checkMemoryThreshold(metrics);

    // 检测内存泄漏
    if (this.config.leakDetectionEnabled) {
      this.detectMemoryLeak();
    }

    // 记录性能数据
    logger.logPerformance(
      'memory-usage',
      metrics.memoryUsagePercentage,
      metrics.memoryUsagePercentage < this.config.memoryThreshold,
      {
        usedJSHeapSize: this.formatBytes(metrics.usedJSHeapSize),
        totalJSHeapSize: this.formatBytes(metrics.totalJSHeapSize),
        jsHeapSizeLimit: this.formatBytes(metrics.jsHeapSizeLimit),
        memoryUsagePercentage: metrics.memoryUsagePercentage.toFixed(2)
      }
    );

    if (this.config.enableConsoleLog) {
      console.log('Memory Metrics:', {
        used: this.formatBytes(metrics.usedJSHeapSize),
        total: this.formatBytes(metrics.totalJSHeapSize),
        limit: this.formatBytes(metrics.jsHeapSizeLimit),
        usage: `${metrics.memoryUsagePercentage.toFixed(2)}%`
      });
    }
  }

  private checkMemoryThreshold(metrics: MemoryMetrics): void {
    if (metrics.memoryUsagePercentage > this.config.memoryThreshold) {
      const warningMessage = `High memory usage detected: ${metrics.memoryUsagePercentage.toFixed(2)}%`;
      
      logger.warn(warningMessage, 'memory-monitor', {
        usedJSHeapSize: this.formatBytes(metrics.usedJSHeapSize),
        totalJSHeapSize: this.formatBytes(metrics.totalJSHeapSize),
        jsHeapSizeLimit: this.formatBytes(metrics.jsHeapSizeLimit),
        threshold: this.config.memoryThreshold
      });

      if (this.config.enableConsoleLog) {
        console.warn(warningMessage, metrics);
      }

      // 触发自定义事件
      this.dispatchMemoryEvent('high-memory-usage', metrics);
    }
  }

  private detectMemoryLeak(): void {
    if (this.memoryHistory.length < this.config.leakDetectionSamples) {
      return;
    }

    const recentSamples = this.memoryHistory.slice(-this.config.leakDetectionSamples);
    const firstSample = recentSamples[0];
    const lastSample = recentSamples[recentSamples.length - 1];
    
    // 计算内存增长趋势
    const memoryGrowth = lastSample.usedJSHeapSize - firstSample.usedJSHeapSize;
    const timeSpan = lastSample.timestamp - firstSample.timestamp;
    const growthRate = memoryGrowth / timeSpan; // bytes per ms

    // 如果内存持续增长且增长率超过阈值，可能存在内存泄漏
    const leakThreshold = 1024; // 1KB per second
    if (growthRate > leakThreshold / 1000) {
      const leakMessage = `Potential memory leak detected: ${this.formatBytes(memoryGrowth)} growth in ${(timeSpan / 1000).toFixed(1)}s`;
      
      logger.error(leakMessage, 'memory-monitor', {
        memoryGrowth: this.formatBytes(memoryGrowth),
        timeSpan: `${(timeSpan / 1000).toFixed(1)}s`,
        growthRate: `${this.formatBytes(growthRate * 1000)}/s`,
        samples: this.config.leakDetectionSamples
      });

      if (this.config.enableConsoleLog) {
        console.error(leakMessage, {
          firstSample,
          lastSample,
          growthRate: `${this.formatBytes(growthRate * 1000)}/s`
        });
      }

      // 触发内存泄漏事件
      this.dispatchMemoryEvent('memory-leak-detected', {
        memoryGrowth,
        timeSpan,
        growthRate,
        samples: recentSamples
      });
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private dispatchMemoryEvent(eventName: string, data: any): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(`memory-monitor:${eventName}`, {
        detail: data
      });
      window.dispatchEvent(event);
    }
  }

  public getCurrentMetrics(): MemoryMetrics | null {
    if (!this.isMemoryAPISupported()) {
      return null;
    }

    const memory = (window.performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
      memoryUsagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }

  public getMemoryHistory(): MemoryMetrics[] {
    return [...this.memoryHistory];
  }

  public getMemoryStats(): {
    averageUsage: number;
    peakUsage: number;
    currentUsage: number;
    memoryGrowth: number;
    isLeakDetected: boolean;
  } {
    if (this.memoryHistory.length === 0) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        currentUsage: 0,
        memoryGrowth: 0,
        isLeakDetected: false
      };
    }

    const usagePercentages = this.memoryHistory.map(m => m.memoryUsagePercentage);
    const averageUsage = usagePercentages.reduce((a, b) => a + b, 0) / usagePercentages.length;
    const peakUsage = Math.max(...usagePercentages);
    const currentUsage = usagePercentages[usagePercentages.length - 1];
    
    const firstMemory = this.memoryHistory[0].usedJSHeapSize;
    const lastMemory = this.memoryHistory[this.memoryHistory.length - 1].usedJSHeapSize;
    const memoryGrowth = lastMemory - firstMemory;

    // 简单的内存泄漏检测
    const isLeakDetected = this.memoryHistory.length >= 5 && 
                          memoryGrowth > 0 && 
                          currentUsage > averageUsage * 1.2;

    return {
      averageUsage,
      peakUsage,
      currentUsage,
      memoryGrowth,
      isLeakDetected
    };
  }

  public clearHistory(): void {
    this.memoryHistory = [];
    logger.info('Memory history cleared', 'memory-monitor');
  }

  public updateConfig(updates: Partial<MemoryMonitorConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    
    logger.info('Memory monitor config updated', 'memory-monitor', {
      oldConfig,
      newConfig: this.config
    });

    // 如果间隔时间改变且正在运行，重启监控
    if (this.isRunning && oldConfig.interval !== this.config.interval) {
      this.stop();
      this.start();
    }
  }

  public isSupported(): boolean {
    return this.isMemoryAPISupported();
  }

  public getStatus(): {
    isRunning: boolean;
    isSupported: boolean;
    historySize: number;
    config: MemoryMonitorConfig;
  } {
    return {
      isRunning: this.isRunning,
      isSupported: this.isMemoryAPISupported(),
      historySize: this.memoryHistory.length,
      config: { ...this.config }
    };
  }
}

// 导出类型
export type { MemoryMonitorConfig };

// 默认导出
export default MemoryMonitor;