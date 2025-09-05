/**
 * 统一日志记录系统
 * 支持多级别日志、错误追踪、性能监控和用户行为分析
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  category: string;
  metadata?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface PerformanceLogEntry {
  timestamp: string;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

export interface UserActionLogEntry {
  timestamp: string;
  action: string;
  component: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private sessionId: string;
  private userId?: string;
  private logBuffer: LogEntry[] = [];
  private performanceBuffer: PerformanceLogEntry[] = [];
  private userActionBuffer: UserActionLogEntry[] = [];
  private maxBufferSize = 1000;
  private flushInterval = 30000; // 30秒
  private isClient = typeof window !== 'undefined';
  private isDev = process.env.NODE_ENV === 'development';
  private enableConsoleLogs = (process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGS || '0') === '1';
  private debugSample = this.isDev ? 1 : Math.min(Math.max(parseFloat(process.env.NEXT_PUBLIC_LOG_SAMPLE || '0.1'), 0), 1);
  private perfSample = this.isDev ? 1 : Math.min(Math.max(parseFloat(process.env.NEXT_PUBLIC_PERF_LOG_SAMPLE || '0.2'), 0), 1);
  private userSample = this.isDev ? 1 : Math.min(Math.max(parseFloat(process.env.NEXT_PUBLIC_USER_LOG_SAMPLE || '0.2'), 0), 1);

  private constructor() {
    this.sessionId = this.generateSessionId();
    // 读取日志级别环境变量
    const level = (process.env.NEXT_PUBLIC_LOG_LEVEL || '').toUpperCase();
    if (level in LogLevel) {
      // @ts-expect-error runtime enum lookup
      this.logLevel = LogLevel[level];
    }
    
    if (this.isClient) {
      // 设置定期刷新缓冲区
      setInterval(() => this.flushLogs(), this.flushInterval);
      
      // 页面卸载时刷新日志
      window.addEventListener('beforeunload', () => this.flushLogs());
      
      // 监听未捕获的错误
      window.addEventListener('error', (event) => {
        this.error('Uncaught Error', 'global', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      });
      
      // 监听未处理的Promise拒绝
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', 'global', {
          reason: event.reason,
          stack: event.reason?.stack
        });
      });
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    category: string,
    metadata?: Record<string, unknown>,
    stack?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      metadata,
      stack,
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.generateRequestId()
    };
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // 采样策略：生产环境对 DEBUG/INFO 进行抽样
    if (!this.isDev && (entry.level === LogLevel.DEBUG || entry.level === LogLevel.INFO)) {
      if (Math.random() > this.debugSample) return;
    }

    // 控制台输出（仅开发或强制开启）
    if ((this.isClient && (this.isDev || this.enableConsoleLogs)) || (!this.isClient && this.isDev)) {
      const levelName = LogLevel[entry.level];
      const style = this.getConsoleStyle(entry.level);
      
      console.group(`%c[${levelName}] ${entry.category}`, style);
      console.log(`%c${entry.message}`, 'color: #333; font-weight: normal;');
      
      if (entry.metadata) {
        console.log('Metadata:', entry.metadata);
      }
      
      if (entry.stack) {
        console.log('Stack:', entry.stack);
      }
      
      console.groupEnd();
    }

    // 添加到缓冲区
    this.logBuffer.push(entry);
    
    // 检查缓冲区大小
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushLogs();
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      [LogLevel.DEBUG]: 'color: #888; font-weight: bold;',
      [LogLevel.INFO]: 'color: #2196F3; font-weight: bold;',
      [LogLevel.WARN]: 'color: #FF9800; font-weight: bold;',
      [LogLevel.ERROR]: 'color: #F44336; font-weight: bold;',
      [LogLevel.FATAL]: 'color: #FFFFFF; background-color: #F44336; font-weight: bold; padding: 2px 4px;'
    };
    return styles[level] || styles[LogLevel.INFO];
  }

  public debug(message: string, category: string = 'general', metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, category, metadata);
    this.log(entry);
  }

  public info(message: string, category: string = 'general', metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, category, metadata);
    this.log(entry);
  }

  public warn(message: string, category: string = 'general', metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, category, metadata);
    this.log(entry);
  }

  public error(message: string, category: string = 'general', metadata?: Record<string, unknown>, error?: Error): void {
    const stack = error?.stack || new Error().stack;
    const entry = this.createLogEntry(LogLevel.ERROR, message, category, metadata, stack);
    this.log(entry);
  }

  public fatal(message: string, category: string = 'general', metadata?: Record<string, unknown>, error?: Error): void {
    const stack = error?.stack || new Error().stack;
    const entry = this.createLogEntry(LogLevel.FATAL, message, category, metadata, stack);
    this.log(entry);
  }

  // 性能日志
  public logPerformance(
    operation: string,
    duration: number,
    success: boolean = true,
    metadata?: Record<string, unknown>
  ): void {
    // 采样性能日志（生产环境）
    if (!this.isDev && Math.random() > this.perfSample) return;
    const entry: PerformanceLogEntry = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      success,
      metadata,
      requestId: this.generateRequestId()
    };

    this.performanceBuffer.push(entry);
    
    // 性能日志也输出到控制台（开发环境）
    if (this.isClient && process.env.NODE_ENV === 'development') {
      const color = success ? '#4CAF50' : '#F44336';
      console.log(
        `%c[PERF] ${operation}: ${duration}ms`,
        `color: ${color}; font-weight: bold;`,
        metadata
      );
    }

    if (this.performanceBuffer.length >= this.maxBufferSize) {
      this.flushPerformanceLogs();
    }
  }

  // 用户行为日志
  public logUserAction(
    action: string,
    component: string,
    metadata?: Record<string, unknown>
  ): void {
    // 采样用户行为日志（生产环境）
    if (!this.isDev && Math.random() > this.userSample) return;
    const entry: UserActionLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      component,
      metadata,
      userId: this.userId,
      sessionId: this.sessionId
    };

    this.userActionBuffer.push(entry);
    
    if (this.isClient && process.env.NODE_ENV === 'development') {
      console.log(
        `%c[USER] ${component}.${action}`,
        'color: #9C27B0; font-weight: bold;',
        metadata
      );
    }

    if (this.userActionBuffer.length >= this.maxBufferSize) {
      this.flushUserActionLogs();
    }
  }

  // 性能计时器
  public startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return (success: boolean = true, metadata?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      this.logPerformance(operation, duration, success, metadata);
    };
  }

  // 异步操作包装器
  public async measureAsync<T>(
    operation: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const timer = this.startTimer(operation);
    
    try {
      const result = await asyncFn();
      timer(true, { ...metadata, result: 'success' });
      return result;
    } catch (error) {
      timer(false, { 
        ...metadata, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  // 刷新日志到服务器或本地存储
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      if (this.isClient) {
        // 客户端：保存到本地存储
        const existingLogs = JSON.parse(localStorage.getItem('app_logs') || '[]');
        const allLogs = [...existingLogs, ...logs].slice(-5000); // 保留最近5000条
        localStorage.setItem('app_logs', JSON.stringify(allLogs));
      } else {
        // 服务端：可以发送到日志服务
        console.log('Flushing logs to server:', logs);
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // 失败时重新添加到缓冲区
      this.logBuffer.unshift(...logs);
    }
  }

  private async flushPerformanceLogs(): Promise<void> {
    if (this.performanceBuffer.length === 0) return;

    const logs = [...this.performanceBuffer];
    this.performanceBuffer = [];

    try {
      if (this.isClient) {
        const existingLogs = JSON.parse(localStorage.getItem('app_performance_logs') || '[]');
        const allLogs = [...existingLogs, ...logs].slice(-1000);
        localStorage.setItem('app_performance_logs', JSON.stringify(allLogs));
      }
    } catch (error) {
      console.error('Failed to flush performance logs:', error);
    }
  }

  private async flushUserActionLogs(): Promise<void> {
    if (this.userActionBuffer.length === 0) return;

    const logs = [...this.userActionBuffer];
    this.userActionBuffer = [];

    try {
      if (this.isClient) {
        const existingLogs = JSON.parse(localStorage.getItem('app_user_action_logs') || '[]');
        const allLogs = [...existingLogs, ...logs].slice(-2000);
        localStorage.setItem('app_user_action_logs', JSON.stringify(allLogs));
      }
    } catch (error) {
      console.error('Failed to flush user action logs:', error);
    }
  }

  // 获取日志统计
  public getLogStats(): {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    performanceIssues: number;
  } {
    const errorCount = this.logBuffer.filter(log => log.level >= LogLevel.ERROR).length;
    const warningCount = this.logBuffer.filter(log => log.level === LogLevel.WARN).length;
    const performanceIssues = this.performanceBuffer.filter(log => !log.success || log.duration > 1000).length;

    return {
      totalLogs: this.logBuffer.length,
      errorCount,
      warningCount,
      performanceIssues
    };
  }

  // 清理日志
  public clearLogs(): void {
    this.logBuffer = [];
    this.performanceBuffer = [];
    this.userActionBuffer = [];
    
    if (this.isClient) {
      localStorage.removeItem('app_logs');
      localStorage.removeItem('app_performance_logs');
      localStorage.removeItem('app_user_action_logs');
    }
  }

  // 兼容别名：userBehavior(action, componentOrMetadata?, maybeMetadata?)
  // 允许以下用法：
  // - logger.userBehavior('Action', 'Component', { ... })
  // - logger.userBehavior('Action', { ... })  // component 省略
  public userBehavior(
    action: string,
    componentOrMetadata?: string | Record<string, unknown>,
    maybeMetadata?: Record<string, unknown>
  ): void {
    if (typeof componentOrMetadata === 'string') {
      this.logUserAction(action, componentOrMetadata, maybeMetadata);
    } else {
      this.logUserAction(action, 'general', componentOrMetadata);
    }
  }
}

// 导出单例实例
export const logger = Logger.getInstance();

// 便捷的导出函数
export const log = {
  debug: (message: string, category?: string, metadata?: Record<string, unknown>) => 
    logger.debug(message, category, metadata),
  info: (message: string, category?: string, metadata?: Record<string, unknown>) => 
    logger.info(message, category, metadata),
  warn: (message: string, category?: string, metadata?: Record<string, unknown>) => 
    logger.warn(message, category, metadata),
  error: (message: string, category?: string, metadata?: Record<string, unknown>, error?: Error) => 
    logger.error(message, category, metadata, error),
  fatal: (message: string, category?: string, metadata?: Record<string, unknown>, error?: Error) => 
    logger.fatal(message, category, metadata, error),
  performance: (operation: string, duration: number, success?: boolean, metadata?: Record<string, unknown>) => 
    logger.logPerformance(operation, duration, success, metadata),
  userAction: (action: string, component: string, metadata?: Record<string, unknown>) => 
    logger.logUserAction(action, component, metadata),
  userBehavior: (
    action: string,
    componentOrMetadata?: string | Record<string, unknown>,
    maybeMetadata?: Record<string, unknown>
  ) => logger.userBehavior(action, componentOrMetadata as any, maybeMetadata),
  timer: (operation: string) => logger.startTimer(operation),
  measureAsync: <T>(operation: string, asyncFn: () => Promise<T>, metadata?: Record<string, unknown>) => 
    logger.measureAsync(operation, asyncFn, metadata)
};

export default logger;