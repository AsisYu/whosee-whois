'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Cpu, 
  MemoryStick, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  Zap,
  RefreshCw,
  Database,
  Network
} from 'lucide-react';
import { logger } from '@/lib/logger';
import type { 
  PerformanceMetrics, 
  PerformanceAlert 
} from '@/lib/performance-monitor';
import type { 
  CPUUsageData, 
  LongTaskData 
} from '@/lib/cpu-monitor';

interface PerformancePanelProps {
  className?: string;
}

export function PerformancePanel({ className }: PerformancePanelProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [cpuData, setCpuData] = useState<CPUUsageData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [performanceManager, setPerformanceManager] = useState<Record<string, unknown> | null>(null);
  const [concurrencyMetrics, setConcurrencyMetrics] = useState<Record<string, unknown> | null>(null);
  const [cacheMetrics, setCacheMetrics] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // 获取全局性能管理器
    if (typeof window !== 'undefined' && (window as Window & { __performanceManager?: Record<string, unknown> }).__performanceManager) {
      const manager = (window as Window & { __performanceManager?: Record<string, unknown> }).__performanceManager;
      setPerformanceManager(manager);
      
      // 设置回调
      if (manager.performanceMonitor) {
        manager.performanceMonitor.onMetricsCallback((newMetrics: PerformanceMetrics) => {
          setMetrics(newMetrics);
        });
        
        manager.performanceMonitor.onAlertCallback((alert: PerformanceAlert) => {
          setAlerts(prev => [...prev.slice(-9), alert]);
        });
      }
      
      if (manager.cpuMonitor) {
        manager.cpuMonitor.onAlertCallback((data: CPUUsageData) => {
          setCpuData(data);
        });
      }
      
      // 初始数据加载
      loadInitialData(manager);
    }
  }, []);

  const loadInitialData = (manager: Record<string, unknown>) => {
    try {
      if (manager.performanceMonitor) {
        const latestMetrics = manager.performanceMonitor.getLatestMetrics();
        if (latestMetrics) {
          setMetrics(latestMetrics);
          
          // 提取并发和缓存指标
          if (latestMetrics.concurrency) {
            setConcurrencyMetrics(latestMetrics.concurrency);
          }
          if (latestMetrics.cache) {
            setCacheMetrics(latestMetrics.cache);
          }
        }
        
        const currentAlerts = manager.performanceMonitor.getAlerts();
        setAlerts(currentAlerts.slice(-10));
      }
      
      if (manager.cpuMonitor) {
        const latestCpu = manager.cpuMonitor.getLatestUsage();
        if (latestCpu) setCpuData(latestCpu);
      }
    } catch (error) {
      logger.error(
        'Failed to load performance data',
        'performance-panel',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  };

  const refreshData = () => {
    if (performanceManager) {
      loadInitialData(performanceManager);
      
      // 记录性能面板刷新
      logger.info(
        'Performance panel data refreshed',
        'performance-panel',
        {
          hasMetrics: !!metrics,
          alertsCount: alerts.length,
          hasConcurrencyMetrics: !!concurrencyMetrics,
          hasCacheMetrics: !!cacheMetrics
        }
      );
    }
  };

  const clearAlerts = () => {
    if (performanceManager?.performanceMonitor) {
      performanceManager.performanceMonitor.clearAlerts();
      setAlerts([]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPerformanceLevel = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return { level: 'critical', color: 'destructive' };
    if (value >= thresholds.warning) return { level: 'warning', color: 'warning' };
    return { level: 'good', color: 'success' };
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          性能监控
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-96 ${className}`}>
      <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <CardTitle className="text-lg">性能监控</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={refreshData}
                variant="ghost"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
              >
                ×
              </Button>
            </div>
          </div>
          <CardDescription>
            实时性能指标和系统状态
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="cpu">CPU</TabsTrigger>
              <TabsTrigger value="concurrency">并发</TabsTrigger>
              <TabsTrigger value="cache">缓存</TabsTrigger>
              <TabsTrigger value="alerts">警告</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {/* Web Vitals */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Web Vitals
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {metrics?.lcp && (
                    <div className="flex justify-between">
                      <span>LCP:</span>
                      <Badge variant={metrics.lcp > 2500 ? 'destructive' : metrics.lcp > 1200 ? 'secondary' : 'default'}>
                        {metrics.lcp.toFixed(0)}ms
                      </Badge>
                    </div>
                  )}
                  {metrics?.fcp && (
                    <div className="flex justify-between">
                      <span>FCP:</span>
                      <Badge variant={metrics.fcp > 1800 ? 'destructive' : metrics.fcp > 1000 ? 'secondary' : 'default'}>
                        {metrics.fcp.toFixed(0)}ms
                      </Badge>
                    </div>
                  )}
                  {metrics?.cls && (
                    <div className="flex justify-between">
                      <span>CLS:</span>
                      <Badge variant={metrics.cls > 0.25 ? 'destructive' : metrics.cls > 0.1 ? 'secondary' : 'default'}>
                        {metrics.cls.toFixed(3)}
                      </Badge>
                    </div>
                  )}
                  {metrics?.ttfb && (
                    <div className="flex justify-between">
                      <span>TTFB:</span>
                      <Badge variant={metrics.ttfb > 800 ? 'destructive' : metrics.ttfb > 200 ? 'secondary' : 'default'}>
                        {metrics.ttfb.toFixed(0)}ms
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* 内存使用 */}
              {metrics?.memoryUsage && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center">
                    <MemoryStick className="h-4 w-4 mr-2" />
                    内存使用
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>已用:</span>
                      <span>{formatBytes(metrics.memoryUsage.used)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>总计:</span>
                      <span>{formatBytes(metrics.memoryUsage.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>使用率:</span>
                      <Badge 
                        variant={metrics.memoryUsage.percentage > 90 ? 'destructive' : 
                                metrics.memoryUsage.percentage > 70 ? 'secondary' : 'default'}
                      >
                        {metrics.memoryUsage.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="cpu" className="space-y-4">
              {cpuData && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center">
                      <Cpu className="h-4 w-4 mr-2" />
                      CPU 状态
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>使用率:</span>
                        <Badge 
                          variant={cpuData.usage > 90 ? 'destructive' : 
                                  cpuData.usage > 70 ? 'secondary' : 'default'}
                        >
                          {cpuData.usage.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>活跃线程:</span>
                        <span>{cpuData.activeThreads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>长任务:</span>
                        <Badge variant={cpuData.longTasks.length > 0 ? 'destructive' : 'default'}>
                          {cpuData.longTasks.length}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {cpuData.longTasks.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          最近长任务
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {cpuData.longTasks.slice(-3).map((task, index) => (
                            <div key={index} className="text-xs p-2 bg-muted rounded">
                              <div className="flex justify-between">
                                <span className="font-medium">{task.name}</span>
                                <span>{task.duration.toFixed(1)}ms</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="concurrency" className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <Network className="h-4 w-4 mr-2" />
                  并发性能
                </h4>
                {concurrencyMetrics ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex justify-between">
                        <span>总任务:</span>
                        <span>{concurrencyMetrics.totalTasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>完成:</span>
                        <span className="text-green-600">{concurrencyMetrics.completedTasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>失败:</span>
                        <span className="text-red-600">{concurrencyMetrics.failedTasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>当前并发:</span>
                        <span>{concurrencyMetrics.currentConcurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>队列大小:</span>
                        <span>{concurrencyMetrics.queueSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>吞吐量:</span>
                        <span>{concurrencyMetrics.throughput.toFixed(1)}/s</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>平均执行时间:</span>
                        <Badge variant="outline">
                          {concurrencyMetrics.averageExecutionTime.toFixed(0)}ms
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>错误率:</span>
                        <Badge 
                          variant={concurrencyMetrics.errorRate > 0.1 ? 'destructive' : 
                                  concurrencyMetrics.errorRate > 0.05 ? 'secondary' : 'default'}
                        >
                          {(concurrencyMetrics.errorRate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">暂无并发数据</div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="cache" className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  缓存性能
                </h4>
                {cacheMetrics ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex justify-between">
                        <span>命中:</span>
                        <span className="text-green-600">{cacheMetrics.hits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>未命中:</span>
                        <span className="text-red-600">{cacheMetrics.misses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>总请求:</span>
                        <span>{cacheMetrics.totalRequests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>缓存大小:</span>
                        <span>{cacheMetrics.cacheSize}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>命中率:</span>
                        <Badge 
                          variant={cacheMetrics.hitRate > 0.8 ? 'default' : 
                                  cacheMetrics.hitRate > 0.5 ? 'secondary' : 'destructive'}
                        >
                          {(cacheMetrics.hitRate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>内存使用:</span>
                        <Badge variant="outline">
                          {(cacheMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>驱逐次数:</span>
                        <span>{cacheMetrics.evictions}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">暂无缓存数据</div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="alerts" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  性能警告
                </h4>
                {alerts.length > 0 && (
                  <Button
                    onClick={clearAlerts}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    清除
                  </Button>
                )}
              </div>
              
              {alerts.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  暂无性能警告
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {alerts.slice(-5).reverse().map((alert, index) => (
                    <div key={index} className="text-xs p-2 bg-muted rounded">
                      <div className="flex items-center justify-between mb-1">
                        <Badge 
                          variant={alert.level === 'poor' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {alert.type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-foreground">
                        {alert.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default PerformancePanel;