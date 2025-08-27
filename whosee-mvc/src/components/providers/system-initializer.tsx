'use client';

import { useEffect } from 'react';
import { initializeErrorHandling } from '@/lib/error-handler';
import { PerformanceManager } from '@/lib/performance-integration';

interface SystemInitializerProps {
  enablePerformanceMonitor?: boolean;
  enableCPUMonitor?: boolean;
}

export default function SystemInitializer({
  enablePerformanceMonitor = true,
  enableCPUMonitor = true
}: SystemInitializerProps) {
  useEffect(() => {
    const initializeSystems = async () => {
      try {
        // 初始化错误处理系统
        initializeErrorHandling();
        
        // 初始化性能监控
        if (typeof window !== 'undefined') {
          const performanceManager = new PerformanceManager({
            enablePerformanceMonitor,
            enableCPUMonitor,
            performanceConfig: {
              interval: 5000,
              enableConsoleLog: process.env.NODE_ENV === 'development'
            },
            cpuConfig: {
              interval: 2000,
              enableConsoleLog: process.env.NODE_ENV === 'development'
            }
          });
          
          await performanceManager.initialize();
          
          // 开发环境下暴露到全局
          if (process.env.NODE_ENV === 'development') {
            (window as any).__performanceManager = performanceManager;
          }
        }
      } catch (error) {
        console.error('Failed to initialize systems:', error);
      }
    };

    initializeSystems();
  }, [enablePerformanceMonitor, enableCPUMonitor]);

  return null;
}