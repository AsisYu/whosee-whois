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
  private componentManager: Record<string, unknown> | null = null;
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
      console.log('正在初始化性能监控...');

      // 初始化性能监控器
      if (this.config.enableWebVitalsMonitoring) {
        this.performanceMonitor = new PerformanceMonitor({
          interval: this.config.monitoringInterval,
          enableConsoleLog: process.env.NODE_ENV === 'development'
        });
        this.performanceMonitor.start();
      }

      // 初始化CPU监控器
      if (this.config.enableCPUMonitoring) {
        this.cpuMonitor = new CPUMonitor({
          interval: this.config.monitoringInterval,
          enableConsoleLog: process.env.NODE_ENV === 'development'
        });
        this.cpuMonitor.start();
      }

      // 初始化内存监控器
      if (this.config.enableMemoryMonitoring) {
        this.memoryMonitor = new MemoryMonitor({
          interval: this.config.monitoringInterval,
          enableConsoleLog: process.env.NODE_ENV === 'development'
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
      console.log('✅ 性能监控初始化完成');

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
    try {
      const metrics: Record<string, unknown> = {
        timestamp: Date.now()
      };

      // 收集CPU指标
      if (this.cpuMonitor) {
        const cpuData = this.cpuMonitor.getUsageData();
        metrics.cpu = cpuData;

        // 检查CPU警报
        if (this.alertSystem) {
          checkCPUAlerts(cpuData, this.alertSystem);
        }
      }

      // 收集内存指标
      if (this.memoryMonitor) {
        const memoryData = this.memoryMonitor.getMemoryData();
        metrics.memory = memoryData;

        // 检查内存警报
        if (this.alertSystem) {
          checkMemoryAlerts(memoryData, this.alertSystem);
          checkMemoryLeakAlerts(memoryData, this.alertSystem);
        }
      }

      // 收集组件性能指标
      if (this.componentManager) {
        const componentData = this.componentManager.getAllPerformanceData();
        metrics.components = componentData;

        // 检查组件性能警报
        if (this.alertSystem) {
          checkComponentAlerts(componentData, this.alertSystem);
        }
      }

      // 收集Web Vitals指标
      if (this.performanceMonitor) {
        const vitalsData = this.performanceMonitor.getLatestMetrics();
        metrics.webVitals = vitalsData;

        // 检查Web Vitals警报
        if (this.alertSystem && vitalsData) {
          checkWebVitalsAlerts(vitalsData, this.alertSystem);
        }
      }

      // 分发指标事件
      this.dispatchEvent('performance-metrics', metrics);

    } catch (error) {
      console.error('收集性能指标失败:', error);
    }
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
        current: this.cpuMonitor.getUsageData(),
        history: this.cpuMonitor.getHistoryData(),
        heavyFunctions: this.cpuMonitor.getHeavyFunctions()
      };
    }

    // 添加内存指标
    if (this.memoryMonitor) {
      report.metrics.memory = {
        current: this.memoryMonitor.getMemoryData(),
        history: this.memoryMonitor.getHistoryData(),
        leaks: this.memoryMonitor.getLeakDetection()
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
      cpu: this.cpuMonitor?.getUsageData() || null,
      memory: this.memoryMonitor?.getMemoryData() || null,
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
    
    console.log('性能监控器已销毁');
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
      (window as Window & { __performanceManager?: PerformanceIntegration }).___performanceManager = manager;
      console.log('💡 开发模式：可通过 window.__performanceManager 访问性能管理器');
    }
    
  } catch (error) {
    console.error('启动性能监控失败:', error);
  }
}

// 导出类型
export type { PerformanceConfig };