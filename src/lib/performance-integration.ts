/**
 * 性能监控集成模块
 * 统一管理和初始化所有性能监控工具
 */

import { PerformanceMonitor } from './performance-monitor';
import { componentPerformanceManager } from './component-profiler';
import { CPUMonitor } from './cpu-monitor';
import { MemoryMonitor } from './memory-monitor';
import { 
  PerformanceAlertSystem, 
  getAlertSystem,
  checkCPUAlerts,
  checkMemoryAlerts,
  checkComponentAlerts,
  checkWebVitalsAlerts,
  checkLongTaskAlerts,
  checkMemoryLeakAlerts
} from './performance-alerts';

// 性能监控配置接口
export interface PerformanceConfig {
  // 是否启用性能监控
  enabled: boolean;
  
  // 是否在开发环境启用
  enableInDevelopment: boolean;
  
  // 是否在生产环境启用
  enableInProduction: boolean;
  
  // 监控间隔（毫秒）
  monitoringInterval: number;
  
  // 是否启用自动报告
  enableAutoReporting: boolean;
  
  // 报告间隔（毫秒）
  reportingInterval: number;
  
  // 是否启用警报
  enableAlerts: boolean;
  
  // 是否启用组件性能监控
  enableComponentMonitoring: boolean;
  
  // 是否启用CPU监控
  enableCPUMonitoring: boolean;
  
  // 是否启用内存监控
  enableMemoryMonitoring: boolean;
  
  // 是否启用Web Vitals监控
  enableWebVitalsMonitoring: boolean;
}

// 默认配置
const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: true,
  enableInDevelopment: true,
  enableInProduction: true,
  monitoringInterval: 5000, // 5秒
  enableAutoReporting: false,
  reportingInterval: 60000, // 1分钟
  enableAlerts: true,
  enableComponentMonitoring: true,
  enableCPUMonitoring: true,
  enableMemoryMonitoring: true,
  enableWebVitalsMonitoring: true
};

// 性能监控管理器
export class PerformanceManager {
  private config: PerformanceConfig;
  private performanceMonitor: PerformanceMonitor | null = null;
  private componentManager: ComponentPerformanceManager | null = null;
  private cpuMonitor: CPUMonitor | null = null;
  private memoryMonitor: MemoryMonitor | null = null;
  private alertSystem: PerformanceAlertSystem | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private reportingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 初始化性能监控
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('性能监控已经初始化');
      return;
    }

    // 检查是否应该启用监控
    if (!this.shouldEnableMonitoring()) {
      console.log('性能监控在当前环境中被禁用');
      return;
    }

    try {
      console.log('正在初始化性能监控系统...');

      // 初始化警报系统
      if (this.config.enableAlerts) {
        this.alertSystem = getAlertSystem({
          enabled: true,
          enableBrowserNotification: true,
          enableConsoleLog: true
        });
        console.log('✅ 警报系统初始化完成');
      }

      // 初始化Web Vitals监控
      if (this.config.enableWebVitalsMonitoring) {
        this.performanceMonitor = new PerformanceMonitor({
          enableWebVitals: true,
          enableResourceTiming: true,
          enableNavigationTiming: true,
          enableMemoryInfo: true,
          reportingInterval: this.config.reportingInterval
        });
        
        // 监听Web Vitals数据
        this.performanceMonitor.onMetricsCallback((data) => {
          if (this.config.enableAlerts) {
            checkWebVitalsAlerts(data, 'performance-manager');
          }
        });
        
        console.log('✅ Web Vitals监控初始化完成');
      }

      // 初始化组件性能监控
      if (this.config.enableComponentMonitoring) {
        this.componentManager = componentPerformanceManager;
        
        // 监听组件性能数据
        this.componentManager.onPerformanceUpdate((componentName, data) => {
          if (this.config.enableAlerts) {
            checkComponentAlerts(data, 'component-manager');
          }
        });
        
        console.log('✅ 组件性能监控初始化完成');
      }

      // 初始化CPU监控
      if (this.config.enableCPUMonitoring) {
        this.cpuMonitor = new CPUMonitor({
          enableFunctionMonitoring: true,
          enableStackTrace: false,
          longTaskThreshold: 50, // 50ms
          heavyFunctionThreshold: 10, // 10ms
          interval: this.config.monitoringInterval
        });
        
        // 监听CPU数据
        this.cpuMonitor.onAlertCallback((data) => {
          if (this.config.enableAlerts) {
            checkCPUAlerts(data, 'cpu-manager');
            if (data.longTasks && data.longTasks.length > 0) {
              checkLongTaskAlerts(data, 'cpu-manager');
            }
          }
        });
        
        console.log('✅ CPU监控初始化完成');
      }

      // 初始化内存监控
      if (this.config.enableMemoryMonitoring) {
        this.memoryMonitor = new MemoryMonitor({
          enableDOMMonitoring: true,
          enableGCMonitoring: true,
          enableAutoGC: false,
          leakDetectionThreshold: 100, // 100MB
          interval: 30000, // 30秒
          maxRecords: 50
        });
        
        // 监听内存数据
        this.memoryMonitor.onAlertCallback((data) => {
          if (this.config.enableAlerts) {
            checkMemoryAlerts(data, 'memory-manager');
          }
        });
        
        // 监听内存泄漏
        this.memoryMonitor.onLeakDetectedCallback((leakData) => {
          if (this.config.enableAlerts) {
            checkMemoryLeakAlerts(leakData, 'memory-manager');
          }
        });
        
        console.log('✅ 内存监控初始化完成');
      }

      // 启动定期监控
      this.startMonitoring();
      
      // 启动自动报告
      if (this.config.enableAutoReporting) {
        this.startAutoReporting();
      }

      this.isInitialized = true;
      console.log('🎉 性能监控系统初始化完成');
      
      // 发送初始化完成事件
      this.dispatchEvent('initialized', {
        timestamp: Date.now(),
        config: this.config
      });
      
    } catch (error) {
      console.error('性能监控初始化失败:', error);
      throw error;
    }
  }

  // 检查是否应该启用监控
  private shouldEnableMonitoring(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isDevelopment && !this.config.enableInDevelopment) {
      return false;
    }

    if (isProduction && !this.config.enableInProduction) {
      return false;
    }

    return true;
  }

  // 启动监控
  private startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);
  }

  // 启动自动报告
  private startAutoReporting() {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }

    this.reportingInterval = setInterval(() => {
      this.generateReport();
    }, this.config.reportingInterval);
  }

  // 收集指标
  private async collectMetrics() {
    try {
      const metrics: any = {
        timestamp: Date.now()
      };

      // 收集CPU指标
      if (this.cpuMonitor) {
        const cpuData = this.cpuMonitor.getCurrentData();
        metrics.cpu = cpuData;
      }

      // 收集内存指标
      if (this.memoryMonitor) {
        const memoryData = this.memoryMonitor.getCurrentData();
        metrics.memory = memoryData;
      }

      // 收集组件性能指标
      if (this.componentManager) {
        const componentData = this.componentManager.getAllComponentsPerformance();
        metrics.components = componentData;
      }

      // 收集Web Vitals指标
      if (this.performanceMonitor) {
        const webVitalsData = this.performanceMonitor.getWebVitals();
        metrics.webVitals = webVitalsData;
      }

      // 发送指标收集事件
      this.dispatchEvent('metricsCollected', metrics);
      
    } catch (error) {
      console.error('收集性能指标失败:', error);
    }
  }

  // 生成报告
  public generateReport(): any {
    if (!this.isInitialized) {
      console.warn('性能监控未初始化，无法生成报告');
      return null;
    }

    const report: any = {
      timestamp: Date.now(),
      config: this.config,
      summary: {
        monitoring: {
          cpu: !!this.cpuMonitor,
          memory: !!this.memoryMonitor,
          components: !!this.componentManager,
          webVitals: !!this.performanceMonitor,
          alerts: !!this.alertSystem
        }
      }
    };

    // CPU报告
    if (this.cpuMonitor) {
      report.cpu = this.cpuMonitor.generateReport();
    }

    // 内存报告
    if (this.memoryMonitor) {
      report.memory = this.memoryMonitor.generateReport();
    }

    // 组件性能报告
    if (this.componentManager) {
      report.components = {
        totalComponents: this.componentManager.getTrackedComponentsCount(),
        performance: this.componentManager.getAllComponentsPerformance(),
        slowComponents: this.componentManager.getSlowComponents()
      };
    }

    // Web Vitals报告
    if (this.performanceMonitor) {
      report.webVitals = this.performanceMonitor.getWebVitals();
      report.resources = this.performanceMonitor.getResourceTiming();
      report.navigation = this.performanceMonitor.getNavigationTiming();
    }

    // 警报报告
    if (this.alertSystem) {
      report.alerts = {
        stats: this.alertSystem.getAlertStats(),
        recent: this.alertSystem.getAllAlerts().slice(0, 10),
        unresolved: this.alertSystem.getUnresolvedAlerts()
      };
    }

    // 发送报告生成事件
    this.dispatchEvent('reportGenerated', report);

    return report;
  }

  // 获取实时数据
  public getRealTimeData(): any {
    if (!this.isInitialized) {
      return null;
    }

    return {
      timestamp: Date.now(),
      cpu: this.cpuMonitor?.getCurrentData() || null,
      memory: this.memoryMonitor?.getCurrentData() || null,
      webVitals: this.performanceMonitor?.getWebVitals() || null,
      alerts: this.alertSystem?.getUnresolvedAlerts() || []
    };
  }

  // 获取组件性能管理器
  public getComponentManager(): ComponentPerformanceManager | null {
    return this.componentManager;
  }

  // 获取警报系统
  public getAlertSystem(): PerformanceAlertSystem | null {
    return this.alertSystem;
  }

  // 更新配置
  public updateConfig(updates: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...updates };
    
    // 如果监控被禁用，停止所有监控
    if (!this.config.enabled) {
      this.stop();
    } else if (!this.isInitialized) {
      // 如果监控被启用但未初始化，重新初始化
      this.initialize();
    }
  }

  // 停止监控
  public stop() {
    console.log('正在停止性能监控...');
    
    // 停止定期监控
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // 停止自动报告
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    
    // 停止各个监控器
    this.cpuMonitor?.stop();
    this.memoryMonitor?.stop();
    this.performanceMonitor?.stop();
    
    this.isInitialized = false;
    console.log('性能监控已停止');
  }

  // 重启监控
  public async restart() {
    this.stop();
    await this.initialize();
  }

  // 发送自定义事件
  private dispatchEvent(eventName: string, data: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`performance:${eventName}`, {
        detail: data
      }));
    }
  }

  // 销毁
  public destroy() {
    this.stop();
    
    // 销毁各个监控器
    this.cpuMonitor?.destroy();
    this.memoryMonitor?.destroy();
    this.alertSystem?.destroy();
    
    // 清空引用
    this.performanceMonitor = null;
    this.componentManager = null;
    this.cpuMonitor = null;
    this.memoryMonitor = null;
    this.alertSystem = null;
  }
}

// 创建全局性能管理器实例
let globalPerformanceManager: PerformanceManager | null = null;

// 获取全局性能管理器
export function getPerformanceManager(config?: Partial<PerformanceConfig>): PerformanceManager {
  if (!globalPerformanceManager) {
    globalPerformanceManager = new PerformanceManager(config);
  }
  return globalPerformanceManager;
}

// 初始化性能监控（便捷函数）
export async function initializePerformanceMonitoring(config?: Partial<PerformanceConfig>): Promise<PerformanceManager> {
  const manager = getPerformanceManager(config);
  await manager.initialize();
  return manager;
}

// 快速启动性能监控
export async function startPerformanceMonitoring(): Promise<void> {
  try {
    const manager = await initializePerformanceMonitoring({
      enabled: true,
      enableInDevelopment: true,
      enableInProduction: true,
      monitoringInterval: 5000,
      enableAlerts: true,
      enableComponentMonitoring: true,
      enableCPUMonitoring: true,
      enableMemoryMonitoring: true,
      enableWebVitalsMonitoring: true
    });
    
    console.log('🚀 性能监控已启动');
    
    // 在开发环境中添加全局访问
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      (window as any).__performanceManager = manager;
      console.log('💡 开发模式：可通过 window.__performanceManager 访问性能管理器');
    }
    
  } catch (error) {
    console.error('启动性能监控失败:', error);
  }
}

// 导出类型
export type { PerformanceConfig };