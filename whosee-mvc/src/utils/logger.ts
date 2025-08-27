// 重新导出日志模块，保持向后兼容性
export {
  logger,
  LogLevel,
  Logger
} from '../lib/logger';

export type {
  LogEntry,
  PerformanceLogEntry,
  UserActionLogEntry,
  TimerLogEntry
} from '../lib/logger';