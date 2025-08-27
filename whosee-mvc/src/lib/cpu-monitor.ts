/**
 * CPU占用监控工具
 * 用于检测和分析导致高CPU使用的代码路径和函数
 */

// CPU监控数据接口
export interface CPUMonitorData {
  functionName: string;
  executionTime: number;
  callCount: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
  lastCallTime: number;
  stackTrace?: string;
  isHeavy: boolean;
}

// CPU使用情况接口
export interface CPUUsageData {
  timestamp: number;
  usage: number;
  activeThreads: number;
  longTasks: LongTaskData[];
  heavyFunctions: CPUMonitorData[];
}

// 长任务数据接口
export interface LongTaskData {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  attribution?: Array<Record<string, unknown>>;
}

// CPU监控配置
export interface CPUMonitorConfig {
  // 监控间隔（毫秒）
  interval: number;
  
  // 长任务阈值（毫秒）
  longTaskThreshold: number;
  
  // 重函数阈值（毫秒）
  heavyFunctionThreshold: number;
  
  // 是否启用函数监控
  enableFunctionMonitoring: boolean;
  
  // 是否启用堆栈跟踪
  enableStackTrace: boolean;
  
  // 最大记录数
  maxRecords: number;
  
  // 是否启用控制台日志
  enableConsoleLog: boolean;
}

// 默认配置
const DEFAULT_CONFIG: CPUMonitorConfig = {
  interval: 5000, // 5秒 - 减少监控频率
  longTaskThreshold: 100, // 提高长任务阈值到100ms
  heavyFunctionThreshold: 50, // 提高重函数阈值到50ms
  enableFunctionMonitoring: true,
  enableStackTrace: false,
  maxRecords: 50, // 减少最大记录数
  enableConsoleLog: false // 默认关闭控制台日志
};

// CPU监控类
export class CPUMonitor {
  private config: CPUMonitorConfig;
  private functionData = new Map<string, CPUMonitorData>();
  private usageHistory: CPUUsageData[] = [];
  private longTasks: LongTaskData[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private observer: PerformanceObserver | null = null;
  private isMonitoring = false;
  private onAlert?: (data: CPUUsageData) => void;

  constructor(config: Partial<CPUMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initLongTaskObserver();
  }

  // 初始化长任务观察器
  private initLongTaskObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.recordLongTask({
              name: entry.name || 'unknown',
              duration: entry.duration,
              startTime: entry.startTime,
              endTime: entry.startTime + entry.duration,
              attribution: (entry as PerformanceEntry & { attribution?: Array<Record<string, unknown>> }).attribution
            });
          }
        }
      });
      
      this.observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long Task Observer not supported:', error);
    }
  }

  // 记录长任务
  private recordLongTask(task: LongTaskData) {
    this.longTasks.push(task);
    
    // 限制记录数量
    if (this.longTasks.length > this.config.maxRecords) {
      this.longTasks = this.longTasks.slice(-this.config.maxRecords);
    }

    if (this.config.enableConsoleLog) {
      console.warn('🐌 检测到长任务:', {
        name: task.name,
        duration: `${task.duration.toFixed(2)}ms`,
        startTime: task.startTime,
        attribution: task.attribution
      });
    }
  }

  // 监控函数执行时间
  public monitorFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    functionName?: string
  ): T {
    if (!this.config.enableFunctionMonitoring) {
      return fn;
    }

    const name = functionName || fn.name || 'anonymous';
    
    return ((...args: Parameters<T>) => {
      const startTime = performance.now();
      
      try {
        const result = fn.apply(this, args);
        
        // 处理Promise
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            const endTime = performance.now();
            this.recordFunctionExecution(name, endTime - startTime);
          });
        }
        
        const endTime = performance.now();
        this.recordFunctionExecution(name, endTime - startTime);
        return result;
      } catch (error) {
        const endTime = performance.now();
        this.recordFunctionExecution(name, endTime - startTime);
        throw error;
      }
    }) as T;
  }

  // 记录函数执行
  private recordFunctionExecution(functionName: string, executionTime: number) {
    const existing = this.functionData.get(functionName);
    
    if (existing) {
      existing.callCount += 1;
      existing.totalTime += executionTime;
      existing.avgTime = existing.totalTime / existing.callCount;
      existing.maxTime = Math.max(existing.maxTime, executionTime);
      existing.minTime = Math.min(existing.minTime, executionTime);
      existing.lastCallTime = Date.now();
      existing.isHeavy = existing.avgTime > this.config.heavyFunctionThreshold;
    } else {
      this.functionData.set(functionName, {
        functionName,
        executionTime,
        callCount: 1,
        totalTime: executionTime,
        avgTime: executionTime,
        maxTime: executionTime,
        minTime: executionTime,
        lastCallTime: Date.now(),
        stackTrace: this.config.enableStackTrace ? new Error().stack : undefined,
        isHeavy: executionTime > this.config.heavyFunctionThreshold
      });
    }

    // 检查是否为重函数
    if (executionTime > this.config.heavyFunctionThreshold) {
      if (this.config.enableConsoleLog) {
        console.warn('🔥 检测到重函数:', {
          name: functionName,
          executionTime: `${executionTime.toFixed(2)}ms`,
          callCount: this.functionData.get(functionName)?.callCount
        });
      }
    }
  }

  // 估算CPU使用率
  private async estimateCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      const iterations = 10000; // 减少迭代次数
      
      setTimeout(() => {
        for (let i = 0; i < iterations; i++) {
          Math.random();
        }
        const end = performance.now();
        const duration = end - start;
        
        // 改进的CPU使用率计算
        // 基于执行时间和长任务数量来估算
        const baseUsage = Math.min(50, duration / 2); // 基础使用率，最高50%
        const longTaskPenalty = this.longTasks.length * 5; // 长任务惩罚
        const recentTasks = this.longTasks.filter(task => Date.now() - task.endTime < 10000);
        const recentTaskPenalty = recentTasks.length * 10;
        
        const cpuUsage = Math.min(100, baseUsage + longTaskPenalty + recentTaskPenalty);
        resolve(cpuUsage);
      }, 0);
    });
  }

  // 获取活跃线程数（模拟）
  private getActiveThreads(): number {
    // 在浏览器环境中，我们无法直接获取线程数
    // 这里基于当前的长任务数量来估算
    const recentTasks = this.longTasks.filter(
      task => Date.now() - task.endTime < 5000
    );
    return Math.max(1, recentTasks.length);
  }

  // 收集CPU数据
  private async collectCPUData(): Promise<CPUUsageData> {
    const usage = await this.estimateCPUUsage();
    const activeThreads = this.getActiveThreads();
    const recentLongTasks = this.longTasks.filter(
      task => Date.now() - task.endTime < 10000
    );
    const heavyFunctions = Array.from(this.functionData.values())
      .filter(fn => fn.isHeavy)
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return {
      timestamp: Date.now(),
      usage,
      activeThreads,
      longTasks: recentLongTasks,
      heavyFunctions
    };
  }

  // 开始监控
  public async start() {
    if (this.isMonitoring) {
      console.warn('CPU monitor is already running');
      return;
    }

    this.isMonitoring = true;
    
    // 立即收集一次数据
    const initialData = await this.collectCPUData();
    this.usageHistory.push(initialData);

    this.intervalId = setInterval(async () => {
      try {
        const data = await this.collectCPUData();
        this.usageHistory.push(data);
        
        // 限制历史记录数量
        if (this.usageHistory.length > this.config.maxRecords) {
          this.usageHistory = this.usageHistory.slice(-this.config.maxRecords);
        }

        // 检查是否需要发出警告
        if (data.usage > 80 || data.longTasks.length > 5) {
          if (this.onAlert) {
            this.onAlert(data);
          }
          
          if (this.config.enableConsoleLog) {
            console.warn('⚠️ CPU使用率过高:', {
              usage: `${data.usage.toFixed(2)}%`,
              longTasks: data.longTasks.length,
              heavyFunctions: data.heavyFunctions.length
            });
          }
        }
      } catch (error) {
        console.error('CPU monitoring error:', error);
      }
    }, this.config.interval);

    if (this.config.enableConsoleLog) {
      console.log('🚀 CPU监控已启动');
    }
  }

  // 停止监控
  public stop() {
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect observer:', error);
      }
    }

    if (this.config.enableConsoleLog) {
      console.log('⏹️ CPU监控已停止');
    }
  }

  // 获取使用历史
  public getUsageHistory(): CPUUsageData[] {
    return [...this.usageHistory];
  }

  // 获取最新使用情况
  public getLatestUsage(): CPUUsageData | null {
    return this.usageHistory.length > 0 
      ? this.usageHistory[this.usageHistory.length - 1] 
      : null;
  }

  // 获取函数数据
  public getFunctionData(): CPUMonitorData[] {
    return Array.from(this.functionData.values());
  }

  // 获取重函数
  public getHeavyFunctions(): CPUMonitorData[] {
    return Array.from(this.functionData.values())
      .filter(fn => fn.isHeavy)
      .sort((a, b) => b.avgTime - a.avgTime);
  }

  // 获取长任务
  public getLongTasks(): LongTaskData[] {
    return [...this.longTasks];
  }

  // 清除数据
  public clear() {
    this.functionData.clear();
    this.usageHistory = [];
    this.longTasks = [];
  }

  // 设置警告回调
  public onAlertCallback(callback: (data: CPUUsageData) => void) {
    this.onAlert = callback;
  }

  // 生成报告
  public generateReport(): {
    summary: {
      avgCpuUsage: number;
      maxCpuUsage: number;
      totalLongTasks: number;
      totalHeavyFunctions: number;
      monitoringDuration: number;
    };
    topHeavyFunctions: Array<{
      name: string;
      avgTime: number;
      callCount: number;
      totalTime: number;
    }>;
    recentLongTasks: LongTaskData[];
    recommendations: string[];
  } {
    const avgCpuUsage = this.usageHistory.length > 0
      ? this.usageHistory.reduce((sum, data) => sum + data.usage, 0) / this.usageHistory.length
      : 0;
    
    const maxCpuUsage = this.usageHistory.length > 0
      ? Math.max(...this.usageHistory.map(data => data.usage))
      : 0;
    
    const totalLongTasks = this.longTasks.length;
    const totalHeavyFunctions = this.getHeavyFunctions().length;
    
    const monitoringDuration = this.usageHistory.length > 0
      ? this.usageHistory[this.usageHistory.length - 1].timestamp - this.usageHistory[0].timestamp
      : 0;

    const topHeavyFunctions = this.getHeavyFunctions()
      .slice(0, 10)
      .map(fn => ({
        name: fn.functionName,
        avgTime: fn.avgTime,
        callCount: fn.callCount,
        totalTime: fn.totalTime
      }));

    const recentLongTasks = this.longTasks
      .filter(task => Date.now() - task.endTime < 60000)
      .slice(-10);

    const recommendations: string[] = [];
    
    if (avgCpuUsage > 70) {
      recommendations.push('平均CPU使用率过高，考虑优化算法或使用Web Workers');
    }
    
    if (totalLongTasks > 10) {
      recommendations.push('检测到多个长任务，建议将复杂操作分解为小块');
    }
    
    if (totalHeavyFunctions > 5) {
      recommendations.push('存在多个重函数，考虑优化这些函数的实现');
    }

    return {
      summary: {
        avgCpuUsage,
        maxCpuUsage,
        totalLongTasks,
        totalHeavyFunctions,
        monitoringDuration
      },
      topHeavyFunctions,
      recentLongTasks,
      recommendations
    };
  }
}

// 装饰器：监控方法
export function monitorCPU(target: object, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const monitor = getCPUMonitor();
  
  descriptor.value = monitor.monitorFunction(originalMethod, `${target.constructor.name}.${propertyName}`);
  
  return descriptor;
}

// 全局CPU监控实例
let globalCPUMonitor: CPUMonitor | null = null;

// 获取全局CPU监控实例
export function getCPUMonitor(config?: Partial<CPUMonitorConfig>): CPUMonitor {
  if (!globalCPUMonitor) {
    globalCPUMonitor = new CPUMonitor(config);
  }
  return globalCPUMonitor;
}

// 启动CPU监控
export function startCPUMonitoring(config?: Partial<CPUMonitorConfig>) {
  const monitor = getCPUMonitor(config);
  monitor.start();
}

// 停止CPU监控
export function stopCPUMonitoring() {
  if (globalCPUMonitor) {
    globalCPUMonitor.stop();
  }
}

// 监控异步函数
export function monitorAsyncFunction<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  functionName?: string
): T {
  return getCPUMonitor().monitorFunction(fn, functionName);
}

// 监控同步函数
export function monitorSyncFunction<T extends (...args: unknown[]) => unknown>(
  fn: T,
  functionName?: string
): T {
  return getCPUMonitor().monitorFunction(fn, functionName);
}

export type { CPUMonitorData, CPUUsageData, LongTaskData, CPUMonitorConfig };