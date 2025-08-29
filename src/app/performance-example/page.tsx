'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  getPerformanceManager, 
  initializePerformanceMonitoring,
  startPerformanceMonitoring,
  type PerformanceConfig 
} from '@/lib/performance-integration';
import { withPerformanceMonitoring } from '@/lib/component-profiler';
import { getAlertSystem } from '@/lib/performance-alerts';

// 示例组件 - 故意创建性能问题
const SlowComponent = withPerformanceMonitoring(
  React.memo(({ iterations = 1000 }: { iterations?: number }) => {
    const [result, setResult] = useState<number>(0);
    
    useEffect(() => {
      // 模拟CPU密集型计算
      const start = performance.now();
      let sum = 0;
      for (let i = 0; i < iterations * 10000; i++) {
        sum += Math.random() * Math.sin(i) * Math.cos(i);
      }
      const end = performance.now();
      setResult(sum);
      console.log(`计算耗时: ${end - start}ms`);
    }, [iterations]);
    
    return (
      <div className="p-4 border rounded">
        <h3 className="font-semibold">CPU密集型组件</h3>
        <p className="text-sm text-gray-600">迭代次数: {iterations}</p>
        <p className="text-sm">计算结果: {result.toFixed(2)}</p>
      </div>
    );
  }),
  'SlowComponent'
);

// 内存泄漏示例组件
const MemoryLeakComponent = withPerformanceMonitoring(
  ({ enableLeak = false }: { enableLeak?: boolean }) => {
    const [data, setData] = useState<number[]>([]);
    
    useEffect(() => {
      if (!enableLeak) return;
      
      // 模拟内存泄漏 - 不断添加数据但不清理
      const interval = setInterval(() => {
        setData(prev => {
          const newData = [...prev];
          // 每次添加大量数据
          for (let i = 0; i < 1000; i++) {
            newData.push(Math.random());
          }
          return newData;
        });
      }, 100);
      
      // 故意不清理interval来模拟内存泄漏
      if (enableLeak) {
        return; // 不返回清理函数
      }
      
      return () => clearInterval(interval);
    }, [enableLeak]);
    
    return (
      <div className="p-4 border rounded">
        <h3 className="font-semibold">内存泄漏组件</h3>
        <p className="text-sm text-gray-600">数据量: {data.length}</p>
        <p className="text-sm">状态: {enableLeak ? '泄漏中' : '正常'}</p>
      </div>
    );
  },
  'MemoryLeakComponent'
);

// 主页面组件
export default function PerformanceExamplePage() {
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cpuIterations, setCpuIterations] = useState(100);
  const [memoryLeakEnabled, setMemoryLeakEnabled] = useState(false);
  const [performanceReport, setPerformanceReport] = useState<any>(null);

  // 初始化性能监控
  useEffect(() => {
    const initMonitoring = async () => {
      try {
        await startPerformanceMonitoring();
        setIsMonitoringActive(true);
        
        // 监听警报
        const alertSystem = getAlertSystem();
        const handleAlert = (event: CustomEvent) => {
          setAlerts(prev => [event.detail, ...prev.slice(0, 9)]); // 保留最新10个警报
        };
        
        alertSystem.addEventListener('alert', handleAlert);
        
        return () => {
          alertSystem.removeEventListener('alert', handleAlert);
        };
      } catch (error) {
        console.error('初始化性能监控失败:', error);
      }
    };
    
    initMonitoring();
  }, []);

  // 实时数据更新
  useEffect(() => {
    if (!isMonitoringActive) return;
    
    const interval = setInterval(() => {
      const manager = getPerformanceManager();
      const data = manager.getRealTimeData();
      setRealTimeData(data);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMonitoringActive]);

  // 生成性能报告
  const generateReport = () => {
    const manager = getPerformanceManager();
    const report = manager.generateReport();
    setPerformanceReport(report);
  };

  // 清除所有警报
  const clearAlerts = () => {
    const alertSystem = getAlertSystem();
    alertSystem.clearAllAlerts();
    setAlerts([]);
  };

  // 触发CPU密集型任务
  const triggerCPUTask = () => {
    setCpuIterations(prev => prev + 100);
  };

  // 切换内存泄漏
  const toggleMemoryLeak = () => {
    setMemoryLeakEnabled(prev => !prev);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">性能监控示例页面</h1>
        <p className="text-gray-600">
          这个页面演示了如何使用性能监控工具来检测和分析前端性能问题
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant={isMonitoringActive ? 'default' : 'secondary'}>
            监控状态: {isMonitoringActive ? '活跃' : '未激活'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="realtime">实时监控</TabsTrigger>
          <TabsTrigger value="alerts">警报系统</TabsTrigger>
          <TabsTrigger value="testing">性能测试</TabsTrigger>
          <TabsTrigger value="reports">性能报告</TabsTrigger>
        </TabsList>

        {/* 实时监控 */}
        <TabsContent value="realtime" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* CPU使用率 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CPU使用率</CardTitle>
              </CardHeader>
              <CardContent>
                {realTimeData?.cpu ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>当前使用率</span>
                      <span>{realTimeData.cpu.usage?.toFixed(1)}%</span>
                    </div>
                    <Progress value={realTimeData.cpu.usage || 0} className="h-2" />
                    <div className="text-xs text-gray-500">
                      长任务: {realTimeData.cpu.longTasks?.length || 0}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">暂无数据</div>
                )}
              </CardContent>
            </Card>

            {/* 内存使用 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">内存使用</CardTitle>
              </CardHeader>
              <CardContent>
                {realTimeData?.memory ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>已用内存</span>
                      <span>{(realTimeData.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</span>
                    </div>
                    <Progress 
                      value={realTimeData.memory.usagePercentage || 0} 
                      className="h-2" 
                    />
                    <div className="text-xs text-gray-500">
                      DOM节点: {realTimeData.memory.domNodes || 0}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">暂无数据</div>
                )}
              </CardContent>
            </Card>

            {/* Web Vitals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Web Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                {realTimeData?.webVitals ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>LCP</span>
                      <span>{realTimeData.webVitals.lcp?.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FID</span>
                      <span>{realTimeData.webVitals.fid?.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CLS</span>
                      <span>{realTimeData.webVitals.cls?.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FCP</span>
                      <span>{realTimeData.webVitals.fcp?.toFixed(0)}ms</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">暂无数据</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 警报系统 */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">性能警报</h2>
            <Button onClick={clearAlerts} variant="outline" size="sm">
              清除所有警报
            </Button>
          </div>
          
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <Alert>
                <AlertDescription>
                  暂无警报。当性能指标超过阈值时，警报会在这里显示。
                </AlertDescription>
              </Alert>
            ) : (
              alerts.map((alert, index) => (
                <Alert key={index} className={`border-l-4 ${
                  alert.level === 'critical' ? 'border-red-500' :
                  alert.level === 'error' ? 'border-orange-500' :
                  alert.level === 'warning' ? 'border-yellow-500' :
                  'border-blue-500'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{alert.title}</div>
                      <AlertDescription>{alert.message}</AlertDescription>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant={alert.level === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.level}
                    </Badge>
                  </div>
                </Alert>
              ))
            )}
          </div>
        </TabsContent>

        {/* 性能测试 */}
        <TabsContent value="testing" className="space-y-4">
          <h2 className="text-xl font-semibold">性能测试工具</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU测试 */}
            <Card>
              <CardHeader>
                <CardTitle>CPU性能测试</CardTitle>
                <CardDescription>
                  测试CPU密集型计算对性能的影响
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm">迭代次数:</label>
                  <input 
                    type="number" 
                    value={cpuIterations} 
                    onChange={(e) => setCpuIterations(Number(e.target.value))}
                    className="border rounded px-2 py-1 w-20 text-sm"
                  />
                  <Button onClick={triggerCPUTask} size="sm">
                    增加负载
                  </Button>
                </div>
                <SlowComponent iterations={cpuIterations} />
              </CardContent>
            </Card>

            {/* 内存测试 */}
            <Card>
              <CardHeader>
                <CardTitle>内存泄漏测试</CardTitle>
                <CardDescription>
                  模拟内存泄漏场景
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={toggleMemoryLeak}
                    variant={memoryLeakEnabled ? 'destructive' : 'default'}
                    size="sm"
                  >
                    {memoryLeakEnabled ? '停止泄漏' : '开始泄漏'}
                  </Button>
                </div>
                <MemoryLeakComponent enableLeak={memoryLeakEnabled} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 性能报告 */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">性能报告</h2>
            <Button onClick={generateReport}>
              生成报告
            </Button>
          </div>
          
          {performanceReport ? (
            <Card>
              <CardHeader>
                <CardTitle>性能分析报告</CardTitle>
                <CardDescription>
                  生成时间: {new Date(performanceReport.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(performanceReport, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                点击"生成报告"按钮来创建详细的性能分析报告。
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>实时监控:</strong> 查看当前的CPU、内存和Web Vitals指标</p>
          <p><strong>警报系统:</strong> 当性能指标超过阈值时会自动触发警报</p>
          <p><strong>性能测试:</strong> 使用测试工具模拟性能问题，观察监控系统的反应</p>
          <p><strong>性能报告:</strong> 生成详细的性能分析报告，包含所有监控数据</p>
          <p className="text-gray-600 mt-4">
            💡 提示：在开发环境中，你可以通过 <code>window.__performanceManager</code> 访问性能管理器
          </p>
        </CardContent>
      </Card>
    </div>
  );
}