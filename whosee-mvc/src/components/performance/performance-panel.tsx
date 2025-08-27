'use client';

/**
 * PerformancePanel
 *
 * Floating monitoring panel that displays real-time metrics from PerfHub while
 * preserving the existing visual style. The component subscribes to PerfHub
 * snapshots, maps them into local, strongly-typed UI state, and renders:
 * - Web Vitals and memory usage (Overview tab)
 * - CPU usage and recent long tasks (CPU tab)
 * - Concurrency metrics from the concurrency manager (Concurrency tab)
 * - Request cache metrics from the request-deduplication manager (Cache tab)
 * - Recent performance alerts (Alerts tab)
 *
 * Design goals:
 * - Read-only display component (View layer of MVC)
 * - Resilient to missing data (shows empty states instead of errors)
 * - No coupling to private manager internals; relies on public PerfHub API
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { perfHub, type PerfSnapshot } from '@/lib/perf-hub';
import { defaultConcurrencyManager } from '@/lib/concurrency-manager';
import { defaultRequestManager } from '@/lib/request-deduplication';
import type { PerformanceMetrics, PerformanceAlert, CPUUsageData } from '@/lib/perf-types';
import { PerformanceLevel } from '@/lib/perf-types';

/**
 * Strong types for metrics rendered by the panel to avoid `unknown` in JSX.
 */
type ConcurrencyMetrics = {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentConcurrency: number;
  queueSize: number;
  throughput: number;
  averageExecutionTime: number;
  errorRate: number;
};

type CacheMetrics = {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
  evictions: number;
};

interface PerformancePanelProps {
  className?: string;
}

export function PerformancePanel({ className }: PerformancePanelProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [cpuData, setCpuData] = useState<CPUUsageData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [concurrencyMetrics, setConcurrencyMetrics] = useState<ConcurrencyMetrics | null>(null);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const FAST_POLL_MS = 3000;
  const SLOW_POLL_MS = 10000;

  // Map a PerfHub snapshot into typed UI state for display-only rendering
  const applySnapshot = (snap: PerfSnapshot) => {
    const web = snap.webVitals;
    const nextMetrics: PerformanceMetrics = {
      timestamp: snap.timestamp,
      lcp: web?.lcp,
      fcp: web?.fcp,
      cls: web?.cls,
      ttfb: web?.ttfb,
      memoryUsage: snap.memory || undefined,
    } as PerformanceMetrics;
    setMetrics(nextMetrics);
    // Prefer live data from managers to ensure concurrency/cache values are accurate
    try {
      const conc = defaultConcurrencyManager.getMetrics();
      setConcurrencyMetrics({
        totalTasks: conc.totalTasks,
        completedTasks: conc.completedTasks,
        failedTasks: conc.failedTasks,
        currentConcurrency: conc.currentConcurrency,
        queueSize: conc.queueSize,
        throughput: conc.throughput,
        averageExecutionTime: conc.averageExecutionTime,
        errorRate: conc.errorRate
      } as any);
    } catch {
      setConcurrencyMetrics(snap.concurrency as any);
    }
    try {
      const cache = defaultRequestManager.getMetrics();
      setCacheMetrics({
        hits: cache.hits,
        misses: cache.misses,
        hitRate: cache.hitRate,
        totalRequests: cache.totalRequests,
        cacheSize: cache.cacheSize,
        memoryUsage: cache.memoryUsage,
        evictions: cache.evictions
      } as any);
    } catch {
      setCacheMetrics(snap.cache as any);
    }
    setCpuData(
      typeof snap.cpu === 'number'
        ? ({ timestamp: snap.timestamp, usage: snap.cpu, activeThreads: 1, longTasks: [], heavyFunctions: [] } as CPUUsageData)
        : null
    );
    // Update alerts if hub provides them
    try {
      if (Array.isArray(snap.alerts)) {
        // 只保留最近的若干条
        const mapped: PerformanceAlert[] = snap.alerts.slice(-10).map((a: any) => ({
          type: (a.type || 'vitals') as PerformanceAlert['type'],
          level: a.level === 'critical' 
            ? PerformanceLevel.POOR 
            : a.level === 'warning' 
              ? PerformanceLevel.NEEDS_IMPROVEMENT 
              : PerformanceLevel.GOOD,
          message: a.message || '',
          value: typeof a.value === 'number' ? a.value : 0,
          threshold: typeof a.threshold === 'number' ? a.threshold : 0,
          timestamp: a.timestamp || Date.now(),
        }));
        setAlerts(mapped);
      }
    } catch {}
  };

  // Subscribe to PerfHub and prime UI with last snapshot; provide safe defaults
  useEffect(() => {
    console.log('🔄 Initializing performance monitoring (PerfHub)...');
    const cleanupFns: Array<() => void> = [];
    const unsub = perfHub.subscribe((snap) => applySnapshot(snap));
    cleanupFns.push(unsub);
    perfHub.start(SLOW_POLL_MS);
    const last = perfHub.getLast();
    if (last) applySnapshot(last);

    // Default placeholders to avoid flashing empty UI before first metrics arrive
    setConcurrencyMetrics((prev) => prev || {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      currentConcurrency: 0,
      queueSize: 0,
      throughput: 0,
      averageExecutionTime: 0,
      errorRate: 0
    });
    setCacheMetrics((prev) => prev || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0,
      evictions: 0
    });

    return () => { cleanupFns.forEach(fn => fn()); };
  }, []);

  // Live, lightweight updates while the panel is visible (1s cadence)
  const updateLiveMetrics = () => {
    try {
      const conc = defaultConcurrencyManager.getMetrics();
      setConcurrencyMetrics({
        totalTasks: conc.totalTasks,
        completedTasks: conc.completedTasks,
        failedTasks: conc.failedTasks,
        currentConcurrency: conc.currentConcurrency,
        queueSize: conc.queueSize,
        throughput: conc.throughput,
        averageExecutionTime: conc.averageExecutionTime,
        errorRate: conc.errorRate
      });
    } catch {}

    try {
      const cache = defaultRequestManager.getMetrics();
      setCacheMetrics({
        hits: cache.hits,
        misses: cache.misses,
        hitRate: cache.hitRate,
        totalRequests: cache.totalRequests,
        cacheSize: cache.cacheSize,
        memoryUsage: cache.memoryUsage,
        evictions: cache.evictions
      });
    } catch {}

    // Optionally refresh web vitals/memory from latest snapshot without heavy work
    const last = perfHub.getLast();
    if (last?.webVitals || last?.memory) {
      const web = last.webVitals;
      setMetrics((prev) => ({
        timestamp: last.timestamp,
        lcp: web?.lcp,
        fcp: web?.fcp,
        cls: web?.cls,
        ttfb: web?.ttfb,
        memoryUsage: last.memory || prev?.memoryUsage
      } as PerformanceMetrics));
    }
  };

  // When panel opens, speed up hub polling and start local 1s updates; restore on close
  useEffect(() => {
    if (isVisible) {
      try { perfHub.stop(); perfHub.start(FAST_POLL_MS); } catch {}
      updateLiveMetrics();
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
      liveTimerRef.current = setInterval(updateLiveMetrics, 1000);
    } else {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
      try { perfHub.stop(); perfHub.start(SLOW_POLL_MS); } catch {}
    }

    return () => {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
    };
  }, [isVisible]);

  // Refresh with the latest snapshot + live managers
  const refreshData = () => {
    const last = perfHub.getLast();
    if (last) applySnapshot(last);
    updateLiveMetrics();
    logger.info('Performance panel data refreshed', 'performance-panel', {
      hasMetrics: !!metrics,
      alertsCount: alerts.length,
      hasConcurrencyMetrics: !!concurrencyMetrics,
      hasCacheMetrics: !!cacheMetrics
    });
  };

  // Clear panel alerts only (does not mutate hub history)
  const clearAlerts = () => {
    setAlerts([]);
  };

  // Human-readable byte formatting (KiB/MiB/GiB)
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Generic level helper for thresholds (currently unused variants kept for future use)
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
              {/* 总体概览 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  总体概览
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>CPU 使用率:</span>
                    <Badge 
                      variant={cpuData?.usage && cpuData.usage > 90 ? 'destructive' : 
                              cpuData?.usage && cpuData.usage > 70 ? 'secondary' : 'default'}
                    >
                      {cpuData?.usage !== undefined ? `${cpuData.usage.toFixed(1)}%` : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>内存使用率:</span>
                    <Badge 
                      variant={metrics?.memoryUsage && metrics.memoryUsage.percentage > 90 ? 'destructive' : 
                              metrics?.memoryUsage && metrics.memoryUsage.percentage > 70 ? 'secondary' : 'default'}
                    >
                      {metrics?.memoryUsage ? `${metrics.memoryUsage.percentage.toFixed(1)}%` : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>当前并发:</span>
                    <span>{concurrencyMetrics ? concurrencyMetrics.currentConcurrency : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>队列:</span>
                    <span>{concurrencyMetrics ? concurrencyMetrics.queueSize : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>命中率:</span>
                    <Badge 
                      variant={cacheMetrics && cacheMetrics.hitRate > 0.8 ? 'default' : 
                              cacheMetrics && cacheMetrics.hitRate > 0.5 ? 'secondary' : 'destructive'}
                    >
                      {cacheMetrics ? `${(cacheMetrics.hitRate * 100).toFixed(1)}%` : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>总请求:</span>
                    <span>{cacheMetrics ? cacheMetrics.totalRequests : '—'}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  最近更新: {metrics ? new Date(metrics.timestamp).toLocaleTimeString() : '—'}
                </div>
              </div>

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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center">
                    <Network className="h-4 w-4 mr-2" />
                    并发性能
                  </h4>
                </div>
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