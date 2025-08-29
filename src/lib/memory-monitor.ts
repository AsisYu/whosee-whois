/**
 * 内存使用监控工具
 * 用于检测内存泄漏、高内存占用和垃圾回收性能
 */

// 内存监控数据接口
export interface MemoryMonitorData {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  gcCount?: number;
  gcDuration?: number;
}

// 内存泄漏检测数据
export interface MemoryLeakData {
  componentName: string;
  instanceCount: number;
  memoryUsage: number;
  createdAt: number;
  lastUpdated: number;
  isLeaking: boolean;
  growthRate: number;
}

// DOM节点监控数据
export interface DOMNodeData {
  nodeCount: number;
  listenerCount: number;
  timestamp: number;
}

// 内存监控配置
export interface MemoryMonitorConfig {
  // 监控间隔（毫秒）
  interval: number;
  
  // 内存使用警告阈值（百分比）
  memoryWarningThreshold: number;
  
  // 内存使用危险阈值（百分比）
  memoryDangerThreshold: number;
  
  // 内存泄漏检测阈值（MB）
  leakDetectionThreshold: number;
  
  // 是否启用DOM节点监控
  enableDOMMonitoring: boolean;
  
  // 是否启用垃圾回收监控
  enableGCMonitoring: boolean;
  
  // 最大记录数
  maxRecords: number;
  
  // 是否启用控制台日志
  enableConsoleLog: boolean;
  
  // 是否启用自动垃圾回收
  enableAutoGC: boolean;
}

// 默认配置
const DEFAULT_CONFIG: MemoryMonitorConfig = {
  interval: 2000,
  memoryWarningThreshold: 70,
  memoryDangerThreshold: 85,
  leakDetectionThreshold: 50,
  enableDOMMonitoring: true,
  enableGCMonitoring: true,
  maxRecords: 100,
  enableConsoleLog: true,
  enableAutoGC: false
};

// 内存监控类
export class MemoryMonitor {
  private config: MemoryMonitorConfig;
  private memoryHistory: MemoryMonitorData[] = [];
  private domNodeHistory: DOMNodeData[] = [];
  private componentInstances = new Map<string, MemoryLeakData>();
  private intervalId: NodeJS.Timeout | null = null;
  private observer: PerformanceObserver | null = null;
  private isMonitoring = false;
  private onAlert?: (data: MemoryMonitorData) => void;
  private onLeakDetected?: (leak: MemoryLeakData) => void;
  private lastGCTime = 0;
  private gcCount = 0;

  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initGCObserver();
  }

  // 初始化垃圾回收观察器
  private initGCObserver() {
    if (!this.config.enableGCMonitoring || typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.includes('gc')) {
            this.gcCount++;
            this.lastGCTime = entry.duration;
            
            if (this.config.enableConsoleLog) {
              console.log('🗑️ 垃圾回收:', {
                duration: `${entry.duration.toFixed(2)}ms`,
                count: this.gcCount
              });
            }
          }
        }
      });
      
      this.observer.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('GC Observer not supported:', error);
    }
  }

  // 获取内存使用信息
  private getMemoryInfo(): MemoryMonitorData | null {
    if (typeof window === 'undefined' || !(window.performance as any)?.memory) {
      return null;
    }

    const memory = (window.performance as any).memory;
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage,
      gcCount: this.gcCount,
      gcDuration: this.lastGCTime
    };
  }

  // 获取DOM节点信息
  private getDOMNodeInfo(): DOMNodeData {
    const nodeCount = document.querySelectorAll('*').length;
    
    // 估算事件监听器数量（简化版）
    let listenerCount = 0;
    try {
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
        // 检查常见的事件属性
        const events = ['onclick', 'onload', 'onchange', 'onsubmit', 'onmouseover'];
        events.forEach(event => {
          if ((element as any)[event]) {
            listenerCount++;
          }
        });
      });
    } catch (error) {
      // 忽略错误
    }

    return {
      nodeCount,
      listenerCount,
      timestamp: Date.now()
    };
  }

  // 注册组件实例
  public registerComponent(componentName: string, memoryUsage: number = 0) {
    const existing = this.componentInstances.get(componentName);
    
    if (existing) {
      existing.instanceCount++;
      existing.memoryUsage += memoryUsage;
      existing.lastUpdated = Date.now();
      
      // 计算增长率
      const timeDiff = existing.lastUpdated - existing.createdAt;
      existing.growthRate = existing.memoryUsage / (timeDiff / 1000); // MB/秒
      
      // 检测内存泄漏
      existing.isLeaking = existing.memoryUsage > this.config.leakDetectionThreshold && 
                          existing.growthRate > 1; // 每秒增长超过1MB
    } else {
      this.componentInstances.set(componentName, {
        componentName,
        instanceCount: 1,
        memoryUsage,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        isLeaking: false,
        growthRate: 0
      });
    }
  }

  // 注销组件实例
  public unregisterComponent(componentName: string, memoryUsage: number = 0) {
    const existing = this.componentInstances.get(componentName);
    
    if (existing) {
      existing.instanceCount = Math.max(0, existing.instanceCount - 1);
      existing.memoryUsage = Math.max(0, existing.memoryUsage - memoryUsage);
      existing.lastUpdated = Date.now();
      
      // 如果实例数为0，删除记录
      if (existing.instanceCount === 0) {
        this.componentInstances.delete(componentName);
      }
    }
  }

  // 检测内存泄漏
  private detectMemoryLeaks() {
    for (const [componentName, data] of this.componentInstances) {
      if (data.isLeaking && this.onLeakDetected) {
        this.onLeakDetected(data);
      }
      
      if (data.isLeaking && this.config.enableConsoleLog) {
        console.warn('🚨 检测到内存泄漏:', {
          component: componentName,
          instances: data.instanceCount,
          memoryUsage: `${(data.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
          growthRate: `${data.growthRate.toFixed(2)}MB/s`
        });
      }
    }
  }

  // 强制垃圾回收（如果支持）
  public forceGC() {
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        if (this.config.enableConsoleLog) {
          console.log('🗑️ 手动触发垃圾回收');
        }
      } catch (error) {
        console.warn('无法手动触发垃圾回收:', error);
      }
    } else {
      console.warn('垃圾回收API不可用');
    }
  }

  // 开始监控
  public start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    this.intervalId = setInterval(() => {
      // 收集内存信息
      const memoryData = this.getMemoryInfo();
      if (memoryData) {
        this.memoryHistory.push(memoryData);
        
        // 限制历史记录数量
        if (this.memoryHistory.length > this.config.maxRecords) {
          this.memoryHistory = this.memoryHistory.slice(-this.config.maxRecords);
        }

        // 检查内存使用警告
        if (memoryData.usagePercentage > this.config.memoryDangerThreshold) {
          if (this.onAlert) {
            this.onAlert(memoryData);
          }
          
          if (this.config.enableConsoleLog) {
            console.error('🚨 内存使用率危险:', {
              usage: `${memoryData.usagePercentage.toFixed(1)}%`,
              used: `${(memoryData.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
              limit: `${(memoryData.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
            });
          }
          
          // 自动垃圾回收
          if (this.config.enableAutoGC) {
            this.forceGC();
          }
        } else if (memoryData.usagePercentage > this.config.memoryWarningThreshold) {
          if (this.config.enableConsoleLog) {
            console.warn('⚠️ 内存使用率较高:', {
              usage: `${memoryData.usagePercentage.toFixed(1)}%`,
              used: `${(memoryData.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
            });
          }
        }
      }

      // 收集DOM节点信息
      if (this.config.enableDOMMonitoring && typeof document !== 'undefined') {
        const domData = this.getDOMNodeInfo();
        this.domNodeHistory.push(domData);
        
        // 限制历史记录数量
        if (this.domNodeHistory.length > this.config.maxRecords) {
          this.domNodeHistory = this.domNodeHistory.slice(-this.config.maxRecords);
        }
      }

      // 检测内存泄漏
      this.detectMemoryLeaks();
    }, this.config.interval);

    if (this.config.enableConsoleLog) {
      console.log('🧠 内存监控已启动');
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
      console.log('⏹️ 内存监控已停止');
    }
  }

  // 获取内存历史
  public getMemoryHistory(): MemoryMonitorData[] {
    return [...this.memoryHistory];
  }

  // 获取最新内存数据
  public getLatestMemoryData(): MemoryMonitorData | null {
    return this.memoryHistory.length > 0 
      ? this.memoryHistory[this.memoryHistory.length - 1] 
      : null;
  }

  // 获取DOM节点历史
  public getDOMNodeHistory(): DOMNodeData[] {
    return [...this.domNodeHistory];
  }

  // 获取组件实例数据
  public getComponentInstances(): MemoryLeakData[] {
    return Array.from(this.componentInstances.values());
  }

  // 获取内存泄漏组件
  public getLeakingComponents(): MemoryLeakData[] {
    return Array.from(this.componentInstances.values())
      .filter(component => component.isLeaking);
  }

  // 清除数据
  public clear() {
    this.memoryHistory = [];
    this.domNodeHistory = [];
    this.componentInstances.clear();
    this.gcCount = 0;
    this.lastGCTime = 0;
  }

  // 设置警告回调
  public onAlertCallback(callback: (data: MemoryMonitorData) => void) {
    this.onAlert = callback;
  }

  // 设置内存泄漏回调
  public onLeakDetectedCallback(callback: (leak: MemoryLeakData) => void) {
    this.onLeakDetected = callback;
  }

  // 生成内存报告
  public generateReport(): {
    summary: {
      currentUsage: number;
      maxUsage: number;
      avgUsage: number;
      totalLeaks: number;
      domNodeCount: number;
      gcCount: number;
    };
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    leakingComponents: MemoryLeakData[];
    recommendations: string[];
  } {
    const usageValues = this.memoryHistory.map(h => h.usagePercentage);
    const currentUsage = usageValues.length > 0 ? usageValues[usageValues.length - 1] : 0;
    const maxUsage = usageValues.length > 0 ? Math.max(...usageValues) : 0;
    const avgUsage = usageValues.length > 0 
      ? usageValues.reduce((a, b) => a + b, 0) / usageValues.length 
      : 0;
    
    const leakingComponents = this.getLeakingComponents();
    const latestDOMData = this.domNodeHistory.length > 0 
      ? this.domNodeHistory[this.domNodeHistory.length - 1] 
      : null;
    
    // 分析内存趋势
    let memoryTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (usageValues.length >= 5) {
      const recent = usageValues.slice(-5);
      const trend = recent[recent.length - 1] - recent[0];
      if (trend > 5) {
        memoryTrend = 'increasing';
      } else if (trend < -5) {
        memoryTrend = 'decreasing';
      }
    }

    const recommendations: string[] = [];
    
    if (currentUsage > 80) {
      recommendations.push('当前内存使用率过高，建议释放不必要的对象引用');
    }
    
    if (leakingComponents.length > 0) {
      recommendations.push('检测到内存泄漏组件，建议检查事件监听器和定时器的清理');
    }
    
    if (memoryTrend === 'increasing') {
      recommendations.push('内存使用呈上升趋势，建议检查是否存在内存泄漏');
    }
    
    if (latestDOMData && latestDOMData.nodeCount > 5000) {
      recommendations.push('DOM节点数量过多，建议使用虚拟滚动或懒加载');
    }
    
    if (this.gcCount > 50) {
      recommendations.push('垃圾回收频繁，建议优化对象创建和销毁');
    }

    return {
      summary: {
        currentUsage,
        maxUsage,
        avgUsage,
        totalLeaks: leakingComponents.length,
        domNodeCount: latestDOMData?.nodeCount || 0,
        gcCount: this.gcCount
      },
      memoryTrend,
      leakingComponents,
      recommendations
    };
  }

  // 获取内存使用统计
  public getMemoryStats(): {
    current: string;
    peak: string;
    average: string;
    available: string;
  } {
    const latest = this.getLatestMemoryData();
    const usageValues = this.memoryHistory.map(h => h.usedJSHeapSize);
    
    if (!latest || usageValues.length === 0) {
      return {
        current: '0 MB',
        peak: '0 MB',
        average: '0 MB',
        available: '0 MB'
      };
    }
    
    const current = latest.usedJSHeapSize / 1024 / 1024;
    const peak = Math.max(...usageValues) / 1024 / 1024;
    const average = usageValues.reduce((a, b) => a + b, 0) / usageValues.length / 1024 / 1024;
    const available = (latest.jsHeapSizeLimit - latest.usedJSHeapSize) / 1024 / 1024;
    
    return {
      current: `${current.toFixed(2)} MB`,
      peak: `${peak.toFixed(2)} MB`,
      average: `${average.toFixed(2)} MB`,
      available: `${available.toFixed(2)} MB`
    };
  }
}

// React Hook：内存监控
export function useMemoryMonitor(componentName: string) {
  const monitor = getMemoryMonitor();
  
  React.useEffect(() => {
    // 组件挂载时注册
    monitor.registerComponent(componentName);
    
    return () => {
      // 组件卸载时注销
      monitor.unregisterComponent(componentName);
    };
  }, [componentName, monitor]);
  
  return {
    forceGC: () => monitor.forceGC(),
    getStats: () => monitor.getMemoryStats(),
    getReport: () => monitor.generateReport()
  };
}

// 创建全局内存监控实例
let globalMemoryMonitor: MemoryMonitor | null = null;

// 获取全局内存监控实例
export function getMemoryMonitor(config?: Partial<MemoryMonitorConfig>): MemoryMonitor {
  if (!globalMemoryMonitor) {
    globalMemoryMonitor = new MemoryMonitor(config);
  }
  return globalMemoryMonitor;
}

// 快速启动内存监控
export function startMemoryMonitoring(config?: Partial<MemoryMonitorConfig>) {
  const monitor = getMemoryMonitor(config);
  monitor.start();
  return monitor;
}

// 停止内存监控
export function stopMemoryMonitoring() {
  if (globalMemoryMonitor) {
    globalMemoryMonitor.stop();
  }
}

// 导出类型
export type { MemoryMonitorData, MemoryLeakData, DOMNodeData, MemoryMonitorConfig };

// 添加React导入（如果在React环境中使用）
declare const React: any;