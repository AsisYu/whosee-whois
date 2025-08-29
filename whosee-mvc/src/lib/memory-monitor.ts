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
  interval: 20000, // 20秒 - 进一步减少监控频率
  enableConsoleLog: false,
  memoryThreshold: 95, // 95% - 进一步提高阈值
  leakDetectionEnabled: true,
  leakDetectionSamples: 12, // 增加样本数量，基于4分钟数据
  maxHistorySize: 50 // 适当增加历史记录大小
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
    
    // 清理过期的历史记录
    this.cleanupMemoryHistory();

    // 检查内存使用阈值
    this.checkMemoryThreshold(metrics);

    // 检测内存泄漏
    if (this.config.leakDetectionEnabled) {
      this.detectMemoryLeak();
    }

    // 记录性能数据（降低日志频率）
    if (this.memoryHistory.length % 3 === 0) { // 每3次收集记录一次日志
      logger.logPerformance(
        'memory-usage',
        metrics.memoryUsagePercentage,
        metrics.memoryUsagePercentage < this.config.memoryThreshold,
        {
          usedJSHeapSize: this.formatBytes(metrics.usedJSHeapSize),
          totalJSHeapSize: this.formatBytes(metrics.totalJSHeapSize),
          jsHeapSizeLimit: this.formatBytes(metrics.jsHeapSizeLimit),
          memoryUsagePercentage: metrics.memoryUsagePercentage.toFixed(2),
          historySize: this.memoryHistory.length
        }
      );
    }

    if (this.config.enableConsoleLog) {
      console.log('Memory Metrics:', {
        used: this.formatBytes(metrics.usedJSHeapSize),
        total: this.formatBytes(metrics.totalJSHeapSize),
        limit: this.formatBytes(metrics.jsHeapSizeLimit),
        usage: `${metrics.memoryUsagePercentage.toFixed(2)}%`
      });
    }
  }

  // 清理过期的内存历史记录
  private cleanupMemoryHistory(): void {
    // 保持历史记录在配置的最大大小内
    if (this.memoryHistory.length > this.config.maxHistorySize) {
      const excessCount = this.memoryHistory.length - this.config.maxHistorySize;
      this.memoryHistory.splice(0, excessCount);
    }
    
    // 清理超过1小时的旧记录
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.memoryHistory = this.memoryHistory.filter(metric => metric.timestamp > oneHourAgo);
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

    // 更严格的内存泄漏检测条件
    const leakThreshold = 102400; // 100KB per second - 进一步提高阈值
    const minGrowth = 10 * 1024 * 1024; // 至少10MB增长才考虑泄漏
    const minTimeSpan = 120000; // 至少2分钟的观察时间
    const maxGrowthRate = 2 * 1024 * 1024; // 最大2MB/s增长率，超过可能是正常的大数据加载
    
    // 检查是否所有样本都呈增长趋势
    const isConsistentGrowth = this.checkConsistentGrowth(recentSamples);
    
    // 检查当前内存使用是否已经很高
    const currentUsageHigh = lastSample.memoryUsagePercentage > 80;
    
    if (growthRate > leakThreshold / 1000 && 
        growthRate < maxGrowthRate / 1000 && // 排除过快增长（可能是正常加载）
        memoryGrowth > minGrowth && 
        timeSpan > minTimeSpan &&
        isConsistentGrowth &&
        currentUsageHigh) { // 只有在内存使用率高时才报告泄漏
      
      const leakMessage = `Potential memory leak detected: ${this.formatBytes(memoryGrowth)} growth in ${(timeSpan / 1000).toFixed(1)}s`;
      
      logger.warn(leakMessage, 'memory-monitor', {
        memoryGrowth: this.formatBytes(memoryGrowth),
        timeSpan: `${(timeSpan / 1000).toFixed(1)}s`,
        growthRate: `${this.formatBytes(growthRate * 1000)}/s`,
        currentUsage: `${lastSample.memoryUsagePercentage.toFixed(1)}%`,
        samples: this.config.leakDetectionSamples,
        firstSample: {
          usage: this.formatBytes(firstSample.usedJSHeapSize),
          percentage: `${firstSample.memoryUsagePercentage.toFixed(1)}%`
        },
        lastSample: {
          usage: this.formatBytes(lastSample.usedJSHeapSize),
          percentage: `${lastSample.memoryUsagePercentage.toFixed(1)}%`
        }
      });

      if (this.config.enableConsoleLog) {
        console.warn(leakMessage, {
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

  // 检查是否存在持续的内存增长趋势
  private checkConsistentGrowth(samples: MemoryMetrics[]): boolean {
    if (samples.length < 4) return false;
    
    let increasingCount = 0;
    let significantIncreases = 0;
    const minSignificantIncrease = 512 * 1024; // 512KB
    
    for (let i = 1; i < samples.length; i++) {
      const growth = samples[i].usedJSHeapSize - samples[i - 1].usedJSHeapSize;
      if (growth > 0) {
        increasingCount++;
        if (growth > minSignificantIncrease) {
          significantIncreases++;
        }
      }
    }
    
    // 至少70%的样本显示增长趋势，且至少有50%的显著增长
    const growthRatio = increasingCount / (samples.length - 1);
    const significantRatio = significantIncreases / (samples.length - 1);
    
    return growthRatio >= 0.7 && significantRatio >= 0.5;
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