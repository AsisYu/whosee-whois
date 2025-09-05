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
  attribution?: any[];
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
  interval: 1000,
  longTaskThreshold: 50,
  heavyFunctionThreshold: 10,
  enableFunctionMonitoring: true,
  enableStackTrace: false,
  maxRecords: 100,
  enableConsoleLog: true
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
              attribution: (entry as any).attribution
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
  public monitorFunction<T extends (...args: any[]) => any>(
    fn: T,
    functionName?: string
  ): T {
    if (!this.config.enableFunctionMonitoring) {
      return fn;
    }

    const name = functionName || fn.name || 'anonymous';
    
    return ((...args: any[]) => {
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
      const iterations = 50000;
      
      // 执行计算密集型操作
      let result = 0;
      for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(Math.random() * 1000);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // 基于执行时间估算CPU使用率
      const baselineTime = 2; // 基准时间（毫秒）
      const cpuUsage = Math.min(100, Math.max(0, (duration / baselineTime) * 20));
      
      resolve(cpuUsage);
    });
  }

  // 获取活跃线程数（近似）
  private getActiveThreads(): number {
    // 这是一个简化的估算，基于当前的长任务数量
    const recentTasks = this.longTasks.filter(
      task => Date.now() - task.endTime < 5000
    );
    return Math.max(1, recentTasks.length);
  }

  // 收集CPU使用数据
  private async collectCPUData(): Promise<CPUUsageData> {
    const usage = await this.estimateCPUUsage();
    const activeThreads = this.getActiveThreads();
    const recentLongTasks = this.longTasks.filter(
      task => Date.now() - task.endTime < this.config.interval
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
      return;
    }

    this.isMonitoring = true;
    
    this.intervalId = setInterval(async () => {
      const data = await this.collectCPUData();
      this.usageHistory.push(data);
      
      // 限制历史记录数量
      if (this.usageHistory.length > this.config.maxRecords) {
        this.usageHistory = this.usageHistory.slice(-this.config.maxRecords);
      }

      // 检查是否需要发出警告
      if (data.usage > 80 || data.longTasks.length > 3) {
        if (this.onAlert) {
          this.onAlert(data);
        }
        
        if (this.config.enableConsoleLog) {
          console.warn('🚨 CPU使用率过高:', {
            usage: `${data.usage.toFixed(1)}%`,
            longTasks: data.longTasks.length,
            heavyFunctions: data.heavyFunctions.length
          });
        }
      }
    }, this.config.interval);

    if (this.config.enableConsoleLog) {
      console.log('🖥️ CPU监控已启动');
    }
  }

  // 停止监控
  public stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.config.enableConsoleLog) {
      console.log('⏹️ CPU监控已停止');
    }
  }

  // 获取使用历史
  public getUsageHistory(): CPUUsageData[] {
    return [...this.usageHistory];
  }

  // 获取最新使用数据
  public getLatestUsage(): CPUUsageData | null {
    return this.usageHistory.length > 0 
      ? this.usageHistory[this.usageHistory.length - 1] 
      : null;
  }

  // 获取函数性能数据
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

  // 生成CPU性能报告
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
    const usageValues = this.usageHistory.map(h => h.usage);
    const avgCpuUsage = usageValues.length > 0 
      ? usageValues.reduce((a, b) => a + b, 0) / usageValues.length 
      : 0;
    const maxCpuUsage = usageValues.length > 0 ? Math.max(...usageValues) : 0;
    
    const heavyFunctions = this.getHeavyFunctions();
    const recentLongTasks = this.longTasks.slice(-10);
    
    const monitoringDuration = this.usageHistory.length > 0 
      ? this.usageHistory[this.usageHistory.length - 1].timestamp - this.usageHistory[0].timestamp
      : 0;

    const recommendations: string[] = [];
    
    if (avgCpuUsage > 60) {
      recommendations.push('平均CPU使用率较高，建议优化计算密集型操作');
    }
    
    if (heavyFunctions.length > 5) {
      recommendations.push('发现多个重函数，建议使用Web Workers或代码分割');
    }
    
    if (this.longTasks.length > 10) {
      recommendations.push('频繁出现长任务，建议将大任务拆分为小任务');
    }
    
    if (heavyFunctions.some(fn => fn.avgTime > 100)) {
      recommendations.push('存在执行时间超过100ms的函数，建议异步处理');
    }

    return {
      summary: {
        avgCpuUsage,
        maxCpuUsage,
        totalLongTasks: this.longTasks.length,
        totalHeavyFunctions: heavyFunctions.length,
        monitoringDuration
      },
      topHeavyFunctions: heavyFunctions.slice(0, 10).map(fn => ({
        name: fn.functionName,
        avgTime: fn.avgTime,
        callCount: fn.callCount,
        totalTime: fn.totalTime
      })),
      recentLongTasks,
      recommendations
    };
  }
}

// 函数装饰器：自动监控函数性能
export function monitorCPU(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    const monitor = getCPUMonitor();
    const monitoredMethod = monitor.monitorFunction(method, `${target.constructor.name}.${propertyName}`);
    return monitoredMethod.apply(this, args);
  };
  
  return descriptor;
}

// 创建全局CPU监控实例
let globalCPUMonitor: CPUMonitor | null = null;

// 获取全局CPU监控实例
export function getCPUMonitor(config?: Partial<CPUMonitorConfig>): CPUMonitor {
  if (!globalCPUMonitor) {
    globalCPUMonitor = new CPUMonitor(config);
  }
  return globalCPUMonitor;
}

// 快速启动CPU监控
export function startCPUMonitoring(config?: Partial<CPUMonitorConfig>) {
  const monitor = getCPUMonitor(config);
  monitor.start();
  return monitor;
}

// 停止CPU监控
export function stopCPUMonitoring() {
  if (globalCPUMonitor) {
    globalCPUMonitor.stop();
  }
}

// 监控异步函数
export function monitorAsyncFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  functionName?: string
): T {
  const monitor = getCPUMonitor();
  return monitor.monitorFunction(fn, functionName);
}

// 监控同步函数
export function monitorSyncFunction<T extends (...args: any[]) => any>(
  fn: T,
  functionName?: string
): T {
  const monitor = getCPUMonitor();
  return monitor.monitorFunction(fn, functionName);
}

// 导出类型
export type { CPUMonitorData, CPUUsageData, LongTaskData, CPUMonitorConfig };