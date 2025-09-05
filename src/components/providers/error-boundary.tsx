'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || 'unknown';
    
    // 记录详细的错误信息
    logger.error(
      `React Error Boundary caught error: ${error.message}`,
      'error-boundary',
      {
        errorId,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.retryCount,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      },
      error
    );

    // 调用自定义错误处理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 更新状态
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      
      logger.info(
        `Retrying after error (attempt ${this.retryCount}/${this.maxRetries})`,
        'error-boundary',
        { errorId: this.state.errorId }
      );
      
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    } else {
      logger.warn(
        'Maximum retry attempts reached',
        'error-boundary',
        { errorId: this.state.errorId, maxRetries: this.maxRetries }
      );
    }
  };

  handleReload = () => {
    logger.info(
      'User triggered page reload after error',
      'error-boundary',
      { errorId: this.state.errorId }
    );
    
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误UI
      return <ErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        canRetry={this.retryCount < this.maxRetries}
        onRetry={this.handleRetry}
        onReload={this.handleReload}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  canRetry: boolean;
  onRetry: () => void;
  onReload: () => void;
}

function ErrorFallback({ 
  error, 
  errorInfo, 
  errorId, 
  canRetry, 
  onRetry, 
  onReload 
}: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">出现了一个错误</CardTitle>
          </div>
          <CardDescription>
            应用程序遇到了意外错误。我们已经记录了这个问题，正在努力修复。
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 错误ID */}
          {errorId && (
            <div className="text-sm text-muted-foreground">
              <strong>错误ID:</strong> {errorId}
            </div>
          )}

          {/* 开发环境显示详细错误信息 */}
          {isDevelopment && error && (
            <div className="space-y-2">
              <details className="bg-muted p-3 rounded-md">
                <summary className="cursor-pointer font-medium text-sm">
                  错误详情 (开发模式)
                </summary>
                <div className="mt-2 space-y-2 text-xs font-mono">
                  <div>
                    <strong>错误:</strong> {error.name}: {error.message}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>堆栈:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-xs">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>组件堆栈:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-xs">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            {canRetry && (
              <Button onClick={onRetry} variant="default" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </Button>
            )}
            
            <Button onClick={onReload} variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新页面
            </Button>
            
            <Button 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }} 
              variant="outline" 
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </div>

          {/* 用户反馈提示 */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">帮助我们改进</p>
            <p>
              如果这个问题持续出现，请联系技术支持并提供错误ID: <code className="bg-background px-1 rounded">{errorId}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook版本的错误边界
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    logger.error(
      `Manual error report: ${error.message}`,
      'error-handler',
      {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString()
      },
      error
    );
  };
}

// 高阶组件版本
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundary;