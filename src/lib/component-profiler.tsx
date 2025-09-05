/**
 * React组件性能分析器
 * 用于监控组件渲染时间、重渲染次数和性能瓶颈
 */

import React, { Profiler, ProfilerOnRenderCallback, useEffect, useState, useRef } from 'react';
import { PerformanceAlert, PerformanceLevel } from './performance-monitor';

// 组件性能数据接口
export interface ComponentPerformanceData {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
  renderCount: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  lastRenderTime: number;
}

// 性能统计
export interface PerformanceStats {
  totalComponents: number;
  slowComponents: ComponentPerformanceData[];
  frequentRerenders: ComponentPerformanceData[];
  totalRenderTime: number;
  avgRenderTime: number;
}

// 组件性能管理器
class ComponentPerformanceManager {
  private static instance: ComponentPerformanceManager;
  private componentData = new Map<string, ComponentPerformanceData>();
  private onAlert?: (alert: PerformanceAlert) => void;
  private onPerformanceUpdateCallback?: (componentName: string, data: ComponentPerformanceData) => void;
  private thresholds = {
    slowRender: 16, // 16ms (60fps)
    verySlowRender: 50, // 50ms
    frequentRerenders: 10, // 10次重渲染
    maxRenderTime: 100 // 100ms
  };

  static getInstance(): ComponentPerformanceManager {
    if (!ComponentPerformanceManager.instance) {
      ComponentPerformanceManager.instance = new ComponentPerformanceManager();
    }
    return ComponentPerformanceManager.instance;
  }

  // 设置警告回调
  setAlertCallback(callback: (alert: PerformanceAlert) => void) {
    this.onAlert = callback;
  }

  // 设置性能更新回调
  onPerformanceUpdate(callback: (componentName: string, data: ComponentPerformanceData) => void) {
    this.onPerformanceUpdateCallback = callback;
  }

  // 记录组件性能数据
  recordPerformance(
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<any>
  ) {
    const existing = this.componentData.get(id);
    
    if (existing) {
      // 更新现有数据
      existing.phase = phase;
      existing.actualDuration = actualDuration;
      existing.baseDuration = baseDuration;
      existing.startTime = startTime;
      existing.commitTime = commitTime;
      existing.interactions = interactions;
      existing.renderCount += 1;
      existing.totalDuration += actualDuration;
      existing.avgDuration = existing.totalDuration / existing.renderCount;
      existing.maxDuration = Math.max(existing.maxDuration, actualDuration);
      existing.minDuration = Math.min(existing.minDuration, actualDuration);
      existing.lastRenderTime = Date.now();
    } else {
      // 创建新数据
      this.componentData.set(id, {
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        interactions,
        renderCount: 1,
        totalDuration: actualDuration,
        avgDuration: actualDuration,
        maxDuration: actualDuration,
        minDuration: actualDuration,
        lastRenderTime: Date.now()
      });
    }

    // 检查性能问题
    this.checkPerformanceIssues(id, actualDuration, phase);

    // 通知性能更新
    if (this.onPerformanceUpdateCallback) {
      const data = this.componentData.get(id);
      if (data) {
        this.onPerformanceUpdateCallback(id, data);
      }
    }
  }

  // 检查性能问题
  private checkPerformanceIssues(id: string, duration: number, phase: 'mount' | 'update') {
    const data = this.componentData.get(id);
    if (!data) return;

    // 检查渲染时间过长
    if (duration > this.thresholds.verySlowRender) {
      this.emitAlert({
        type: 'render',
        level: PerformanceLevel.POOR,
        message: `组件 ${id} 渲染时间过长: ${duration.toFixed(2)}ms (${phase})`,
        value: duration,
        threshold: this.thresholds.verySlowRender,
        timestamp: Date.now()
      });
    } else if (duration > this.thresholds.slowRender) {
      this.emitAlert({
        type: 'render',
        level: PerformanceLevel.NEEDS_IMPROVEMENT,
        message: `组件 ${id} 渲染较慢: ${duration.toFixed(2)}ms (${phase})`,
        value: duration,
        threshold: this.thresholds.slowRender,
        timestamp: Date.now()
      });
    }

    // 检查频繁重渲染
    if (data.renderCount > this.thresholds.frequentRerenders && phase === 'update') {
      const timeSinceMount = Date.now() - (data.lastRenderTime - data.totalDuration);
      if (timeSinceMount < 10000) { // 10秒内
        this.emitAlert({
          type: 'render',
          level: PerformanceLevel.NEEDS_IMPROVEMENT,
          message: `组件 ${id} 频繁重渲染: ${data.renderCount}次 (10秒内)`,
          value: data.renderCount,
          threshold: this.thresholds.frequentRerenders,
          timestamp: Date.now()
        });
      }
    }
  }

  // 发出警告
  private emitAlert(alert: PerformanceAlert) {
    if (this.onAlert) {
      this.onAlert(alert);
    }
    console.warn('🎭 组件性能警告:', alert.message, alert);
  }

  // 获取性能统计
  getStats(): PerformanceStats {
    const components = Array.from(this.componentData.values());
    
    const slowComponents = components
      .filter(c => c.avgDuration > this.thresholds.slowRender)
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    const frequentRerenders = components
      .filter(c => c.renderCount > this.thresholds.frequentRerenders)
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, 10);

    const totalRenderTime = components.reduce((sum, c) => sum + c.totalDuration, 0);
    const avgRenderTime = components.length > 0 ? totalRenderTime / components.length : 0;

    return {
      totalComponents: components.length,
      slowComponents,
      frequentRerenders,
      totalRenderTime,
      avgRenderTime
    };
  }

  // 获取组件数据
  getComponentData(id?: string): ComponentPerformanceData[] | ComponentPerformanceData | undefined {
    if (id) {
      return this.componentData.get(id);
    }
    return Array.from(this.componentData.values());
  }

  // 清除数据
  clear() {
    this.componentData.clear();
  }

  // 生成报告
  generateReport(): {
    summary: {
      totalComponents: number;
      slowComponents: number;
      frequentRerenders: number;
      avgRenderTime: number;
      totalRenderTime: number;
    };
    topSlowComponents: Array<{
      id: string;
      avgDuration: number;
      renderCount: number;
    }>;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const recommendations: string[] = [];

    if (stats.slowComponents.length > 0) {
      recommendations.push(`发现 ${stats.slowComponents.length} 个渲染较慢的组件，建议优化`);
    }

    if (stats.frequentRerenders.length > 0) {
      recommendations.push(`发现 ${stats.frequentRerenders.length} 个频繁重渲染的组件，建议使用 React.memo 或 useMemo`);
    }

    if (stats.avgRenderTime > 20) {
      recommendations.push('平均渲染时间较长，建议进行代码分割和懒加载');
    }

    return {
      summary: {
        totalComponents: stats.totalComponents,
        slowComponents: stats.slowComponents.length,
        frequentRerenders: stats.frequentRerenders.length,
        avgRenderTime: stats.avgRenderTime,
        totalRenderTime: stats.totalRenderTime
      },
      topSlowComponents: stats.slowComponents.slice(0, 5).map(c => ({
        id: c.id,
        avgDuration: c.avgDuration,
        renderCount: c.renderCount
      })),
      recommendations
    };
  }
}

// 性能分析器组件
export interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({
  id,
  children,
  enabled = true
}) => {
  const manager = ComponentPerformanceManager.getInstance();

  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions
  ) => {
    if (enabled) {
      manager.recordPerformance(
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        interactions
      );
    }
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
};

// Hook: 使用组件性能监控
export function useComponentPerformance(componentId: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [lastRenderTime, setLastRenderTime] = useState(0);
  const renderStartTime = useRef<number>(0);
  const manager = ComponentPerformanceManager.getInstance();

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    setRenderCount(prev => prev + 1);
    setLastRenderTime(renderTime);

    // 记录渲染性能
    manager.recordPerformance(
      componentId,
      renderCount === 0 ? 'mount' : 'update',
      renderTime,
      renderTime,
      renderStartTime.current,
      performance.now(),
      new Set()
    );
  });

  return {
    renderCount,
    lastRenderTime,
    componentData: manager.getComponentData(componentId)
  };
}

// Hook: 监控重渲染原因
export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>();
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        console.log('🔄 组件重渲染原因:', name, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

// Hook: 性能监控
export function usePerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const manager = ComponentPerformanceManager.getInstance();

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(manager.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [manager]);

  return {
    stats,
    getComponentData: (id?: string) => manager.getComponentData(id),
    generateReport: () => manager.generateReport(),
    clear: () => manager.clear()
  };
}

// 高阶组件：自动性能监控
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithPerformanceMonitoring = (props: P) => {
    return (
      <PerformanceProfiler id={displayName}>
        <WrappedComponent {...props} />
      </PerformanceProfiler>
    );
  };
  
  WithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${displayName})`;
  
  return WithPerformanceMonitoring;
}

// 导出管理器实例
export const componentPerformanceManager = ComponentPerformanceManager.getInstance();

// 导出类型
export type { ComponentPerformanceData, PerformanceStats };