/**
 * 性能警报系统
 * 当CPU、内存或其他性能指标超过阈值时发出警告
 */

// 警报类型
export type AlertType = 'cpu' | 'memory' | 'component' | 'webvitals' | 'longtask' | 'leak';

// 警报级别
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

// 警报数据接口
export interface AlertData {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: number;
  source: string;
}

// 警报规则接口
export interface AlertRule {
  id: string;
  type: AlertType;
  name: string;
  description: string;
  enabled: boolean;
  condition: (data: any) => boolean;
  level: AlertLevel;
  cooldown: number; // 冷却时间（毫秒）
  lastTriggered?: number;
}

// 警报配置
export interface AlertConfig {
  // 是否启用警报
  enabled: boolean;
  
  // 是否启用浏览器通知
  enableBrowserNotification: boolean;
  
  // 是否启用控制台日志
  enableConsoleLog: boolean;
  
  // 是否启用声音警报
  enableSoundAlert: boolean;
  
  // 最大警报数量
  maxAlerts: number;
  
  // 自动清理时间（毫秒）
  autoCleanupTime: number;
  
  // 默认冷却时间（毫秒）
  defaultCooldown: number;
}

// 默认配置
const DEFAULT_CONFIG: AlertConfig = {
  enabled: true,
  enableBrowserNotification: true,
  enableConsoleLog: true,
  enableSoundAlert: false,
  maxAlerts: 50,
  autoCleanupTime: 24 * 60 * 60 * 1000, // 24小时
  defaultCooldown: 30 * 1000 // 30秒
};

// 默认警报规则
const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'cpu-high',
    type: 'cpu',
    name: 'CPU使用率过高',
    description: 'CPU使用率超过80%',
    enabled: true,
    condition: (data) => data.usage > 80,
    level: 'error',
    cooldown: 60 * 1000 // 1分钟
  },
  {
    id: 'cpu-critical',
    type: 'cpu',
    name: 'CPU使用率危险',
    description: 'CPU使用率超过95%',
    enabled: true,
    condition: (data) => data.usage > 95,
    level: 'critical',
    cooldown: 30 * 1000 // 30秒
  },
  {
    id: 'memory-high',
    type: 'memory',
    name: '内存使用率过高',
    description: '内存使用率超过85%',
    enabled: true,
    condition: (data) => data.usagePercentage > 85,
    level: 'error',
    cooldown: 60 * 1000
  },
  {
    id: 'memory-critical',
    type: 'memory',
    name: '内存使用率危险',
    description: '内存使用率超过95%',
    enabled: true,
    condition: (data) => data.usagePercentage > 95,
    level: 'critical',
    cooldown: 30 * 1000
  },
  {
    id: 'longtask-detected',
    type: 'longtask',
    name: '检测到长任务',
    description: '发现执行时间超过50ms的任务',
    enabled: true,
    condition: (data) => data.longTasks && data.longTasks.length > 0,
    level: 'warning',
    cooldown: 10 * 1000 // 10秒
  },
  {
    id: 'component-slow',
    type: 'component',
    name: '组件渲染缓慢',
    description: '组件平均渲染时间超过100ms',
    enabled: true,
    condition: (data) => data.averageRenderTime > 100,
    level: 'warning',
    cooldown: 30 * 1000
  },
  {
    id: 'memory-leak',
    type: 'leak',
    name: '内存泄漏检测',
    description: '检测到可能的内存泄漏',
    enabled: true,
    condition: (data) => data.isLeaking === true,
    level: 'error',
    cooldown: 5 * 60 * 1000 // 5分钟
  },
  {
    id: 'lcp-slow',
    type: 'webvitals',
    name: 'LCP过慢',
    description: '最大内容绘制时间超过2.5秒',
    enabled: true,
    condition: (data) => data.lcp > 2500,
    level: 'warning',
    cooldown: 60 * 1000
  },
  {
    id: 'cls-high',
    type: 'webvitals',
    name: 'CLS过高',
    description: '累积布局偏移超过0.1',
    enabled: true,
    condition: (data) => data.cls > 0.1,
    level: 'warning',
    cooldown: 60 * 1000
  }
];

// 性能警报系统类
export class PerformanceAlertSystem {
  private config: AlertConfig;
  private rules: Map<string, AlertRule> = new Map();
  private alerts: AlertData[] = [];
  private listeners: Map<string, ((alert: AlertData) => void)[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 初始化默认规则
    DEFAULT_RULES.forEach(rule => {
      this.rules.set(rule.id, { ...rule });
    });
    
    // 启动自动清理
    this.startAutoCleanup();
    
    // 请求浏览器通知权限
    this.requestNotificationPermission();
  }

  // 请求浏览器通知权限
  private async requestNotificationPermission() {
    if (this.config.enableBrowserNotification && 
        typeof window !== 'undefined' && 
        'Notification' in window) {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.warn('无法请求通知权限:', error);
      }
    }
  }

  // 启动自动清理
  private startAutoCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  // 清理旧警报
  private cleanupOldAlerts() {
    const now = Date.now();
    const cutoff = now - this.config.autoCleanupTime;
    
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp > cutoff || !alert.resolved
    );
  }

  // 生成警报ID
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 检查规则条件
  public checkRules(type: AlertType, data: any, source: string = 'unknown') {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    
    for (const rule of this.rules.values()) {
      if (rule.type !== type || !rule.enabled) {
        continue;
      }
      
      // 检查冷却时间
      if (rule.lastTriggered && 
          now - rule.lastTriggered < rule.cooldown) {
        continue;
      }
      
      try {
        if (rule.condition(data)) {
          this.triggerAlert(rule, data, source);
          rule.lastTriggered = now;
        }
      } catch (error) {
        console.error('警报规则检查失败:', rule.id, error);
      }
    }
  }

  // 触发警报
  private triggerAlert(rule: AlertRule, data: any, source: string) {
    const alert: AlertData = {
      id: this.generateAlertId(),
      type: rule.type,
      level: rule.level,
      title: rule.name,
      message: rule.description,
      details: data,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      source
    };
    
    this.addAlert(alert);
  }

  // 添加警报
  public addAlert(alert: AlertData) {
    this.alerts.unshift(alert);
    
    // 限制警报数量
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.config.maxAlerts);
    }
    
    // 发送通知
    this.sendNotifications(alert);
    
    // 触发监听器
    this.notifyListeners('alert', alert);
  }

  // 发送通知
  private sendNotifications(alert: AlertData) {
    // 控制台日志
    if (this.config.enableConsoleLog) {
      const emoji = this.getAlertEmoji(alert.level);
      const method = alert.level === 'error' || alert.level === 'critical' ? 'error' : 
                    alert.level === 'warning' ? 'warn' : 'log';
      
      console[method](`${emoji} ${alert.title}:`, alert.message, alert.details);
    }
    
    // 浏览器通知
    if (this.config.enableBrowserNotification && 
        typeof window !== 'undefined' && 
        'Notification' in window && 
        Notification.permission === 'granted') {
      try {
        new Notification(alert.title, {
          body: alert.message,
          icon: this.getAlertIcon(alert.level),
          tag: alert.type,
          requireInteraction: alert.level === 'critical'
        });
      } catch (error) {
        console.warn('发送浏览器通知失败:', error);
      }
    }
    
    // 声音警报
    if (this.config.enableSoundAlert && 
        (alert.level === 'error' || alert.level === 'critical')) {
      this.playAlertSound();
    }
  }

  // 播放警报声音
  private playAlertSound() {
    try {
      // 创建简单的警报音
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('播放警报声音失败:', error);
    }
  }

  // 获取警报表情符号
  private getAlertEmoji(level: AlertLevel): string {
    switch (level) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  // 获取警报图标
  private getAlertIcon(level: AlertLevel): string {
    // 这里可以返回实际的图标URL
    return '/favicon.ico';
  }

  // 确认警报
  public acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.notifyListeners('acknowledge', alert);
    }
  }

  // 解决警报
  public resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.notifyListeners('resolve', alert);
    }
  }

  // 批量确认警报
  public acknowledgeAllAlerts() {
    this.alerts.forEach(alert => {
      if (!alert.acknowledged) {
        alert.acknowledged = true;
      }
    });
    this.notifyListeners('acknowledgeAll', null);
  }

  // 批量解决警报
  public resolveAllAlerts() {
    const now = Date.now();
    this.alerts.forEach(alert => {
      if (!alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = now;
      }
    });
    this.notifyListeners('resolveAll', null);
  }

  // 清除所有警报
  public clearAllAlerts() {
    this.alerts = [];
    this.notifyListeners('clear', null);
  }

  // 添加规则
  public addRule(rule: AlertRule) {
    this.rules.set(rule.id, { ...rule });
  }

  // 更新规则
  public updateRule(ruleId: string, updates: Partial<AlertRule>) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }

  // 删除规则
  public removeRule(ruleId: string) {
    this.rules.delete(ruleId);
  }

  // 启用/禁用规则
  public toggleRule(ruleId: string, enabled?: boolean) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled !== undefined ? enabled : !rule.enabled;
    }
  }

  // 获取所有警报
  public getAllAlerts(): AlertData[] {
    return [...this.alerts];
  }

  // 获取未确认的警报
  public getUnacknowledgedAlerts(): AlertData[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  // 获取未解决的警报
  public getUnresolvedAlerts(): AlertData[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // 获取特定类型的警报
  public getAlertsByType(type: AlertType): AlertData[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  // 获取特定级别的警报
  public getAlertsByLevel(level: AlertLevel): AlertData[] {
    return this.alerts.filter(alert => alert.level === level);
  }

  // 获取所有规则
  public getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  // 获取启用的规则
  public getEnabledRules(): AlertRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  // 添加事件监听器
  public addEventListener(event: string, listener: (alert: AlertData | null) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  // 移除事件监听器
  public removeEventListener(event: string, listener: (alert: AlertData | null) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // 通知监听器
  private notifyListeners(event: string, alert: AlertData | null) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(alert);
        } catch (error) {
          console.error('警报监听器执行失败:', error);
        }
      });
    }
  }

  // 获取警报统计
  public getAlertStats(): {
    total: number;
    unacknowledged: number;
    unresolved: number;
    byLevel: Record<AlertLevel, number>;
    byType: Record<AlertType, number>;
  } {
    const stats = {
      total: this.alerts.length,
      unacknowledged: 0,
      unresolved: 0,
      byLevel: { info: 0, warning: 0, error: 0, critical: 0 } as Record<AlertLevel, number>,
      byType: { cpu: 0, memory: 0, component: 0, webvitals: 0, longtask: 0, leak: 0 } as Record<AlertType, number>
    };
    
    this.alerts.forEach(alert => {
      if (!alert.acknowledged) stats.unacknowledged++;
      if (!alert.resolved) stats.unresolved++;
      stats.byLevel[alert.level]++;
      stats.byType[alert.type]++;
    });
    
    return stats;
  }

  // 更新配置
  public updateConfig(updates: Partial<AlertConfig>) {
    Object.assign(this.config, updates);
  }

  // 获取配置
  public getConfig(): AlertConfig {
    return { ...this.config };
  }

  // 销毁
  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.alerts = [];
    this.rules.clear();
    this.listeners.clear();
  }
}

// 创建全局警报系统实例
let globalAlertSystem: PerformanceAlertSystem | null = null;

// 获取全局警报系统实例
export function getAlertSystem(config?: Partial<AlertConfig>): PerformanceAlertSystem {
  if (!globalAlertSystem) {
    globalAlertSystem = new PerformanceAlertSystem(config);
  }
  return globalAlertSystem;
}

// 快速检查CPU警报
export function checkCPUAlerts(cpuData: any, source: string = 'cpu-monitor') {
  const alertSystem = getAlertSystem();
  alertSystem.checkRules('cpu', cpuData, source);
}

// 快速检查内存警报
export function checkMemoryAlerts(memoryData: any, source: string = 'memory-monitor') {
  const alertSystem = getAlertSystem();
  alertSystem.checkRules('memory', memoryData, source);
}

// 快速检查组件警报
export function checkComponentAlerts(componentData: any, source: string = 'component-profiler') {
  const alertSystem = getAlertSystem();
  alertSystem.checkRules('component', componentData, source);
}

// 快速检查Web Vitals警报
export function checkWebVitalsAlerts(webVitalsData: any, source: string = 'performance-monitor') {
  const alertSystem = getAlertSystem();
  alertSystem.checkRules('webvitals', webVitalsData, source);
}

// 快速检查长任务警报
export function checkLongTaskAlerts(longTaskData: any, source: string = 'cpu-monitor') {
  const alertSystem = getAlertSystem();
  alertSystem.checkRules('longtask', longTaskData, source);
}

// 快速检查内存泄漏警报
export function checkMemoryLeakAlerts(leakData: any, source: string = 'memory-monitor') {
  const alertSystem = getAlertSystem();
  alertSystem.checkRules('leak', leakData, source);
}

// 导出类型
export type { AlertData, AlertRule, AlertConfig };