import { logger } from './logger';
import { createErrorContext, globalErrorHandler, SystemError } from './error-handler';

// 并发控制配置
export interface ConcurrencyConfig {
  maxConcurrent: number;
  queueLimit: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableMetrics: boolean;
}

// 任务状态
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

// 任务接口
export interface Task<T = unknown> {
  id: string;
  operation: () => Promise<T>;
  priority: number;
  timeout?: number;
  retryAttempts?: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: TaskStatus;
  result?: T;
  error?: Error;
}

// 并发指标
export interface ConcurrencyMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  averageExecutionTime: number;
  currentConcurrency: number;
  queueSize: number;
  throughput: number; // 每秒完成的任务数
  errorRate: number;
}

// 并发管理器
export class ConcurrencyManager {
  private config: ConcurrencyConfig;
  private runningTasks = new Map<string, Task>();
  private taskQueue: Task[] = [];
  private completedTasks: Task[] = [];
  private metrics: ConcurrencyMetrics;
  private isRunning = false;
  private metricsInterval?: NodeJS.Timeout;
  private lastMetricsUpdate = Date.now();

  constructor(config: Partial<ConcurrencyConfig> = {}) {
    this.config = {
      maxConcurrent: 5,
      queueLimit: 100,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableMetrics: true,
      ...config
    };

    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      averageExecutionTime: 0,
      currentConcurrency: 0,
      queueSize: 0,
      throughput: 0,
      errorRate: 0
    };

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  // 添加任务
  public async addTask<T>(
    operation: () => Promise<T>,
    options: {
      priority?: number;
      timeout?: number;
      retryAttempts?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const task: Task<T> = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      priority: options.priority || 0,
      timeout: options.timeout || this.config.timeout,
      retryAttempts: options.retryAttempts ?? this.config.retryAttempts,
      metadata: options.metadata,
      createdAt: Date.now(),
      status: TaskStatus.PENDING
    };

    // 检查队列限制
    if (this.taskQueue.length >= this.config.queueLimit) {
      const error = new SystemError(
        'Task queue is full',
        createErrorContext('concurrency-manager', 'addTask', {
          queueSize: this.taskQueue.length,
          queueLimit: this.config.queueLimit,
          taskId: task.id
        }),
        false
      );
      
      globalErrorHandler.reportError(error, {}, true);
      throw error;
    }

    // 添加到队列
    this.taskQueue.push(task);
    this.metrics.totalTasks++;
    this.metrics.queueSize = this.taskQueue.length;

    // 按优先级排序（高优先级在前）
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    logger.debug(
      `Task added to queue: ${task.id}`,
      'concurrency-manager',
      {
        taskId: task.id,
        priority: task.priority,
        queueSize: this.taskQueue.length,
        runningTasks: this.runningTasks.size
      }
    );

    // 启动处理器
    if (!this.isRunning) {
      this.start();
    }

    // 返回Promise，等待任务完成
    return new Promise<T>((resolve, reject) => {
      const checkCompletion = () => {
        if (task.status === TaskStatus.COMPLETED) {
          resolve(task.result!);
        } else if (task.status === TaskStatus.FAILED) {
          reject(task.error!);
        } else if (task.status === TaskStatus.CANCELLED || task.status === TaskStatus.TIMEOUT) {
          reject(new Error(`Task ${task.status}: ${task.id}`));
        } else {
          // 继续等待
          setTimeout(checkCompletion, 100);
        }
      };
      
      checkCompletion();
    });
  }

  // 批量添加任务
  public async addBatchTasks<T>(
    operations: Array<() => Promise<T>>,
    options: {
      priority?: number;
      timeout?: number;
      retryAttempts?: number;
      metadata?: Record<string, unknown>;
      failFast?: boolean; // 是否在第一个失败时停止
    } = {}
  ): Promise<Array<T | Error>> {
    logger.info(
      `Adding batch of ${operations.length} tasks`,
      'concurrency-manager',
      { batchSize: operations.length, options }
    );

    const taskPromises = operations.map(operation => 
      this.addTask(operation, options).catch(error => error)
    );

    if (options.failFast) {
      // 快速失败模式
      return Promise.all(taskPromises);
    } else {
      // 等待所有任务完成
      return Promise.allSettled(taskPromises).then(results => 
        results.map(result => 
          result.status === 'fulfilled' ? result.value : result.reason
        )
      );
    }
  }

  // 启动并发处理器
  private start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('Concurrency manager started', 'concurrency-manager', {
      maxConcurrent: this.config.maxConcurrent,
      queueLimit: this.config.queueLimit
    });

    this.processQueue();
  }

  // 停止并发处理器
  public stop(): void {
    this.isRunning = false;
    
    // 取消所有等待中的任务
    this.taskQueue.forEach(task => {
      task.status = TaskStatus.CANCELLED;
      this.metrics.cancelledTasks++;
    });
    this.taskQueue = [];

    // 停止指标收集
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    logger.info('Concurrency manager stopped', 'concurrency-manager', {
      runningTasks: this.runningTasks.size,
      cancelledTasks: this.metrics.cancelledTasks
    });
  }

  // 处理任务队列
  private async processQueue(): Promise<void> {
    const processNextBatch = () => {
      if (!this.isRunning) {
        return;
      }

      // 检查是否可以启动新任务
      if (this.runningTasks.size < this.config.maxConcurrent && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        this.executeTask(task);
      }

      // 更新指标
      this.metrics.currentConcurrency = this.runningTasks.size;
      this.metrics.queueSize = this.taskQueue.length;

      // 只有在有任务需要处理时才继续循环
      if (this.taskQueue.length > 0 || this.runningTasks.size > 0) {
        setTimeout(processNextBatch, 50); // 增加延迟，减少CPU占用
      }
    };

    processNextBatch();
  }

  // 执行单个任务
  private async executeTask<T>(task: Task<T>): Promise<void> {
    task.status = TaskStatus.RUNNING;
    task.startedAt = Date.now();
    this.runningTasks.set(task.id, task);

    logger.debug(
      `Starting task execution: ${task.id}`,
      'concurrency-manager',
      {
        taskId: task.id,
        priority: task.priority,
        timeout: task.timeout,
        retryAttempts: task.retryAttempts
      }
    );

    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Task timeout after ${task.timeout}ms`));
        }, task.timeout);
      });

      // 执行任务
      const result = await Promise.race([
        this.executeWithRetry(task),
        timeoutPromise
      ]);

      task.result = result;
      task.status = TaskStatus.COMPLETED;
      task.completedAt = Date.now();
      this.metrics.completedTasks++;

      logger.debug(
        `Task completed successfully: ${task.id}`,
        'concurrency-manager',
        {
          taskId: task.id,
          executionTime: task.completedAt - task.startedAt!,
          result: typeof result
        }
      );

    } catch (error) {
      task.error = error instanceof Error ? error : new Error(String(error));
      task.status = error instanceof Error && error.message.includes('timeout') 
        ? TaskStatus.TIMEOUT 
        : TaskStatus.FAILED;
      task.completedAt = Date.now();
      this.metrics.failedTasks++;

      logger.error(
        `Task failed: ${task.id}`,
        'concurrency-manager',
        {
          taskId: task.id,
          executionTime: task.completedAt - task.startedAt!,
          error: task.error.message,
          status: task.status
        },
        task.error
      );

      // 报告错误
      globalErrorHandler.reportError(
        task.error,
        createErrorContext('concurrency-manager', 'executeTask', {
          taskId: task.id,
          metadata: task.metadata
        })
      );
    } finally {
      // 清理
      this.runningTasks.delete(task.id);
      this.completedTasks.push(task);
      
      // 限制完成任务历史记录大小
      if (this.completedTasks.length > 1000) {
        this.completedTasks = this.completedTasks.slice(-500);
      }
    }
  }

  // 带重试的任务执行
  private async executeWithRetry<T>(task: Task<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= task.retryAttempts!; attempt++) {
      try {
        return await task.operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < task.retryAttempts!) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          
          logger.warn(
            `Task retry ${attempt + 1}/${task.retryAttempts} for ${task.id}`,
            'concurrency-manager',
            {
              taskId: task.id,
              attempt: attempt + 1,
              delay,
              error: lastError.message
            }
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  // 启动指标收集
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000); // 每5秒更新一次指标
  }

  // 更新指标
  private updateMetrics(): void {
    const now = Date.now();
    const timeDiff = (now - this.lastMetricsUpdate) / 1000; // 秒
    
    // 计算平均执行时间
    const recentCompletedTasks = this.completedTasks.filter(
      task => task.completedAt && task.completedAt > this.lastMetricsUpdate
    );
    
    if (recentCompletedTasks.length > 0) {
      const totalExecutionTime = recentCompletedTasks.reduce(
        (sum, task) => sum + (task.completedAt! - task.startedAt!),
        0
      );
      this.metrics.averageExecutionTime = totalExecutionTime / recentCompletedTasks.length;
      
      // 计算吞吐量
      this.metrics.throughput = recentCompletedTasks.length / timeDiff;
    }
    
    // 计算错误率
    if (this.metrics.totalTasks > 0) {
      this.metrics.errorRate = this.metrics.failedTasks / this.metrics.totalTasks;
    }
    
    this.lastMetricsUpdate = now;
    
    // 记录指标
    logger.logPerformance(
      'concurrency-metrics',
      this.metrics.throughput,
      this.metrics.errorRate < 0.1,
      {
        totalTasks: this.metrics.totalTasks,
        completedTasks: this.metrics.completedTasks,
        failedTasks: this.metrics.failedTasks,
        currentConcurrency: this.metrics.currentConcurrency,
        queueSize: this.metrics.queueSize,
        throughput: this.metrics.throughput,
        errorRate: this.metrics.errorRate
      }
    );
  }

  // 获取当前指标
  public getMetrics(): ConcurrencyMetrics {
    return { ...this.metrics };
  }

  // 获取任务状态
  public getTaskStatus(taskId: string): TaskStatus | null {
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      return runningTask.status;
    }
    
    const completedTask = this.completedTasks.find(task => task.id === taskId);
    if (completedTask) {
      return completedTask.status;
    }
    
    const queuedTask = this.taskQueue.find(task => task.id === taskId);
    if (queuedTask) {
      return queuedTask.status;
    }
    
    return null;
  }

  // 取消任务
  public cancelTask(taskId: string): boolean {
    // 取消队列中的任务
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue[queueIndex];
      task.status = TaskStatus.CANCELLED;
      this.taskQueue.splice(queueIndex, 1);
      this.metrics.cancelledTasks++;
      this.metrics.queueSize = this.taskQueue.length;
      
      logger.info(`Task cancelled from queue: ${taskId}`, 'concurrency-manager');
      return true;
    }
    
    // 注意：正在运行的任务无法直接取消，因为JavaScript没有线程中断机制
    // 但可以标记为取消状态，由任务自己检查
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      logger.warn(
        `Cannot cancel running task: ${taskId}`,
        'concurrency-manager',
        { taskId }
      );
      return false;
    }
    
    return false;
  }

  // 清空队列
  public clearQueue(): number {
    const cancelledCount = this.taskQueue.length;
    
    this.taskQueue.forEach(task => {
      task.status = TaskStatus.CANCELLED;
    });
    
    this.taskQueue = [];
    this.metrics.cancelledTasks += cancelledCount;
    this.metrics.queueSize = 0;
    
    logger.info(
      `Queue cleared, cancelled ${cancelledCount} tasks`,
      'concurrency-manager',
      { cancelledCount }
    );
    
    return cancelledCount;
  }

  // 获取队列状态
  public getQueueStatus(): {
    queueSize: number;
    runningTasks: number;
    maxConcurrent: number;
    isRunning: boolean;
  } {
    return {
      queueSize: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      maxConcurrent: this.config.maxConcurrent,
      isRunning: this.isRunning
    };
  }
}

// 创建默认并发管理器实例
export const defaultConcurrencyManager = new ConcurrencyManager({
  maxConcurrent: 5,
  queueLimit: 100,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableMetrics: true
});

// 资源池管理器
export class ResourcePool<T> {
  private resources: T[] = [];
  private inUse = new Set<T>();
  private waitingQueue: Array<(resource: T) => void> = [];
  private factory: () => Promise<T>;
  private destroyer?: (resource: T) => Promise<void>;
  private maxSize: number;
  private minSize: number;

  constructor(
    factory: () => Promise<T>,
    options: {
      maxSize?: number;
      minSize?: number;
      destroyer?: (resource: T) => Promise<void>;
    } = {}
  ) {
    this.factory = factory;
    this.destroyer = options.destroyer;
    this.maxSize = options.maxSize || 10;
    this.minSize = options.minSize || 1;
    
    // 初始化最小资源
    this.initialize();
  }

  // 初始化资源池
  private async initialize(): Promise<void> {
    for (let i = 0; i < this.minSize; i++) {
      try {
        const resource = await this.factory();
        this.resources.push(resource);
      } catch (error) {
        logger.error(
          'Failed to initialize resource',
          'resource-pool',
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined
        );
      }
    }
    
    logger.info(
      `Resource pool initialized with ${this.resources.length} resources`,
      'resource-pool',
      { minSize: this.minSize, maxSize: this.maxSize }
    );
  }

  // 获取资源
  public async acquire(): Promise<T> {
    // 如果有可用资源，直接返回
    if (this.resources.length > 0) {
      const resource = this.resources.pop()!;
      this.inUse.add(resource);
      return resource;
    }
    
    // 如果还可以创建新资源，创建一个
    if (this.inUse.size < this.maxSize) {
      try {
        const resource = await this.factory();
        this.inUse.add(resource);
        return resource;
      } catch (error) {
        logger.error(
          'Failed to create new resource',
          'resource-pool',
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined
        );
        throw error;
      }
    }
    
    // 等待资源释放
    return new Promise<T>((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  // 释放资源
  public async release(resource: T): Promise<void> {
    if (!this.inUse.has(resource)) {
      logger.warn('Attempting to release resource not in use', 'resource-pool');
      return;
    }
    
    this.inUse.delete(resource);
    
    // 如果有等待的请求，直接分配
    if (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift()!;
      this.inUse.add(resource);
      resolve(resource);
      return;
    }
    
    // 如果资源池未满，放回池中
    if (this.resources.length < this.minSize) {
      this.resources.push(resource);
    } else {
      // 销毁多余的资源
      if (this.destroyer) {
        try {
          await this.destroyer(resource);
        } catch (error) {
          logger.error(
            'Failed to destroy resource',
            'resource-pool',
            { error: error instanceof Error ? error.message : String(error) },
            error instanceof Error ? error : undefined
          );
        }
      }
    }
  }

  // 获取池状态
  public getStatus(): {
    available: number;
    inUse: number;
    waiting: number;
    total: number;
  } {
    return {
      available: this.resources.length,
      inUse: this.inUse.size,
      waiting: this.waitingQueue.length,
      total: this.resources.length + this.inUse.size
    };
  }

  // 清理资源池
  public async cleanup(): Promise<void> {
    // 销毁所有可用资源
    if (this.destroyer) {
      await Promise.all(
        this.resources.map(resource => 
          this.destroyer!(resource).catch(error => 
            logger.error(
              'Error destroying resource during cleanup',
              'resource-pool',
              { error: error instanceof Error ? error.message : String(error) }
            )
          )
        )
      );
    }
    
    this.resources = [];
    this.waitingQueue = [];
    
    logger.info('Resource pool cleaned up', 'resource-pool');
  }
}

export default {
  ConcurrencyManager,
  ResourcePool,
  defaultConcurrencyManager,
  TaskStatus
};