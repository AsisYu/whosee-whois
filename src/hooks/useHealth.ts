import { useState, useEffect, useCallback } from 'react';
import { healthController } from '@/controllers/HealthController';
import { HealthStatus } from '@/types';

/**
 * 健康监控Hook - 连接HealthController和React组件
 */
export function useHealth() {
  const [data, setData] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 订阅控制器状态变化
  useEffect(() => {
    const unsubscribe = healthController.subscribe(() => {
      setData(healthController.getData());
      setLoading(healthController.isLoading());
      setError(healthController.getError());
      setLastUpdated(new Date());
    });

    // 初始化状态
    setData(healthController.getData());
    setLoading(healthController.isLoading());
    setError(healthController.getError());

    return unsubscribe;
  }, []);

  // 检查健康状态
  const checkHealth = useCallback(async () => {
    await healthController.checkHealth();
  }, []);

  // 检查特定服务健康状态
  const checkServiceHealth = useCallback(async (serviceName: string) => {
    await healthController.checkServiceHealth(serviceName);
  }, []);

  // 获取系统指标
  const getSystemMetrics = useCallback(async () => {
    await healthController.getSystemMetrics();
  }, []);

  // 开始自动刷新
  const startAutoRefresh = useCallback((interval?: number) => {
    healthController.startAutoRefresh(interval);
    setAutoRefresh(true);
  }, []);

  // 停止自动刷新
  const stopAutoRefresh = useCallback(() => {
    healthController.stopAutoRefresh();
    setAutoRefresh(false);
  }, []);

  // 切换自动刷新
  const toggleAutoRefresh = useCallback((interval?: number) => {
    if (autoRefresh) {
      stopAutoRefresh();
    } else {
      startAutoRefresh(interval);
    }
  }, [autoRefresh, startAutoRefresh, stopAutoRefresh]);

  // 清除结果
  const clearResults = useCallback(() => {
    healthController.clear();
  }, []);

  // 获取服务状态摘要
  const getServiceStatusSummary = useCallback(() => {
    return healthController.getServiceStatusSummary();
  }, []);

  // 获取系统状态
  const getSystemStatus = useCallback(() => {
    return healthController.getSystemStatus();
  }, []);

  // 获取关键服务状态
  const getCriticalServices = useCallback(() => {
    return healthController.getCriticalServices();
  }, []);

  // 格式化响应时间
  const formatResponseTime = useCallback((ms: number) => {
    return healthController.formatResponseTime(ms);
  }, []);

  // 获取性能等级
  const getPerformanceGrade = useCallback((responseTime: number) => {
    return healthController.getPerformanceGrade(responseTime);
  }, []);

  // 获取健康历史
  const getHealthHistory = useCallback(() => {
    return healthController.getHealthHistory();
  }, []);

  // 清除健康历史
  const clearHealthHistory = useCallback(() => {
    healthController.clearHealthHistory();
  }, []);

  // 导出健康报告
  const exportHealthReport = useCallback(() => {
    return healthController.exportHealthReport();
  }, []);

  // 计算衍生状态
  const serviceSummary = getServiceStatusSummary();
  const systemStatus = getSystemStatus();
  const criticalServices = getCriticalServices();
  const healthHistory = getHealthHistory();

  // 获取状态颜色
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  // 获取状态图标
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  }, []);

  // 获取状态描述
  const getStatusDescription = useCallback((status: string) => {
    switch (status) {
      case 'healthy':
        return '系统运行正常';
      case 'degraded':
        return '系统性能下降';
      case 'unhealthy':
        return '系统存在问题';
      default:
        return '状态未知';
    }
  }, []);

  // 检查是否有关键问题
  const hasCriticalIssues = criticalServices.length > 0;

  // 计算系统健康度分数
  const getHealthScore = useCallback(() => {
    if (!data) return 0;
    
    const { healthyPercentage } = serviceSummary;
    let score = healthyPercentage;
    
    // 根据响应时间调整分数
    if (data.responseTime) {
      if (data.responseTime > 1000) {
        score -= 10;
      } else if (data.responseTime > 500) {
        score -= 5;
      }
    }
    
    // 根据关键服务状态调整分数
    if (hasCriticalIssues) {
      score -= criticalServices.length * 15;
    }
    
    return Math.max(0, Math.min(100, score));
  }, [data, serviceSummary, criticalServices, hasCriticalIssues]);

  const healthScore = getHealthScore();

  return {
    // 基础状态
    data,
    loading,
    error,
    lastUpdated,
    autoRefresh,
    
    // 操作方法
    checkHealth,
    checkServiceHealth,
    getSystemMetrics,
    startAutoRefresh,
    stopAutoRefresh,
    toggleAutoRefresh,
    clearResults,
    clearHealthHistory,
    exportHealthReport,
    
    // 计算属性
    serviceSummary,
    systemStatus,
    criticalServices,
    healthHistory,
    healthScore,
    hasCriticalIssues,
    
    // 工具方法
    formatResponseTime,
    getPerformanceGrade,
    getStatusColor,
    getStatusIcon,
    getStatusDescription,
    
    // 便捷属性
    hasData: !!data,
    isEmpty: !data,
    hasError: !!error,
    isIdle: !loading && !data && !error,
    isHealthy: systemStatus === 'healthy',
    isDegraded: systemStatus === 'degraded',
    isUnhealthy: systemStatus === 'unhealthy'
  };
}

/**
 * 健康检查配置选项
 */
export const HEALTH_CHECK_OPTIONS = {
  intervals: [
    { value: 10000, label: '10秒' },
    { value: 30000, label: '30秒' },
    { value: 60000, label: '1分钟' },
    { value: 300000, label: '5分钟' }
  ],
  defaultInterval: 30000
} as const;

/**
 * 服务状态类型
 */
export const SERVICE_STATUS_TYPES = {
  healthy: { label: '正常', color: 'green', icon: '✅' },
  degraded: { label: '降级', color: 'yellow', icon: '⚠️' },
  unhealthy: { label: '异常', color: 'red', icon: '❌' },
  unknown: { label: '未知', color: 'gray', icon: '❓' }
} as const;