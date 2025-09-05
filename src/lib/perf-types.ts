export enum PerformanceLevel {
  GOOD = 'good',
  NEEDS_IMPROVEMENT = 'needs-improvement',
  POOR = 'poor'
}

export type PerformanceAlert = {
  type: 'cpu' | 'memory' | 'render' | 'vitals' | 'concurrency' | 'cache';
  level: PerformanceLevel;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
};

export interface PerformanceMetrics {
  cls?: number;
  fid?: number;
  fcp?: number;
  lcp?: number;
  ttfb?: number;
  cpuUsage?: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  concurrency?: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    currentConcurrency: number;
    queueSize: number;
    throughput: number;
    averageExecutionTime: number;
    errorRate: number;
  };
  cache?: {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
    memoryUsage: number;
    evictions: number;
  };
  timestamp: number;
}

export interface CPUUsageData {
  timestamp: number;
  usage: number;
  activeThreads: number;
  longTasks: Array<{ name: string; duration: number; startTime?: number; endTime?: number }>;
  heavyFunctions: Array<{ functionName?: string; avgTime?: number; callCount?: number; totalTime?: number }>;
}


