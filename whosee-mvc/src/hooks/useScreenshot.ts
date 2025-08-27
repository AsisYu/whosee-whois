'use client';

import { useState, useCallback, useRef } from 'react';
import { ScreenshotController } from '@/controllers/ScreenshotController';
import { ScreenshotOptions, ScreenshotResult } from '@/types';
import { logger } from '@/utils/logger';

// 设备预设
export const DEVICE_PRESETS = [
  { name: 'Desktop HD', width: 1920, height: 1080, type: 'desktop' },
  { name: 'Desktop', width: 1366, height: 768, type: 'desktop' },
  { name: 'Laptop', width: 1280, height: 800, type: 'desktop' },
  { name: 'Tablet', width: 768, height: 1024, type: 'tablet' },
  { name: 'Mobile L', width: 414, height: 896, type: 'mobile' },
  { name: 'Mobile M', width: 375, height: 667, type: 'mobile' },
  { name: 'Mobile S', width: 320, height: 568, type: 'mobile' }
];

// 截图选项
export const SCREENSHOT_OPTIONS = {
  defaultWidth: 1920,
  defaultHeight: 1080,
  defaultQuality: 80,
  defaultFullPage: false,
  minWidth: 320,
  maxWidth: 3840,
  minHeight: 240,
  maxHeight: 2160,
  minQuality: 10,
  maxQuality: 100,
  debounceDelay: 500
};

/**
 * 截图功能Hook
 * 连接ScreenshotController与React组件
 */
export function useScreenshot() {
  const controllerRef = useRef<ScreenshotController | null>(null);
  const [data, setData] = useState<ScreenshotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureHistory, setCaptureHistory] = useState<ScreenshotResult[]>([]);

  // 初始化Controller
  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new ScreenshotController();
      
      // 订阅状态变化
      const unsubscribe = controllerRef.current.subscribe((state) => {
        setData(state.data);
        setLoading(state.loading);
        setError(state.error);
      });

      // 加载历史记录
      setCaptureHistory(controllerRef.current.getCaptureHistory());

      return () => {
        unsubscribe();
        controllerRef.current?.cleanup();
      };
    }
  }, []);

  /**
   * 截图网站
   */
  const captureScreenshot = useCallback(async (domain: string, options?: ScreenshotOptions) => {
    if (!controllerRef.current) return null;
    
    const result = await controllerRef.current.captureScreenshot(domain, options);
    
    // 更新历史记录
    if (result) {
      setCaptureHistory(prev => [result, ...prev.slice(0, 19)]); // 保留最近20条记录
    }
    
    return result;
  }, []);

  /**
   * 防抖截图
   */
  const captureScreenshotDebounced = useCallback((domain: string, options?: ScreenshotOptions, delay?: number) => {
    if (!controllerRef.current) return Promise.resolve(null);
    
    return controllerRef.current.captureScreenshotDebounced(
      domain, 
      options, 
      delay || SCREENSHOT_OPTIONS.debounceDelay
    );
  }, []);

  /**
   * 清除结果
   */
  const clearResults = useCallback(() => {
    if (!controllerRef.current) return;
    
    controllerRef.current.clearData();
    controllerRef.current.clearError();
  }, []);

  /**
   * 下载截图
   */
  const downloadScreenshot = useCallback((imageData: string, filename?: string) => {
    if (!controllerRef.current) return;
    
    try {
      controllerRef.current.downloadScreenshot(imageData, filename);
    } catch (error) {
      logger.error('Download failed:', error);
    }
  }, []);

  /**
   * 复制图片到剪贴板
   */
  const copyImageToClipboard = useCallback(async (imageData: string) => {
    if (!controllerRef.current) return;
    
    try {
      await controllerRef.current.copyImageToClipboard(imageData);
    } catch (error) {
      logger.error('Copy to clipboard failed:', error);
      throw error;
    }
  }, []);

  /**
   * 获取图片大小
   */
  const getImageSize = useCallback((imageData: string): number => {
    if (!controllerRef.current) return 0;
    
    return controllerRef.current.getImageSize(imageData);
  }, []);

  /**
   * 格式化文件大小
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (!controllerRef.current) return '0 B';
    
    return controllerRef.current.formatFileSize(bytes);
  }, []);

  /**
   * 验证域名
   */
  const validateDomain = useCallback((domain: string): boolean => {
    if (!controllerRef.current) return false;
    
    return controllerRef.current.validateDomain(domain);
  }, []);

  /**
   * 验证截图选项
   */
  const validateOptions = useCallback((options: ScreenshotOptions): boolean => {
    if (!controllerRef.current) return false;
    
    return controllerRef.current.validateOptions(options);
  }, []);

  /**
   * 获取默认选项
   */
  const getDefaultOptions = useCallback((): ScreenshotOptions => {
    if (!controllerRef.current) {
      return {
        width: SCREENSHOT_OPTIONS.defaultWidth,
        height: SCREENSHOT_OPTIONS.defaultHeight,
        fullPage: SCREENSHOT_OPTIONS.defaultFullPage,
        quality: SCREENSHOT_OPTIONS.defaultQuality
      };
    }
    
    return controllerRef.current.getDefaultOptions();
  }, []);

  /**
   * 清除历史记录
   */
  const clearCaptureHistory = useCallback(() => {
    if (!controllerRef.current) return;
    
    controllerRef.current.clearCaptureHistory();
    setCaptureHistory([]);
  }, []);

  /**
   * 获取设备预设
   */
  const getDevicePresets = useCallback(() => {
    if (!controllerRef.current) return DEVICE_PRESETS;
    
    return controllerRef.current.getDevicePresets();
  }, []);

  // 计算属性
  const hasData = data !== null;
  const hasError = error !== null;
  const hasHistory = captureHistory.length > 0;
  
  // 获取最新截图信息
  const latestCapture = captureHistory[0] || null;
  
  // 统计信息
  const captureStats = {
    total: captureHistory.length,
    today: captureHistory.filter(item => {
      const today = new Date();
      const itemDate = new Date(item.timestamp);
      return itemDate.toDateString() === today.toDateString();
    }).length,
    thisWeek: captureHistory.filter(item => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(item.timestamp) > weekAgo;
    }).length
  };

  // 设备类型统计
  const deviceStats = captureHistory.reduce((acc, item) => {
    const deviceType = item.options?.device || 'unknown';
    acc[deviceType] = (acc[deviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 平均截图时间
  const averageCaptureTime = captureHistory.length > 0 
    ? Math.round(captureHistory.reduce((sum, item) => sum + (item.captureTime || 0), 0) / captureHistory.length)
    : 0;

  return {
    // 状态数据
    data,
    loading,
    error,
    captureHistory,
    
    // 核心功能
    captureScreenshot,
    captureScreenshotDebounced,
    clearResults,
    
    // 工具功能
    downloadScreenshot,
    copyImageToClipboard,
    getImageSize,
    formatFileSize,
    validateDomain,
    validateOptions,
    getDefaultOptions,
    getDevicePresets,
    
    // 历史管理
    clearCaptureHistory,
    
    // 计算属性
    hasData,
    hasError,
    hasHistory,
    latestCapture,
    
    // 统计信息
    captureStats,
    deviceStats,
    averageCaptureTime,
    
    // 常量
    DEVICE_PRESETS,
    SCREENSHOT_OPTIONS
  };
}

export default useScreenshot;