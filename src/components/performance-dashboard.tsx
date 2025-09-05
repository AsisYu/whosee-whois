'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Brain, 
  Cpu, 
  HardDrive, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Play,
  Square,
  RotateCcw,
  Download
} from 'lucide-react';

// 导入监控工具
import { 
  getCPUMonitor, 
  startCPUMonitoring, 
  stopCPUMonitoring,
  type CPUUsageData,
  type CPUMonitorData
} from '@/lib/cpu-monitor';
import { 
  getMemoryMonitor, 
  startMemoryMonitoring, 
  stopMemoryMonitoring,
  type MemoryMonitorData,
  type MemoryLeakData
} from '@/lib/memory-monitor';
import { 
  getPerformanceMonitor,
  type WebVitalsData
} from '@/lib/performance-monitor';
import { 
  ComponentPerformanceManager,
  type ComponentPerformanceData
} from '@/lib/component-profiler';

// 性能状态接口
interface PerformanceState {
  isMonitoring: boolean;
  cpuData: CPUUsageData | null;
  memoryData: MemoryMonitorData | null;
  webVitals: WebVitalsData | null;
  componentData: ComponentPerformanceData[];
  alerts: Alert[];
}

// 警告接口
interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

// 性能监控面板组件
export function PerformanceDashboard() {
  const [state, setState] = useState<PerformanceState>({
    isMonitoring: false,
    cpuData: null,
    memoryData: null,
    webVitals: null,
    componentData: [],
    alerts: []
  });

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // 添加警告
  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    
    setState(prev => ({
      ...prev,
      alerts: [newAlert, ...prev.alerts.slice(0, 9)] // 保持最多10个警告
    }));
  }, []);

  // 更新性能数据
  const updatePerformanceData = useCallback(() => {
    const cpuMonitor = getCPUMonitor();
    const memoryMonitor = getMemoryMonitor();
    const performanceMonitor = getPerformanceMonitor();
    const componentManager = ComponentPerformanceManager.getInstance();

    const cpuData = cpuMonitor.getLatestUsage();
    const memoryData = memoryMonitor.getLatestMemoryData();
    const webVitals = performanceMonitor.getWebVitals();
    const componentData = componentManager.getAllComponentData();

    setState(prev => ({
      ...prev,
      cpuData,
      memoryData,
      webVitals,
      componentData
    }));

    // 检查警告条件
    if (cpuData && cpuData.usage > 80) {
      addAlert({
        type: 'error',
        title: 'CPU使用率过高',
        message: `当前CPU使用率: ${cpuData.usage.toFixed(1)}%`
      });
    }

    if (memoryData && memoryData.usagePercentage > 85) {
      addAlert({
        type: 'error',
        title: '内存使用率过高',
        message: `当前内存使用率: ${memoryData.usagePercentage.toFixed(1)}%`
      });
    }

    if (cpuData && cpuData.longTasks.length > 3) {
      addAlert({
        type: 'warning',
        title: '检测到多个长任务',
        message: `发现 ${cpuData.longTasks.length} 个长任务，可能影响用户体验`
      });
    }
  }, [addAlert]);

  // 开始监控
  const startMonitoring = useCallback(() => {
    if (state.isMonitoring) return;

    // 启动各种监控
    startCPUMonitoring({
      interval: 1000,
      enableConsoleLog: false
    });
    
    startMemoryMonitoring({
      interval: 2000,
      enableConsoleLog: false
    });

    const performanceMonitor = getPerformanceMonitor();
    performanceMonitor.start();

    // 设置数据更新间隔
    const interval = setInterval(updatePerformanceData, 1000);
    setRefreshInterval(interval);

    setState(prev => ({ ...prev, isMonitoring: true }));
    
    addAlert({
      type: 'info',
      title: '性能监控已启动',
      message: '开始收集CPU、内存和组件性能数据'
    });
  }, [state.isMonitoring, updatePerformanceData, addAlert]);

  // 停止监控
  const stopMonitoring = useCallback(() => {
    if (!state.isMonitoring) return;

    stopCPUMonitoring();
    stopMemoryMonitoring();
    
    const performanceMonitor = getPerformanceMonitor();
    performanceMonitor.stop();

    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    setState(prev => ({ ...prev, isMonitoring: false }));
    
    addAlert({
      type: 'info',
      title: '性能监控已停止',
      message: '停止收集性能数据'
    });
  }, [state.isMonitoring, refreshInterval, addAlert]);

  // 清除数据
  const clearData = useCallback(() => {
    getCPUMonitor().clear();
    getMemoryMonitor().clear();
    ComponentPerformanceManager.getInstance().clear();
    
    setState(prev => ({
      ...prev,
      cpuData: null,
      memoryData: null,
      webVitals: null,
      componentData: [],
      alerts: []
    }));
    
    addAlert({
      type: 'info',
      title: '数据已清除',
      message: '所有性能监控数据已重置'
    });
  }, [addAlert]);

  // 导出报告
  const exportReport = useCallback(() => {
    const cpuReport = getCPUMonitor().generateReport();
    const memoryReport = getMemoryMonitor().generateReport();
    
    const report = {
      timestamp: new Date().toISOString(),
      cpu: cpuReport,
      memory: memoryReport,
      webVitals: state.webVitals,
      components: state.componentData,
      alerts: state.alerts
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addAlert({
      type: 'info',
      title: '报告已导出',
      message: '性能监控报告已下载到本地'
    });
  }, [state, addAlert]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // 获取状态颜色
  const getStatusColor = (value: number, warning: number, danger: number) => {
    if (value >= danger) return 'text-red-500';
    if (value >= warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  // 获取趋势图标
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            性能监控面板
          </CardTitle>
          <CardDescription>
            实时监控前端性能，检测CPU占用、内存使用和组件性能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={state.isMonitoring ? stopMonitoring : startMonitoring}
              variant={state.isMonitoring ? "destructive" : "default"}
            >
              {state.isMonitoring ? (
                <><Square className="h-4 w-4 mr-2" />停止监控</>
              ) : (
                <><Play className="h-4 w-4 mr-2" />开始监控</>
              )}
            </Button>
            <Button onClick={clearData} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              清除数据
            </Button>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              导出报告
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 监控状态指示器 */}
      {state.isMonitoring && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700 dark:text-green-300">
            性能监控运行中...
          </span>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="cpu">CPU监控</TabsTrigger>
          <TabsTrigger value="memory">内存监控</TabsTrigger>
          <TabsTrigger value="components">组件性能</TabsTrigger>
          <TabsTrigger value="alerts">警告日志</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU使用率 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU使用率</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {state.cpuData ? `${state.cpuData.usage.toFixed(1)}%` : '--'}
                </div>
                <Progress 
                  value={state.cpuData?.usage || 0} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  长任务: {state.cpuData?.longTasks.length || 0}
                </p>
              </CardContent>
            </Card>

            {/* 内存使用率 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">内存使用率</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {state.memoryData ? `${state.memoryData.usagePercentage.toFixed(1)}%` : '--'}
                </div>
                <Progress 
                  value={state.memoryData?.usagePercentage || 0} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  已用: {state.memoryData ? `${(state.memoryData.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB` : '--'}
                </p>
              </CardContent>
            </Card>

            {/* Web Vitals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">LCP</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {state.webVitals?.lcp ? `${state.webVitals.lcp.toFixed(0)}ms` : '--'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  最大内容绘制
                </p>
              </CardContent>
            </Card>

            {/* 组件数量 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">监控组件</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {state.componentData.length}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  活跃组件数量
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Web Vitals 详细信息 */}
          {state.webVitals && (
            <Card>
              <CardHeader>
                <CardTitle>Web Vitals 指标</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {state.webVitals.cls?.toFixed(3) || '--'}
                    </div>
                    <div className="text-sm text-muted-foreground">CLS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {state.webVitals.fid?.toFixed(0) || '--'}ms
                    </div>
                    <div className="text-sm text-muted-foreground">FID</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {state.webVitals.fcp?.toFixed(0) || '--'}ms
                    </div>
                    <div className="text-sm text-muted-foreground">FCP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {state.webVitals.lcp?.toFixed(0) || '--'}ms
                    </div>
                    <div className="text-sm text-muted-foreground">LCP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {state.webVitals.ttfb?.toFixed(0) || '--'}ms
                    </div>
                    <div className="text-sm text-muted-foreground">TTFB</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CPU监控标签页 */}
        <TabsContent value="cpu" className="space-y-4">
          {state.cpuData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>CPU使用情况</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>当前使用率:</span>
                      <Badge variant={state.cpuData.usage > 80 ? "destructive" : state.cpuData.usage > 60 ? "secondary" : "default"}>
                        {state.cpuData.usage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>活跃线程:</span>
                      <span>{state.cpuData.activeThreads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>长任务数量:</span>
                      <span>{state.cpuData.longTasks.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 重函数列表 */}
              {state.cpuData.heavyFunctions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>重函数检测</CardTitle>
                    <CardDescription>
                      执行时间较长的函数，可能导致CPU占用过高
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {state.cpuData.heavyFunctions.map((fn, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{fn.functionName}</div>
                              <div className="text-sm text-muted-foreground">
                                调用次数: {fn.callCount}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{fn.avgTime.toFixed(2)}ms</div>
                              <div className="text-sm text-muted-foreground">
                                最大: {fn.maxTime.toFixed(2)}ms
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* 内存监控标签页 */}
        <TabsContent value="memory" className="space-y-4">
          {state.memoryData && (
            <Card>
              <CardHeader>
                <CardTitle>内存使用情况</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>使用率:</span>
                    <Badge variant={state.memoryData.usagePercentage > 85 ? "destructive" : state.memoryData.usagePercentage > 70 ? "secondary" : "default"}>
                      {state.memoryData.usagePercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>已用内存:</span>
                    <span>{(state.memoryData.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>总内存:</span>
                    <span>{(state.memoryData.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>内存限制:</span>
                    <span>{(state.memoryData.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  {state.memoryData.gcCount !== undefined && (
                    <div className="flex items-center justify-between">
                      <span>垃圾回收次数:</span>
                      <span>{state.memoryData.gcCount}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 组件性能标签页 */}
        <TabsContent value="components" className="space-y-4">
          {state.componentData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>组件性能统计</CardTitle>
                <CardDescription>
                  各组件的渲染时间和重渲染次数
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {state.componentData.map((component, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{component.componentName}</div>
                          <div className="text-sm text-muted-foreground">
                            重渲染: {component.rerenderCount} 次
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{component.averageRenderTime.toFixed(2)}ms</div>
                          <div className="text-sm text-muted-foreground">
                            最大: {component.maxRenderTime.toFixed(2)}ms
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">暂无组件性能数据</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 警告日志标签页 */}
        <TabsContent value="alerts" className="space-y-4">
          {state.alerts.length > 0 ? (
            <div className="space-y-2">
              {state.alerts.map((alert) => (
                <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>
                    {alert.message}
                    <div className="text-xs mt-1 opacity-70">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">暂无警告信息</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PerformanceDashboard;