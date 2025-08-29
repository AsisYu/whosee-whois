'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bug, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  Zap, 
  User, 
  BarChart3, 
  Trash2,
  RefreshCw
} from 'lucide-react';
import { logger, log, LogLevel } from '@/lib/logger';

export default function LogTestPage() {
  const t = useTranslations('common');
  const [logStats, setLogStats] = useState({
    totalLogs: 0,
    errorCount: 0,
    warningCount: 0,
    performanceIssues: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // 页面加载时记录日志
  useEffect(() => {
    log.info('日志测试页面已加载', 'log-test-page', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // 更新统计信息
    updateStats();

    return () => {
      log.info('日志测试页面即将卸载', 'log-test-page');
    };
  }, []);

  const updateStats = () => {
    const stats = logger.getLogStats();
    setLogStats(stats);
  };

  // 测试不同级别的日志
  const testDebugLog = () => {
    log.debug('这是一个调试日志 - 用于开发时的详细信息', 'log-test', {
      level: 'debug',
      timestamp: Date.now(),
      component: 'LogTestPage'
    });
    updateStats();
  };

  const testInfoLog = () => {
    log.info('这是一个信息日志 - 记录正常的系统操作', 'log-test', {
      level: 'info',
      operation: 'user-action',
      timestamp: Date.now()
    });
    updateStats();
  };

  const testWarningLog = () => {
    log.warn('这是一个警告日志 - 表示潜在的问题', 'log-test', {
      level: 'warn',
      issue: 'potential-problem',
      timestamp: Date.now()
    });
    updateStats();
  };

  const testErrorLog = () => {
    const testError = new Error('这是一个测试错误');
    testError.stack = `Error: 这是一个测试错误\n    at testErrorLog (LogTestPage.tsx:${Math.floor(Math.random() * 100)})\n    at onClick (LogTestPage.tsx:${Math.floor(Math.random() * 100)})`;
    
    log.error('这是一个错误日志 - 记录系统错误', 'log-test', {
      level: 'error',
      errorType: 'test-error',
      timestamp: Date.now()
    }, testError);
    updateStats();
  };

  // 测试性能日志
  const testPerformanceLog = async () => {
    setIsLoading(true);
    const timer = log.timer('performance-test');
    
    // 模拟一个异步操作
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    timer(true, {
      operation: 'simulated-async-task',
      component: 'LogTestPage',
      timestamp: Date.now()
    });
    
    setIsLoading(false);
    updateStats();
  };

  // 测试用户行为日志
  const testUserActionLog = () => {
    log.userAction('button-click', 'LogTestPage', {
      buttonType: 'user-action-test',
      timestamp: Date.now(),
      sessionInfo: {
        duration: Date.now() - performance.timeOrigin,
        interactions: Math.floor(Math.random() * 10) + 1
      }
    });
    updateStats();
  };

  // 测试批量日志
  const testBatchLogs = () => {
    setIsLoading(true);
    
    // 快速生成多个日志
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const logTypes = ['debug', 'info', 'warn', 'error'];
        const randomType = logTypes[Math.floor(Math.random() * logTypes.length)];
        
        switch (randomType) {
          case 'debug':
            log.debug(`批量测试日志 ${i + 1}`, 'batch-test', { index: i + 1 });
            break;
          case 'info':
            log.info(`批量测试日志 ${i + 1}`, 'batch-test', { index: i + 1 });
            break;
          case 'warn':
            log.warn(`批量测试日志 ${i + 1}`, 'batch-test', { index: i + 1 });
            break;
          case 'error':
            log.error(`批量测试日志 ${i + 1}`, 'batch-test', { index: i + 1 }, new Error(`批量错误 ${i + 1}`));
            break;
        }
        
        if (i === 9) {
          setTimeout(() => {
            setIsLoading(false);
            updateStats();
          }, 100);
        }
      }, i * 100);
    }
  };

  // 清理日志
  const clearLogs = () => {
    logger.clearLogs();
    updateStats();
    log.info('日志已清理', 'log-test', { action: 'clear-logs' });
    updateStats();
  };

  // 查看本地存储的日志
  const viewStoredLogs = () => {
    const storedLogs = localStorage.getItem('app_logs');
    const performanceLogs = localStorage.getItem('app_performance_logs');
    const userActionLogs = localStorage.getItem('app_user_action_logs');
    
    console.group('📋 本地存储的日志数据');
    console.log('普通日志:', storedLogs ? JSON.parse(storedLogs) : '无数据');
    console.log('性能日志:', performanceLogs ? JSON.parse(performanceLogs) : '无数据');
    console.log('用户行为日志:', userActionLogs ? JSON.parse(userActionLogs) : '无数据');
    console.groupEnd();
    
    alert('日志数据已输出到控制台，请按F12查看开发者工具');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">日志收集系统测试</h1>
        <p className="text-muted-foreground">
          测试项目的日志收集功能，包括不同级别的日志、性能监控和用户行为追踪
        </p>
      </div>

      {/* 日志统计 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            日志统计信息
          </CardTitle>
          <CardDescription>
            当前会话的日志收集统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{logStats.totalLogs}</div>
              <div className="text-sm text-muted-foreground">总日志数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{logStats.errorCount}</div>
              <div className="text-sm text-muted-foreground">错误数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{logStats.warningCount}</div>
              <div className="text-sm text-muted-foreground">警告数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{logStats.performanceIssues}</div>
              <div className="text-sm text-muted-foreground">性能问题</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={updateStats} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新统计
            </Button>
            <Button onClick={viewStoredLogs} variant="outline" size="sm">
              <Info className="h-4 w-4 mr-2" />
              查看存储日志
            </Button>
            <Button onClick={clearLogs} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              清理日志
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志级别测试 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              日志级别测试
            </CardTitle>
            <CardDescription>
              测试不同级别的日志记录功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={testDebugLog} variant="outline" className="w-full justify-start">
              <Badge variant="secondary" className="mr-2">DEBUG</Badge>
              调试日志
            </Button>
            <Button onClick={testInfoLog} variant="outline" className="w-full justify-start">
              <Info className="h-4 w-4 mr-2" />
              <Badge variant="default" className="mr-2">INFO</Badge>
              信息日志
            </Button>
            <Button onClick={testWarningLog} variant="outline" className="w-full justify-start">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <Badge variant="destructive" className="mr-2">WARN</Badge>
              警告日志
            </Button>
            <Button onClick={testErrorLog} variant="outline" className="w-full justify-start">
              <AlertCircle className="h-4 w-4 mr-2" />
              <Badge variant="destructive" className="mr-2">ERROR</Badge>
              错误日志
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              特殊功能测试
            </CardTitle>
            <CardDescription>
              测试性能监控和用户行为追踪
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={testPerformanceLog} 
              variant="outline" 
              className="w-full justify-start"
              disabled={isLoading}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {isLoading ? '执行中...' : '性能日志测试'}
            </Button>
            <Button onClick={testUserActionLog} variant="outline" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              用户行为日志
            </Button>
            <Button 
              onClick={testBatchLogs} 
              variant="outline" 
              className="w-full justify-start"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isLoading ? '生成中...' : '批量日志测试'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">日志查看方式：</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>按 F12 打开开发者工具查看控制台日志</li>
                <li>点击"查看存储日志"按钮查看本地存储的日志数据</li>
                <li>日志会自动保存到 localStorage 中</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">日志功能特性：</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>支持 DEBUG、INFO、WARN、ERROR 四个级别</li>
                <li>自动记录性能指标和执行时间</li>
                <li>追踪用户行为和交互数据</li>
                <li>支持错误堆栈跟踪</li>
                <li>自动缓冲和批量刷新到存储</li>
                <li>提供统计信息和监控面板</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}