import { BaseController } from './BaseController';
import { ScreenshotModel } from '@/models/ScreenshotModel';
import { ScreenshotOptions, ScreenshotResult } from '@/types';
import { resourceManager } from '@/utils/concurrencyManager';

/**
 * Screenshot Controller - 处理网站截图业务逻辑
 * 负责截图请求、参数验证、历史管理等功能
 */
export class ScreenshotController extends BaseController<ScreenshotResult> {
  private screenshotModel: ScreenshotModel;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly debounceDelay = 500; // 500ms防抖延迟
  private performanceMetrics = {
    captureCount: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    lastCaptureTime: null as Date | null,
    deviceTypeStats: new Map<string, number>(),
    errorCount: 0
  };

  constructor() {
    const model = new ScreenshotModel();
    super(model as BaseModel<ScreenshotData>); // 类型转换，确保ScreenshotModel兼容BaseModel接口
    this.screenshotModel = model;
    
    // 注册资源清理回调
    resourceManager.registerCleanupCallback(() => {
      this.logPerformanceMetrics();
    });
  }

  /**
   * 执行截图操作
   */
  async execute(domain: string, options?: ScreenshotOptions): Promise<void> {
    await this.captureScreenshot(domain, options);
  }

  /**
   * 截图网站（优化版本）
   */
  async captureScreenshot(domain: string, options?: ScreenshotOptions): Promise<ScreenshotResult | null> {
    const startTime = Date.now();
    const deviceType = options?.device || 'desktop';
    
    // 验证域名
    if (!this.validateDomain(domain)) {
      this.setError('域名格式不正确');
      return null;
    }

    return await this.handleAsyncOperationWithRetry(
      async () => {
        // 检查内存使用情况
        const memoryBefore = resourceManager.getMemoryUsage();
        
        const result = await this.screenshotModel.captureScreenshot(domain, options);
        
        const responseTime = Date.now() - startTime;
        const memoryAfter = resourceManager.getMemoryUsage();
        
        this.updatePerformanceMetrics(responseTime, deviceType, false);
        
        return result;
      },
      `网站截图-${domain}`,
      {
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 5000
      },
      (result) => {
        // 截图成功的回调 - 已在基类中记录日志
        if (result) {
          // 添加到历史记录
          this.screenshotModel.addToHistory(result);
        }
      },
      (error) => {
        // 截图失败的回调 - 已在基类中记录日志和错误处理
        const responseTime = Date.now() - startTime;
        this.updatePerformanceMetrics(responseTime, deviceType, true);
        this.setError(error.message);
      }
    );
  }

  /**
   * 设置错误信息
   */
  private setError(message: string): void {
    // 通过模型设置错误
    (this.screenshotModel as ScreenshotModel & { setError?: (message: string) => void }).setError?.(message);
  }

  /**
   * 防抖截图
   */
  captureScreenshotDebounced(domain: string, options?: ScreenshotOptions, delay: number = 500): Promise<ScreenshotResult | null> {
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(async () => {
        const result = await this.captureScreenshot(domain, options);
        resolve(result);
      }, delay);
    });
  }

  /**
   * 获取截图历史
   */
  getCaptureHistory(): ScreenshotResult[] {
    return this.screenshotModel.getHistory();
  }

  /**
   * 清除截图历史
   */
  clearCaptureHistory(): void {
    this.screenshotModel.clearHistory();
  }

  /**
   * 下载截图
   */
  downloadScreenshot(imageData: string, filename?: string): void {
    this.handleAsyncOperation(
      () => {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = imageData;
        link.download = filename || `screenshot-${Date.now()}.png`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return Promise.resolve();
      },
      '下载截图',
      () => {
        // 下载成功的回调 - 已在基类中记录日志
      },
      (error) => {
        // 下载失败的回调 - 已在基类中记录日志和错误处理
        throw new Error('截图下载失败');
      }
    );
  }

  /**
   * 复制图片到剪贴板
   */
  async copyImageToClipboard(imageData: string): Promise<void> {
    await this.handleAsyncOperation(
      async () => {
        // 将base64转换为blob
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // 复制到剪贴板
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
      },
      '复制图片到剪贴板',
      () => {
        // 复制成功的回调 - 已在基类中记录日志
      },
      (error) => {
        // 复制失败的回调 - 已在基类中记录日志和错误处理
        throw new Error('复制图片到剪贴板失败');
      }
    );
  }

  /**
   * 获取图片大小（字节）
   */
  getImageSize(imageData: string): number {
    try {
      // 计算base64数据的实际大小
      const base64Data = imageData.split(',')[1] || imageData;
      const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
      return Math.floor((base64Data.length * 3) / 4) - padding;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 验证域名格式
   */
  validateDomain(domain: string): boolean {
    if (!domain || typeof domain !== 'string') {
      return false;
    }

    // 移除协议前缀
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    // 基本域名格式验证
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))*$/;
    
    return domainRegex.test(cleanDomain) && cleanDomain.length <= 253;
  }

  /**
   * 获取设备预设
   */
  getDevicePresets() {
    return [
      { name: 'Desktop HD', width: 1920, height: 1080, type: 'desktop' },
      { name: 'Desktop', width: 1366, height: 768, type: 'desktop' },
      { name: 'Laptop', width: 1280, height: 800, type: 'desktop' },
      { name: 'Tablet', width: 768, height: 1024, type: 'tablet' },
      { name: 'Mobile L', width: 414, height: 896, type: 'mobile' },
      { name: 'Mobile M', width: 375, height: 667, type: 'mobile' },
      { name: 'Mobile S', width: 320, height: 568, type: 'mobile' }
    ];
  }

  /**
   * 获取截图选项默认值
   */
  getDefaultOptions(): ScreenshotOptions {
    return {
      width: 1920,
      height: 1080,
      fullPage: false,
      quality: 80,
      device: 'Desktop HD'
    };
  }

  /**
   * 验证截图选项
   */
  validateOptions(options: ScreenshotOptions): boolean {
    if (!options) return false;
    
    // 验证尺寸
    if (options.width && (options.width < 320 || options.width > 3840)) {
      return false;
    }
    
    if (options.height && (options.height < 240 || options.height > 2160)) {
      return false;
    }
    
    // 验证质量
    if (options.quality && (options.quality < 10 || options.quality > 100)) {
      return false;
    }
    
    return true;
  }

  /**
   * 记录性能指标
   */
  private logPerformanceMetrics(): void {
    console.log('Screenshot Controller Performance Metrics:', {
      captureCount: this.performanceMetrics.captureCount,
      cacheHits: this.performanceMetrics.cacheHits,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      deviceTypeStats: Object.fromEntries(this.performanceMetrics.deviceTypeStats),
      errorCount: this.performanceMetrics.errorCount,
      lastCaptureTime: this.performanceMetrics.lastCaptureTime
    });
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(responseTime: number, deviceType?: string, isError: boolean = false): void {
    this.performanceMetrics.captureCount++;
    this.performanceMetrics.totalResponseTime += responseTime;
    this.performanceMetrics.averageResponseTime = this.performanceMetrics.totalResponseTime / this.performanceMetrics.captureCount;
    this.performanceMetrics.lastCaptureTime = new Date();
    
    if (deviceType) {
      const currentCount = this.performanceMetrics.deviceTypeStats.get(deviceType) || 0;
      this.performanceMetrics.deviceTypeStats.set(deviceType, currentCount + 1);
    }
    
    if (isError) {
      this.performanceMetrics.errorCount++;
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      deviceTypeStats: Object.fromEntries(this.performanceMetrics.deviceTypeStats)
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.logPerformanceMetrics();
    super.cleanup();
  }
}