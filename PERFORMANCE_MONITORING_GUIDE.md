# 前端性能监控系统使用指南

## 概述

这套性能监控系统为 Whosee WHOIS 项目提供了全面的前端性能监控能力，包括 CPU 使用率、内存监控、组件性能分析、Web Vitals 指标和智能警报系统。

## 系统架构

### 核心模块

1. **性能监控器** (`performance-monitor.ts`)
   - Web Vitals 指标收集
   - 资源加载时间分析
   - 导航性能监控

2. **CPU 监控器** (`cpu-monitor.ts`)
   - CPU 使用率估算
   - 长任务检测
   - 函数执行时间分析

3. **内存监控器** (`memory-monitor.ts`)
   - 内存使用跟踪
   - 内存泄漏检测
   - DOM 节点监控

4. **组件性能分析器** (`component-profiler.tsx`)
   - React 组件渲染时间
   - 重渲染次数统计
   - 性能瓶颈识别

5. **警报系统** (`performance-alerts.ts`)
   - 智能阈值监控
   - 多级别警报
   - 浏览器通知支持

6. **性能面板** (`performance-dashboard.tsx`)
   - 实时数据可视化
   - 交互式控制面板
   - 历史数据展示

7. **集成管理器** (`performance-integration.ts`)
   - 统一配置管理
   - 自动初始化
   - 生命周期管理

## 快速开始

### 1. 基础集成

在你的 Next.js 应用中集成性能监控：

```typescript
// app/layout.tsx 或主入口文件
import { startPerformanceMonitoring } from '@/lib/performance-integration';

// 在应用启动时初始化
startPerformanceMonitoring();
```

### 2. 组件级监控

使用高阶组件包装需要监控的组件：

```typescript
import { withPerformanceProfiler } from '@/lib/component-profiler';

const MyComponent = withPerformanceProfiler(
  ({ data }) => {
    // 组件逻辑
    return <div>{data}</div>;
  },
  'MyComponent' // 组件名称
);
```

### 3. 添加性能面板

在开发环境中添加性能监控面板：

```typescript
import { PerformanceDashboard } from '@/components/performance-dashboard';

function App() {
  return (
    <div>
      {/* 你的应用内容 */}
      {process.env.NODE_ENV === 'development' && <PerformanceDashboard />}
    </div>
  );
}
```

## 详细配置

### 性能监控配置

```typescript
import { initializePerformanceMonitoring } from '@/lib/performance-integration';

const manager = await initializePerformanceMonitoring({
  enabled: true,
  enableInDevelopment: true,
  enableInProduction: false, // 生产环境可选择关闭
  monitoringInterval: 5000, // 5秒监控间隔
  enableAlerts: true,
  enableComponentMonitoring: true,
  enableCPUMonitoring: true,
  enableMemoryMonitoring: true,
  enableWebVitalsMonitoring: true
});
```

### 警报系统配置

```typescript
import { getAlertSystem } from '@/lib/performance-alerts';

const alertSystem = getAlertSystem({
  enabled: true,
  enableBrowserNotification: true,
  enableConsoleLog: true,
  enableSoundAlert: false,
  maxAlerts: 50,
  autoCleanupTime: 24 * 60 * 60 * 1000 // 24小时
});

// 监听警报事件
alertSystem.addEventListener('alert', (alert) => {
  console.log('新警报:', alert);
});
```

## 监控指标说明

### Web Vitals 指标

- **LCP (Largest Contentful Paint)**: 最大内容绘制时间
  - 良好: ≤ 2.5s
  - 需要改进: 2.5s - 4.0s
  - 差: > 4.0s

- **FID (First Input Delay)**: 首次输入延迟
  - 良好: ≤ 100ms
  - 需要改进: 100ms - 300ms
  - 差: > 300ms

- **CLS (Cumulative Layout Shift)**: 累积布局偏移
  - 良好: ≤ 0.1
  - 需要改进: 0.1 - 0.25
  - 差: > 0.25

### CPU 监控指标

- **CPU 使用率**: 基于长任务估算的 CPU 占用百分比
- **长任务**: 执行时间超过 50ms 的任务
- **函数执行时间**: 被监控函数的执行耗时

### 内存监控指标

- **JS 堆内存**: JavaScript 堆的使用情况
- **DOM 节点数**: 当前页面的 DOM 节点总数
- **内存泄漏**: 检测可能的内存泄漏模式

### 组件性能指标

- **渲染时间**: 组件从开始到完成渲染的时间
- **重渲染次数**: 组件的重新渲染频率
- **平均渲染时间**: 组件的平均渲染性能

## 警报规则

### 默认警报阈值

| 指标 | 警告阈值 | 错误阈值 | 危险阈值 |
|------|----------|----------|----------|
| CPU 使用率 | - | 80% | 95% |
| 内存使用率 | - | 85% | 95% |
| LCP | - | 2500ms | - |
| CLS | - | 0.1 | - |
| 组件渲染时间 | 100ms | - | - |
| 长任务 | 检测到 | - | - |

### 自定义警报规则

```typescript
import { getAlertSystem } from '@/lib/performance-alerts';

const alertSystem = getAlertSystem();

// 添加自定义规则
alertSystem.addRule({
  id: 'custom-memory-rule',
  type: 'memory',
  name: '自定义内存警报',
  description: '内存使用超过 50MB',
  enabled: true,
  condition: (data) => data.usedJSHeapSize > 50 * 1024 * 1024,
  level: 'warning',
  cooldown: 30 * 1000 // 30秒冷却
});
```

## API 参考

### PerformanceManager

```typescript
const manager = getPerformanceManager();

// 获取实时数据
const realTimeData = manager.getRealTimeData();

// 生成性能报告
const report = manager.generateReport();

// 更新配置
manager.updateConfig({ enableAlerts: false });

// 停止监控
manager.stop();

// 重启监控
manager.restart();
```

### 组件性能分析

```typescript
import { useComponentPerformance } from '@/lib/component-profiler';

function MyComponent() {
  const { startProfiling, endProfiling, getPerformanceData } = useComponentPerformance('MyComponent');
  
  useEffect(() => {
    startProfiling();
    // 执行一些操作
    endProfiling();
  }, []);
  
  const perfData = getPerformanceData();
  
  return <div>渲染时间: {perfData.averageRenderTime}ms</div>;
}
```

### 手动性能测量

```typescript
import { getCPUMonitor } from '@/lib/cpu-monitor';

const cpuMonitor = getCPUMonitor();

// 监控函数执行
const result = cpuMonitor.measureFunction('myFunction', () => {
  // 你的代码
  return someExpensiveOperation();
});

console.log('执行时间:', result.executionTime);
```

## 性能优化建议

### 基于监控数据的优化策略

1. **CPU 优化**
   - 识别长任务并进行代码分割
   - 使用 Web Workers 处理 CPU 密集型任务
   - 实现虚拟滚动减少 DOM 操作

2. **内存优化**
   - 及时清理事件监听器
   - 使用 WeakMap 和 WeakSet 避免内存泄漏
   - 实现组件懒加载

3. **组件优化**
   - 使用 React.memo 避免不必要的重渲染
   - 优化 useEffect 依赖项
   - 实现组件级别的代码分割

4. **Web Vitals 优化**
   - 优化图片加载和尺寸
   - 减少布局偏移
   - 优化关键渲染路径

## 故障排除

### 常见问题

1. **监控数据不准确**
   - 确保在浏览器环境中运行
   - 检查是否有其他性能监控工具冲突
   - 验证配置是否正确

2. **警报过于频繁**
   - 调整警报阈值
   - 增加冷却时间
   - 检查是否有性能问题需要修复

3. **内存使用过高**
   - 检查是否正确清理监控器
   - 减少监控频率
   - 限制历史数据保存量

### 调试技巧

```typescript
// 开发环境中访问性能管理器
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('性能管理器:', window.__performanceManager);
}

// 启用详细日志
const manager = getPerformanceManager();
manager.updateConfig({ enableConsoleLog: true });
```

## 示例页面

访问 `/performance-example` 页面查看完整的性能监控示例，包括：

- 实时性能指标展示
- 警报系统演示
- 性能测试工具
- 详细的性能报告

## 最佳实践

1. **生产环境配置**
   - 谨慎启用生产环境监控
   - 设置合理的监控频率
   - 实现远程数据上报

2. **开发环境使用**
   - 启用所有监控功能
   - 使用性能面板进行实时调试
   - 定期生成性能报告

3. **性能预算**
   - 设置性能目标和阈值
   - 建立性能回归检测
   - 集成到 CI/CD 流程

## 扩展开发

### 添加自定义监控器

```typescript
class CustomMonitor {
  private data: any = {};
  
  public monitor() {
    // 自定义监控逻辑
  }
  
  public getData() {
    return this.data;
  }
}

// 集成到性能管理器
const manager = getPerformanceManager();
// 添加自定义监控逻辑
```

### 自定义警报类型

```typescript
import { AlertRule } from '@/lib/performance-alerts';

const customRule: AlertRule = {
  id: 'custom-rule',
  type: 'custom' as any,
  name: '自定义规则',
  description: '自定义条件检测',
  enabled: true,
  condition: (data) => {
    // 自定义条件逻辑
    return data.customMetric > threshold;
  },
  level: 'warning',
  cooldown: 30000
};
```

## 总结

这套性能监控系统提供了全面的前端性能监控能力，帮助开发者：

- 实时监控应用性能
- 快速识别性能瓶颈
- 自动检测性能问题
- 生成详细的性能报告
- 指导性能优化工作

通过合理配置和使用这些工具，可以显著提升应用的性能和用户体验。