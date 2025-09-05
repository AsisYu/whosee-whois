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
  monitoringInterval: 15000, // 15秒 - 减少监控频率
  enableAutoReporting: false,
  reportingInterval: 120000, // 2分钟 - 减少报告频率
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
  private componentManager: Record<string, unknown> | null = null;
  private cpuMonitor: CPUMonitor | null = null;
  private memoryMonitor: MemoryMonitor | null = null;
  private alertSystem: PerformanceAlertSystem | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private reportingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private errorCount = 0; // 错误计数器

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 初始化性能监控
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 检查是否应该启用监控
    if (!this.shouldEnableMonitoring()) {
      return;
    }

    try {
      // quiet init

      // 初始化性能监控器
      if (this.config.enableWebVitalsMonitoring) {
        this.performanceMonitor = new PerformanceMonitor({
          interval: this.config.monitoringInterval,
          enableConsoleLog: false
        });
        this.performanceMonitor.start();
      }

      // 初始化CPU监控器
      if (this.config.enableCPUMonitoring) {
        this.cpuMonitor = new CPUMonitor({
          interval: this.config.monitoringInterval,
          enableConsoleLog: false
        });
        this.cpuMonitor.start();
      }

      // 初始化内存监控器
      if (this.config.enableMemoryMonitoring) {
        this.memoryMonitor = new MemoryMonitor({
          interval: this.config.monitoringInterval,
          enableConsoleLog: false
        });
        this.memoryMonitor.start();
      }

      // 初始化组件性能管理器
      if (this.config.enableComponentMonitoring) {
        this.componentManager = componentPerformanceManager;
      }

      // 初始化警报系统
      if (this.config.enableAlerts) {
        this.alertSystem = getAlertSystem();
        this.alertSystem.initialize();
      }

      // 开始定期监控
      this.startMonitoring();

      // 开始自动报告
      if (this.config.enableAutoReporting) {
        this.startAutoReporting();
      }

      this.isInitialized = true;

    } catch (error) {
      // swallow errors to reduce noise
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

  // 开始定期监控
  private startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);
  }

  // 开始自动报告
  private startAutoReporting() {
    this.reportingInterval = setInterval(() => {
      const report = this.generateReport();
      this.dispatchEvent('performance-report', report);
    }, this.config.reportingInterval);
  }

  // 收集性能指标
  private async collectMetrics() {
    const startTime = performance.now();
    
    try {
      const metrics: Record<string, unknown> = {
        timestamp: Date.now()
      };

      // 使用Promise.allSettled并发收集指标，避免阻塞
      const results = await Promise.allSettled([
        this.collectCPUMetrics(),
        this.collectMemoryMetrics(),
        this.collectComponentMetrics(),
        this.collectWebVitalsMetrics()
      ]);

      // 处理收集结果
      const [cpuResult, memoryResult, componentResult, vitalsResult] = results;
      
      if (cpuResult.status === 'fulfilled') {
        metrics.cpu = cpuResult.value;
      }
      
      if (memoryResult.status === 'fulfilled') {
        metrics.memory = memoryResult.value;
      }
      
      if (componentResult.status === 'fulfilled') {
        metrics.components = componentResult.value;
      }
      
      if (vitalsResult.status === 'fulfilled') {
        metrics.webVitals = vitalsResult.value;
      }

      // 检查收集时间，如果超过阈值则降级
      const collectionTime = performance.now() - startTime;
      if (collectionTime > 100) { // 100ms阈值
        // degrade silently
        this.degradeMonitoring();
      }

      // 分发指标事件
      this.dispatchEvent('performance-metrics', metrics);

    } catch (error) {
      // swallow collect errors
      this.handleCollectionError(error);
    }
  }

  // 收集CPU指标
  private async collectCPUMetrics(): Promise<unknown> {
    if (!this.cpuMonitor) return null;
    
    const cpuData = this.cpuMonitor.getLatestUsage();
    
    // 检查CPU警报
    if (this.alertSystem && cpuData) {
      try {
        checkCPUAlerts(cpuData, this.alertSystem);
      } catch (error) {
        console.warn('CPU警报检查失败:', error);
      }
    }
    
    return cpuData;
  }

  // 收集内存指标
  private async collectMemoryMetrics(): Promise<unknown> {
    if (!this.memoryMonitor) return null;
    
    const memoryData = this.memoryMonitor.getCurrentMetrics();
    
    // 检查内存警报
    if (this.alertSystem && memoryData) {
      try {
        checkMemoryAlerts(memoryData, this.alertSystem);
        checkMemoryLeakAlerts(memoryData, this.alertSystem);
      } catch (error) {
        console.warn('内存警报检查失败:', error);
      }
    }
    
    return memoryData;
  }

  // 收集组件性能指标
  private async collectComponentMetrics(): Promise<unknown> {
    if (!this.componentManager) return null;
    
    const componentData = this.componentManager.getAllPerformanceData();
    
    // 检查组件性能警报
    if (this.alertSystem) {
      try {
        checkComponentAlerts(componentData, this.alertSystem);
      } catch (error) {
        console.warn('组件性能警报检查失败:', error);
      }
    }
    
    return componentData;
  }

  // 收集Web Vitals指标
  private async collectWebVitalsMetrics(): Promise<unknown> {
    if (!this.performanceMonitor) return null;
    
    const vitalsData = this.performanceMonitor.getLatestMetrics();
    
    // 检查Web Vitals警报
    if (this.alertSystem && vitalsData) {
      try {
        checkWebVitalsAlerts(vitalsData, this.alertSystem);
      } catch (error) {
        console.warn('Web Vitals警报检查失败:', error);
      }
    }
    
    return vitalsData;
  }

  // 处理收集错误
  private handleCollectionError(error: unknown) {
    // 记录错误次数
    this.errorCount = (this.errorCount || 0) + 1;
    
    // 如果错误次数过多，降级监控
    if (this.errorCount > 5) {
      // silent degrade
      this.degradeMonitoring();
    }
  }

  // 降级监控
  private degradeMonitoring() {
    // 增加监控间隔
    this.config.monitoringInterval = Math.min(this.config.monitoringInterval * 2, 60000);
    
    // 重启监控
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.startMonitoring();
    }
    
    // no-op log
  }

  // 生成性能报告
  public generateReport(): Record<string, unknown> {
    const report = {
      timestamp: Date.now(),
      config: this.config,
      isInitialized: this.isInitialized,
      metrics: {} as Record<string, unknown>,
      alerts: [] as Array<Record<string, unknown>>
    };

    // 添加CPU指标
    if (this.cpuMonitor) {
      report.metrics.cpu = {
        current: this.cpuMonitor.getLatestUsage(),
        history: this.cpuMonitor.getUsageHistory(),
        heavyFunctions: this.cpuMonitor.getHeavyFunctions()
      };
    }

    // 添加内存指标
    if (this.memoryMonitor) {
      report.metrics.memory = {
        current: this.memoryMonitor.getCurrentMetrics(),
        history: this.memoryMonitor.getMemoryHistory(),
        stats: this.memoryMonitor.getMemoryStats()
      };
    }

    // 添加组件性能指标
    if (this.componentManager) {
      report.metrics.components = {
        all: this.componentManager.getAllPerformanceData(),
        slow: this.componentManager.getSlowComponents(),
        frequent: this.componentManager.getFrequentlyRenderedComponents()
      };
    }

    // 添加Web Vitals指标
    if (this.performanceMonitor) {
      report.metrics.webVitals = {
        current: this.performanceMonitor.getLatestMetrics(),
        history: this.performanceMonitor.getMetrics(),
        alerts: this.performanceMonitor.getAlerts()
      };
    }

    // 添加警报信息
    if (this.alertSystem) {
      report.alerts = this.alertSystem.getActiveAlerts();
    }

    return report;
  }

  // 获取实时数据
  public getRealTimeData(): Record<string, unknown> {
    return {
      cpu: this.cpuMonitor?.getLatestUsage() || null,
      memory: this.memoryMonitor?.getCurrentMetrics() || null,
      components: this.componentManager?.getAllPerformanceData() || null,
      webVitals: this.performanceMonitor?.getLatestMetrics() || null,
      alerts: this.alertSystem?.getActiveAlerts() || []
    };
  }

  // 获取组件性能管理器
  public getComponentManager(): Record<string, unknown> | null {
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
    // quiet stop
    
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
    // quiet
  }

  // 重启监控
  public async restart() {
    this.stop();
    await this.initialize();
  }

  // 分发事件
  private dispatchEvent(eventName: string, data: Record<string, unknown>) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  // 销毁监控器
  public destroy() {
    this.stop();
    
    // 清理资源
    this.performanceMonitor = null;
    this.componentManager = null;
    this.cpuMonitor = null;
    this.memoryMonitor = null;
    this.alertSystem = null;
    
    // quiet
  }
}

// 全局性能管理器实例
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
      enabled: true, // 重新启用性能监控
      enableInDevelopment: true,
      enableInProduction: false,
      monitoringInterval: 10000, // 减少间隔
      enableAlerts: true,
      enableComponentMonitoring: true,
      enableCPUMonitoring: true,
      enableMemoryMonitoring: true,
      enableWebVitalsMonitoring: true
    });
    
    // quiet
    
    // 在开发环境中添加全局访问
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      (window as Window & { __performanceManager?: PerformanceManager }).__performanceManager = manager;
      // quiet
    }
    
  } catch (error) {
    console.error('启动性能监控失败:', error);
  }
}

// 导出类型
export type { PerformanceConfig };