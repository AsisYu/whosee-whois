// 重新导出日志模块，保持向后兼容性
import { logger as loggerInstance, LogLevel } from '../lib/logger';
import type { LogEntry, PerformanceLogEntry, UserActionLogEntry } from '../lib/logger';

// 导出logger实例
export const logger = loggerInstance;
export const Logger = loggerInstance;
export { LogLevel };

// 导出类型
export type { LogEntry, PerformanceLogEntry, UserActionLogEntry };

// 导出默认logger实例
export default loggerInstance;