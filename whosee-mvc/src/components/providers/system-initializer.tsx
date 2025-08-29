'use client';

import { useEffect } from 'react';
import { initializeErrorHandling } from '@/lib/error-handler';
import { initializePerformanceMonitoring } from '@/lib/performance-integration';
import { defaultConcurrencyManager } from '@/lib/concurrency-manager';
import { defaultRequestManager } from '@/lib/request-deduplication';

interface SystemInitializerProps {
  enablePerformanceMonitor?: boolean;
  enableCPUMonitor?: boolean;
}

export default function SystemInitializer({
  enablePerformanceMonitor = false,
  enableCPUMonitor = true
}: SystemInitializerProps) {
  useEffect(() => {
    const DEBUG = process.env.NEXT_PUBLIC_DEBUG_PERF === '1';
    if (DEBUG) console.log('🔄 Initializing system...');
    
    const initializeSystem = async () => {
      try {
        // 初始化错误处理
        initializeErrorHandling();
        if (DEBUG) console.log('✅ Error handler initialized');
        
        if (enablePerformanceMonitor) {
          // 使用安全的初始化配置
          const performanceManager = await initializePerformanceMonitoring({
            enabled: true,
            enableInDevelopment: true,
            enableInProduction: false,
            monitoringInterval: 30000, // 30秒间隔，减少频率
            enableAlerts: false, // 暂时禁用警报避免循环
            enableComponentMonitoring: false, // 暂时禁用组件监控
            enableCPUMonitoring: false, // 暂时禁用CPU监控
            enableMemoryMonitoring: true,
            enableWebVitalsMonitoring: true
          });
          if (DEBUG) console.log('✅ Performance manager initialized');
          // 可选：仅在明确开启调试时暴露全局对象
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && DEBUG) {
            (window as Window & { __performanceManager?: any }).__performanceManager = performanceManager;
          }
        }
        
        // 在开发环境中暴露全局对象，便于控制台粘贴脚本进行验证（静默，无日志）
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          (window as any).defaultConcurrencyManager = defaultConcurrencyManager;
          (window as any).defaultRequestManager = defaultRequestManager;
        }
        
      } catch (error) {
        if (DEBUG) console.error('❌ System initialization failed:', error);
        // 降级处理：至少暴露并发管理器
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          (window as any).defaultConcurrencyManager = defaultConcurrencyManager;
          (window as any).defaultRequestManager = defaultRequestManager;
        }
      }
    };
    
    initializeSystem();
  }, [enablePerformanceMonitor, enableCPUMonitor]);

  return null;
}