/**
 * 组件性能分析器
 * 用于监控React组件的渲染性能
 */

import { logger } from './logger';

interface ComponentPerformanceData {
  componentName: string;
  renderTime: number;
  propsCount: number;
  childrenCount: number;
  timestamp: number;
  phase: 'mount' | 'update';
}

interface ComponentProfilerConfig {
  enableProfiling: boolean;
  enableConsoleLog: boolean;
  slowRenderThreshold: number; // ms
  maxRecords: number;
}

class ComponentPerformanceManager {
  private config: ComponentProfilerConfig;
  private performanceData: ComponentPerformanceData[] = [];
  private isEnabled = false;

  constructor(config: Partial<ComponentProfilerConfig> = {}) {
    this.config = {
      enableProfiling: true,
      enableConsoleLog: process.env.NODE_ENV === 'development',
      slowRenderThreshold: 16, // 16ms (60fps)
      maxRecords: 1000,
      ...config
    };
  }

  public enable(): void {
    this.isEnabled = this.config.enableProfiling;
    if (this.isEnabled) {
      logger.info('Component profiler enabled', 'component-profiler');
    }
  }

  public disable(): void {
    this.isEnabled = false;
    logger.info('Component profiler disabled', 'component-profiler');
  }

  public profileComponent(
    componentName: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<any>
  ): void {
    if (!this.isEnabled) return;

    const performanceData: ComponentPerformanceData = {
      componentName,
      renderTime: actualDuration,
      propsCount: 0, // 这里可以通过其他方式获取
      childrenCount: 0, // 这里可以通过其他方式获取
      timestamp: commitTime,
      phase
    };

    // 添加到性能数据数组
    this.performanceData.push(performanceData);

    // 保持数组大小在限制内
    if (this.performanceData.length > this.config.maxRecords) {
      this.performanceData.shift();
    }

    // 检查是否为慢渲染
    if (actualDuration > this.config.slowRenderThreshold) {
      const warningMessage = `Slow render detected: ${componentName} took ${actualDuration.toFixed(2)}ms`;
      
      if (this.config.enableConsoleLog) {
        console.warn(warningMessage, {
          component: componentName,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
          interactions: Array.from(interactions)
        });
      }

      logger.warn(warningMessage, 'component-profiler', {
        component: componentName,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        interactionCount: interactions.size
      });
    }

    // 记录性能数据
    logger.logPerformance(
      `component-render-${componentName}`,
      actualDuration,
      true,
      {
        component: componentName,
        phase,
        baseDuration,
        startTime,
        commitTime,
        interactionCount: interactions.size
      }
    );
  }

  public getPerformanceData(): ComponentPerformanceData[] {
    return [...this.performanceData];
  }

  public getSlowComponents(threshold?: number): ComponentPerformanceData[] {
    const slowThreshold = threshold || this.config.slowRenderThreshold;
    return this.performanceData.filter(data => data.renderTime > slowThreshold);
  }

  public getComponentStats(componentName: string): {
    totalRenders: number;
    averageRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
    slowRenders: number;
  } {
    const componentData = this.performanceData.filter(
      data => data.componentName === componentName
    );

    if (componentData.length === 0) {
      return {
        totalRenders: 0,
        averageRenderTime: 0,
        maxRenderTime: 0,
        minRenderTime: 0,
        slowRenders: 0
      };
    }

    const renderTimes = componentData.map(data => data.renderTime);
    const slowRenders = componentData.filter(
      data => data.renderTime > this.config.slowRenderThreshold
    ).length;

    return {
      totalRenders: componentData.length,
      averageRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes),
      slowRenders
    };
  }

  public clearData(): void {
    this.performanceData = [];
    logger.info('Component performance data cleared', 'component-profiler');
  }

  public generateReport(): {
    totalComponents: number;
    totalRenders: number;
    averageRenderTime: number;
    slowRenders: number;
    topSlowComponents: Array<{
      componentName: string;
      averageRenderTime: number;
      slowRenders: number;
    }>;
  } {
    const componentNames = [...new Set(this.performanceData.map(data => data.componentName))];
    const slowRenders = this.getSlowComponents();
    
    const componentStats = componentNames.map(name => ({
      componentName: name,
      ...this.getComponentStats(name)
    }));

    const topSlowComponents = componentStats
      .filter(stats => stats.slowRenders > 0)
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 10)
      .map(stats => ({
        componentName: stats.componentName,
        averageRenderTime: stats.averageRenderTime,
        slowRenders: stats.slowRenders
      }));

    const totalRenderTime = this.performanceData.reduce((sum, data) => sum + data.renderTime, 0);
    const averageRenderTime = this.performanceData.length > 0 
      ? totalRenderTime / this.performanceData.length 
      : 0;

    return {
      totalComponents: componentNames.length,
      totalRenders: this.performanceData.length,
      averageRenderTime,
      slowRenders: slowRenders.length,
      topSlowComponents
    };
  }
}

// 创建全局实例
export const componentPerformanceManager = new ComponentPerformanceManager();

// React Profiler 回调函数
export function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
  interactions: Set<any>
): void {
  componentPerformanceManager.profileComponent(
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions
  );
}

// 导出类型和配置
export type { ComponentPerformanceData, ComponentProfilerConfig };
export { ComponentPerformanceManager };

// 默认导出
export default componentPerformanceManager;