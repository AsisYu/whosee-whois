/**
 * 性能警报系统
 * 监控性能指标并触发警报
 */

import { logger } from './logger';
import type { CPUUsageData } from './cpu-monitor';
import type { MemoryMetrics } from './memory-monitor';

export interface PerformanceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  data: any;
  resolved: boolean;
  resolvedAt?: number;
}

export enum AlertType {
  HIGH_CPU = 'high_cpu',
  HIGH_MEMORY = 'high_memory',
  MEMORY_LEAK = 'memory_leak',
  LOW_FPS = 'low_fps',
  LONG_TASK = 'long_task',
  MAIN_THREAD_BLOCKED = 'main_thread_blocked',
  NETWORK_SLOW = 'network_slow',
  BUNDLE_SIZE_LARGE = 'bundle_size_large',
  RENDER_SLOW = 'render_slow'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AlertThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  fps: {
    warning: number;
    critical: number;
  };
  taskDuration: {
    warning: number;
    critical: number;
  };
  networkLatency: {
    warning: number;
    critical: number;
  };
}

export interface PerformanceAlertConfig {
  enabled: boolean;
  thresholds: AlertThresholds;
  maxAlerts: number;
  alertCooldown: number; // 同类型警报的冷却时间（毫秒）
  autoResolve: boolean;
  autoResolveTimeout: number; // 自动解决警报的超时时间（毫秒）
  enableNotifications: boolean;
  enableConsoleLog: boolean;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  cpu: {
    warning: 85,  // 提高CPU警告阈值到85%
    critical: 95  // 提高CPU严重阈值到95%
  },
  memory: {
    warning: 80,  // 提高内存警告阈值到80%
    critical: 95  // 提高内存严重阈值到95%
  },
  fps: {
    warning: 30,
    critical: 15
  },
  taskDuration: {
    warning: 200,  // 提高长任务警告阈值到200ms
    critical: 1000 // 提高长任务严重阈值到1000ms
  },
  networkLatency: {
    warning: 2000,  // 提高网络延迟警告阈值到2000ms
    critical: 5000  // 提高网络延迟严重阈值到5000ms
  }
};

const DEFAULT_CONFIG: PerformanceAlertConfig = {
  enabled: true,
  thresholds: DEFAULT_THRESHOLDS,
  maxAlerts: 50,
  alertCooldown: 60000, // 60秒 - 增加冷却时间
  autoResolve: true,
  autoResolveTimeout: 300000, // 5分钟
  enableNotifications: true,
  enableConsoleLog: true
};

export class PerformanceAlertSystem {
  private config: PerformanceAlertConfig;
  private alerts: PerformanceAlert[] = [];
  private lastAlertTime = new Map<AlertType, number>();
  private alertListeners: Array<(alert: PerformanceAlert) => void> = [];
  private resolveTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<PerformanceAlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public initialize(): void {
    if (!this.config.enabled) {
      return;
    }

    // 请求通知权限
    if (this.config.enableNotifications && typeof window !== 'undefined') {
      requestNotificationPermission().catch(error => {
        console.warn('Failed to request notification permission:', error);
      });
    }

    // 设置全局错误处理
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.createAlert(
          AlertType.MAIN_THREAD_BLOCKED,
          `JavaScript error: ${event.message}`,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
          },
          AlertSeverity.HIGH
        );
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.createAlert(
          AlertType.MAIN_THREAD_BLOCKED,
          `Unhandled promise rejection: ${event.reason}`,
          { reason: event.reason },
          AlertSeverity.HIGH
        );
      });
    }

    logger.info('Performance alert system initialized', 'performance-alerts', this.config);
  }

  public createAlert(
    type: AlertType,
    message: string,
    data: any,
    severity?: AlertSeverity
  ): PerformanceAlert | null {
    if (!this.config.enabled) {
      return null;
    }

    // 检查冷却时间
    const lastAlert = this.lastAlertTime.get(type);
    const now = Date.now();
    if (lastAlert && (now - lastAlert) < this.config.alertCooldown) {
      return null;
    }

    // 自动确定严重程度
    if (!severity) {
      severity = this.determineSeverity(type, data);
    }

    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: now,
      data,
      resolved: false
    };

    // 添加警报
    this.alerts.push(alert);
    this.lastAlertTime.set(type, now);

    // 保持警报数量在限制内
    if (this.alerts.length > this.config.maxAlerts) {
      const removedAlert = this.alerts.shift();
      if (removedAlert && this.resolveTimeouts.has(removedAlert.id)) {
        clearTimeout(this.resolveTimeouts.get(removedAlert.id)!);
        this.resolveTimeouts.delete(removedAlert.id);
      }
    }

    // 设置自动解决
    if (this.config.autoResolve) {
      const timeout = setTimeout(() => {
        this.resolveAlert(alert.id);
      }, this.config.autoResolveTimeout);
      this.resolveTimeouts.set(alert.id, timeout);
    }

    // 记录日志
    this.logAlert(alert);

    // 通知监听器
    this.notifyListeners(alert);

    // 显示通知
    if (this.config.enableNotifications) {
      this.showNotification(alert);
    }

    return alert;
  }

  private determineSeverity(type: AlertType, data: any): AlertSeverity {
    const thresholds = this.config.thresholds;

    switch (type) {
      case AlertType.HIGH_CPU:
        const cpuUsage = data.cpuUsage || data.usage || 0;
        if (cpuUsage >= thresholds.cpu.critical) return AlertSeverity.CRITICAL;
        if (cpuUsage >= thresholds.cpu.warning) return AlertSeverity.HIGH;
        return AlertSeverity.MEDIUM;

      case AlertType.HIGH_MEMORY:
        const memoryUsage = data.memoryUsagePercentage || data.usage || 0;
        if (memoryUsage >= thresholds.memory.critical) return AlertSeverity.CRITICAL;
        if (memoryUsage >= thresholds.memory.warning) return AlertSeverity.HIGH;
        return AlertSeverity.MEDIUM;

      case AlertType.LOW_FPS:
        const fps = data.frameRate || data.fps || 0;
        if (fps <= thresholds.fps.critical) return AlertSeverity.CRITICAL;
        if (fps <= thresholds.fps.warning) return AlertSeverity.HIGH;
        return AlertSeverity.MEDIUM;

      case AlertType.LONG_TASK:
      case AlertType.MAIN_THREAD_BLOCKED:
        const duration = data.duration || data.taskDuration || 0;
        if (duration >= thresholds.taskDuration.critical) return AlertSeverity.CRITICAL;
        if (duration >= thresholds.taskDuration.warning) return AlertSeverity.HIGH;
        return AlertSeverity.MEDIUM;

      case AlertType.MEMORY_LEAK:
        return AlertSeverity.HIGH;

      case AlertType.NETWORK_SLOW:
        const latency = data.latency || data.duration || 0;
        if (latency >= thresholds.networkLatency.critical) return AlertSeverity.CRITICAL;
        if (latency >= thresholds.networkLatency.warning) return AlertSeverity.HIGH;
        return AlertSeverity.MEDIUM;

      default:
        return AlertSeverity.MEDIUM;
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logAlert(alert: PerformanceAlert): void {
    const logLevel = this.getLogLevel(alert.severity);
    const logMessage = `Performance Alert [${alert.type}]: ${alert.message}`;
    
    logger.log(logLevel, logMessage, 'performance-alerts', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      data: alert.data
    });

    if (this.config.enableConsoleLog) {
      const consoleMethod = this.getConsoleMethod(alert.severity);
      console[consoleMethod](`🚨 ${logMessage}`, alert);
    }
  }

  private getLogLevel(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.LOW:
        return 'info';
      case AlertSeverity.MEDIUM:
        return 'warn';
      case AlertSeverity.HIGH:
        return 'error';
      case AlertSeverity.CRITICAL:
        return 'error';
      default:
        return 'warn';
    }
  }

  private getConsoleMethod(severity: AlertSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case AlertSeverity.LOW:
        return 'log';
      case AlertSeverity.MEDIUM:
      case AlertSeverity.HIGH:
        return 'warn';
      case AlertSeverity.CRITICAL:
        return 'error';
      default:
        return 'warn';
    }
  }

  private notifyListeners(alert: PerformanceAlert): void {
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Error in alert listener:', error);
      }
    });
  }

  private showNotification(alert: PerformanceAlert): void {
    if (typeof window === 'undefined') {
      return;
    }

    // 触发自定义事件
    const event = new CustomEvent('performance-alert', {
      detail: alert
    });
    window.dispatchEvent(event);

    // 如果支持，显示浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`Performance Alert: ${alert.type}`, {
        body: alert.message,
        icon: this.getAlertIcon(alert.severity),
        tag: `performance-alert-${alert.type}`
      });

      // 自动关闭通知
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  private getAlertIcon(severity: AlertSeverity): string {
    // 返回不同严重程度的图标URL或数据URI
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '🔴';
      case AlertSeverity.HIGH:
        return '🟠';
      case AlertSeverity.MEDIUM:
        return '🟡';
      case AlertSeverity.LOW:
        return '🔵';
      default:
        return '⚠️';
    }
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId && !a.resolved);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    // 清除自动解决定时器
    if (this.resolveTimeouts.has(alertId)) {
      clearTimeout(this.resolveTimeouts.get(alertId)!);
      this.resolveTimeouts.delete(alertId);
    }

    logger.info(`Performance alert resolved: ${alert.type}`, 'performance-alerts', {
      alertId,
      resolutionTime: alert.resolvedAt - alert.timestamp
    });

    return true;
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  public getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  public getAlertsByType(type: AlertType): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  public getAlertsBySeverity(severity: AlertSeverity): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  public clearResolvedAlerts(): void {
    const resolvedCount = this.alerts.filter(alert => alert.resolved).length;
    this.alerts = this.alerts.filter(alert => !alert.resolved);
    
    logger.info(`Cleared ${resolvedCount} resolved alerts`, 'performance-alerts');
  }

  public clearAllAlerts(): void {
    // 清除所有定时器
    this.resolveTimeouts.forEach(timeout => clearTimeout(timeout));
    this.resolveTimeouts.clear();
    
    const alertCount = this.alerts.length;
    this.alerts = [];
    this.lastAlertTime.clear();
    
    logger.info(`Cleared all ${alertCount} alerts`, 'performance-alerts');
  }

  public addListener(listener: (alert: PerformanceAlert) => void): void {
    this.alertListeners.push(listener);
  }

  public removeListener(listener: (alert: PerformanceAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  public updateConfig(updates: Partial<PerformanceAlertConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Performance alert config updated', 'performance-alerts', this.config);
  }

  public getConfig(): PerformanceAlertConfig {
    return { ...this.config };
  }

  public getStats(): {
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    alertsByType: Record<AlertType, number>;
    alertsBySeverity: Record<AlertSeverity, number>;
  } {
    const activeAlerts = this.getActiveAlerts();
    const resolvedAlerts = this.alerts.filter(alert => alert.resolved);
    
    const alertsByType = {} as Record<AlertType, number>;
    const alertsBySeverity = {} as Record<AlertSeverity, number>;
    
    // 初始化计数器
    Object.values(AlertType).forEach(type => {
      alertsByType[type] = 0;
    });
    Object.values(AlertSeverity).forEach(severity => {
      alertsBySeverity[severity] = 0;
    });
    
    // 统计
    this.alerts.forEach(alert => {
      alertsByType[alert.type]++;
      alertsBySeverity[alert.severity]++;
    });
    
    return {
      totalAlerts: this.alerts.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      alertsByType,
      alertsBySeverity
    };
  }
}

// 全局警报系统实例
let globalAlertSystem: PerformanceAlertSystem | null = null;

export function getAlertSystem(config?: Partial<PerformanceAlertConfig>): PerformanceAlertSystem {
  if (!globalAlertSystem) {
    globalAlertSystem = new PerformanceAlertSystem(config);
  }
  return globalAlertSystem;
}

// 便捷函数
export function checkCPUAlerts(cpuData: CPUUsageData): void {
  const alertSystem = getAlertSystem();
  const thresholds = alertSystem.getConfig().thresholds;
  
  if (cpuData.usage >= thresholds.cpu.warning) {
    alertSystem.createAlert(
      AlertType.HIGH_CPU,
      `CPU usage is ${cpuData.usage.toFixed(1)}%`,
      cpuData
    );
  }
  
  // 检查长任务
  cpuData.longTasks.forEach(task => {
    if (task.duration >= thresholds.taskDuration.warning) {
      alertSystem.createAlert(
        AlertType.LONG_TASK,
        `Long task detected: ${task.name} (${task.duration.toFixed(1)}ms)`,
        task
      );
    }
  });
}

export function checkMemoryAlerts(memoryData: MemoryMetrics): void {
  const alertSystem = getAlertSystem();
  const thresholds = alertSystem.getConfig().thresholds;
  
  if (memoryData.memoryUsagePercentage >= thresholds.memory.warning) {
    alertSystem.createAlert(
      AlertType.HIGH_MEMORY,
      `Memory usage is ${memoryData.memoryUsagePercentage.toFixed(1)}%`,
      memoryData
    );
  }
}

export function checkFPSAlerts(fps: number): void {
  const alertSystem = getAlertSystem();
  const thresholds = alertSystem.getConfig().thresholds;
  
  if (fps <= thresholds.fps.warning) {
    alertSystem.createAlert(
      AlertType.LOW_FPS,
      `Low frame rate detected: ${fps} FPS`,
      { fps }
    );
  }
}

// 请求通知权限
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// 检查组件性能警报
export function checkComponentAlerts(componentData: any): void {
  const alertSystem = getAlertSystem();
  const thresholds = alertSystem.getConfig().thresholds;
  
  if (componentData.renderTime >= thresholds.taskDuration.warning) {
    alertSystem.createAlert(
      AlertType.RENDER_SLOW,
      `Component render time is ${componentData.renderTime}ms`,
      componentData
    );
  }
}

// 检查Web Vitals警报
export function checkWebVitalsAlerts(vitalsData: any): void {
  const alertSystem = getAlertSystem();
  
  if (vitalsData.LCP && vitalsData.LCP > 2500) {
    alertSystem.createAlert(
      AlertType.RENDER_SLOW,
      `Large Contentful Paint is ${vitalsData.LCP}ms`,
      vitalsData
    );
  }
  
  if (vitalsData.FID && vitalsData.FID > 100) {
    alertSystem.createAlert(
      AlertType.MAIN_THREAD_BLOCKED,
      `First Input Delay is ${vitalsData.FID}ms`,
      vitalsData
    );
  }
  
  if (vitalsData.CLS && vitalsData.CLS > 0.1) {
    alertSystem.createAlert(
      AlertType.RENDER_SLOW,
      `Cumulative Layout Shift is ${vitalsData.CLS}`,
      vitalsData
    );
  }
}

// 检查长任务警报
export function checkLongTaskAlerts(taskData: any): void {
  const alertSystem = getAlertSystem();
  const thresholds = alertSystem.getConfig().thresholds;
  
  if (taskData.duration >= thresholds.taskDuration.warning) {
    alertSystem.createAlert(
      AlertType.LONG_TASK,
      `Long task detected: ${taskData.duration}ms`,
      taskData
    );
  }
}

// 检查内存泄漏警报
export function checkMemoryLeakAlerts(memoryData: any): void {
  const alertSystem = getAlertSystem();
  
  // 检查内存增长趋势
  if (memoryData.trend && memoryData.trend === 'increasing') {
    alertSystem.createAlert(
      AlertType.MEMORY_LEAK,
      `Potential memory leak detected`,
      memoryData
    );
  }
  
  // 检查DOM节点数量
  if (memoryData.domNodes && memoryData.domNodes > 10000) {
    alertSystem.createAlert(
      AlertType.MEMORY_LEAK,
      `High DOM node count: ${memoryData.domNodes}`,
      memoryData
    );
  }
}

// 导出类型
export type {
  PerformanceAlert,
  AlertThresholds,
  PerformanceAlertConfig
};