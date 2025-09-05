// 重新导出错误处理模块，保持向后兼容性
export {
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  PermissionError,
  BusinessLogicError,
  SystemError,
  ErrorCategory,
  ErrorSeverity,
  globalErrorHandler,
  errorRetryManager,
  createErrorContext,
  handleComponentError,
  handleAsyncError,
  initializeErrorHandling
} from '../lib/error-handler';

export type { ErrorContext } from '../lib/error-handler';