'use client';

import { defaultConcurrencyManager } from './concurrency-manager';
import { defaultRequestManager } from './request-deduplication';
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

export type PerfWebVitals = Partial<{
  lcp: number;
  fcp: number;
  cls: number;
  ttfb: number;
}>;

export interface PerfSnapshot {
  timestamp: number;
  webVitals: PerfWebVitals | null;
  cpu?: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  } | null;
  concurrency?: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    currentConcurrency: number;
    queueSize: number;
    throughput: number;
    averageExecutionTime: number;
    errorRate: number;
  } | null;
  cache?: {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
    memoryUsage: number;
    evictions: number;
  } | null;
  alerts: Array<{ type: 'cpu' | 'memory' | 'render' | 'vitals' | 'concurrency' | 'cache'; message: string; level: 'good' | 'warning' | 'critical'; timestamp: number }>;
}

type Listener = (snap: PerfSnapshot) => void;

class PerfHub {
  private listeners = new Set<Listener>();
  private lastSnapshot: PerfSnapshot | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private latestVitals: PerfWebVitals | null = null;
  private vitalsInitialized = false;

  start(pollMs: number = 10000) {
    if (this.pollTimer) return;
    this.initVitals();
    this.collectOnce();
    this.pollTimer = setInterval(() => this.collectOnce(), pollMs);
  }

  stop() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    if (this.lastSnapshot) fn(this.lastSnapshot);
    return () => this.listeners.delete(fn);
  }

  getLast(): PerfSnapshot | null {
    return this.lastSnapshot;
  }

  private emit(snap: PerfSnapshot) {
    this.lastSnapshot = snap;
    this.listeners.forEach((fn) => fn(snap));
  }

  private getMemory(): PerfSnapshot['memory'] {
    if (typeof window === 'undefined') return null;
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
    const m = perf.memory;
    if (!m) return null;
    return {
      used: m.usedJSHeapSize,
      total: m.totalJSHeapSize,
      percentage: (m.usedJSHeapSize / m.totalJSHeapSize) * 100,
    };
  }

  private async getCPU(): Promise<number | undefined> {
    if (typeof window === 'undefined') return undefined;
    const start = performance.now();
    // micro work
    let x = 0;
    for (let i = 0; i < 50000; i++) x += i;
    const duration = performance.now() - start;
    return Math.min(100, (duration / 16.67) * 100);
  }

  private getConcurrency() {
    try {
      const m = defaultConcurrencyManager.getMetrics();
      return {
        totalTasks: m.totalTasks,
        completedTasks: m.completedTasks,
        failedTasks: m.failedTasks,
        currentConcurrency: m.currentConcurrency,
        queueSize: m.queueSize,
        throughput: m.throughput,
        averageExecutionTime: m.averageExecutionTime,
        errorRate: m.errorRate,
      };
    } catch {
      return null;
    }
  }

  private getCache() {
    try {
      const c = defaultRequestManager.getMetrics();
      return {
        hits: c.hits,
        misses: c.misses,
        hitRate: c.hitRate,
        totalRequests: c.totalRequests,
        cacheSize: c.cacheSize,
        memoryUsage: c.memoryUsage,
        evictions: c.evictions,
      };
    } catch {
      return null;
    }
  }

  private getWebVitals(): PerfWebVitals | null {
    // 首选内存中的最新值；回退到 localStorage（兼容旧来源）
    if (this.latestVitals && (this.latestVitals.lcp || this.latestVitals.fcp || this.latestVitals.cls || this.latestVitals.ttfb)) {
      return this.latestVitals;
    }
    try {
      const raw = localStorage.getItem('performance-metrics');
      if (!raw) return null;
      const list = JSON.parse(raw);
      const latest = Array.isArray(list) && list.length > 0 ? list[list.length - 1] : null;
      if (!latest) return null;
      const { lcp, fcp, cls, ttfb } = latest.webVitals || {};
      return { lcp, fcp, cls, ttfb };
    } catch {
      return null;
    }
  }

  // 轻量初始化 Web Vitals 采集
  private initVitals() {
    if (this.vitalsInitialized || typeof window === 'undefined') return;
    this.vitalsInitialized = true;
    try {
      const update = (key: keyof PerfWebVitals, value: number) => {
        this.latestVitals = { ...(this.latestVitals || {}), [key]: value };
        // 可选：保留最近记录到 localStorage，便于刷新后仍能读取
        try {
          const raw = localStorage.getItem('performance-metrics');
          const list = raw ? JSON.parse(raw) : [];
          const entry = { webVitals: this.latestVitals };
          const next = Array.isArray(list) ? [...list.slice(-9), entry] : [entry];
          localStorage.setItem('performance-metrics', JSON.stringify(next));
        } catch {}
      };
      onLCP((m) => update('lcp', m.value));
      onFCP((m) => update('fcp', m.value));
      onCLS((m) => update('cls', m.value));
      onTTFB((m) => update('ttfb', m.value));
    } catch {}
  }

  // Compute alerts locally based on the latest snapshot fields (no globals)
  private computeAlerts(base: Omit<PerfSnapshot, 'alerts'>): PerfSnapshot['alerts'] {
    const alerts: PerfSnapshot['alerts'] = [];
    const now = Date.now();
    // Memory thresholds
    if (base.memory) {
      const p = base.memory.percentage;
      if (p > 95) alerts.push({ type: 'memory', level: 'critical', message: `内存使用率过高: ${p.toFixed(1)}%`, timestamp: now });
      else if (p > 80) alerts.push({ type: 'memory', level: 'warning', message: `内存使用率较高: ${p.toFixed(1)}%`, timestamp: now });
    }
    // Concurrency error rate
    if (base.concurrency) {
      const er = base.concurrency.errorRate;
      if (er > 0.1) alerts.push({ type: 'concurrency', level: 'critical', message: `并发错误率过高: ${(er * 100).toFixed(1)}%`, timestamp: now });
      else if (er > 0.05) alerts.push({ type: 'concurrency', level: 'warning', message: `并发错误率偏高: ${(er * 100).toFixed(1)}%`, timestamp: now });
    }
    // Cache hit rate
    if (base.cache && base.cache.totalRequests > 10) {
      const hr = base.cache.hitRate;
      if (hr < 0.5) alerts.push({ type: 'cache', level: 'warning', message: `缓存命中率偏低: ${(hr * 100).toFixed(1)}%`, timestamp: now });
    }
    // Web Vitals
    if (base.webVitals) {
      const { lcp, fcp, cls, ttfb } = base.webVitals;
      if (typeof lcp === 'number' && lcp > 2500) alerts.push({ type: 'vitals', level: 'critical', message: `LCP 过高: ${lcp.toFixed(0)}ms`, timestamp: now });
      if (typeof fcp === 'number' && fcp > 1800) alerts.push({ type: 'vitals', level: 'warning', message: `FCP 较高: ${fcp.toFixed(0)}ms`, timestamp: now });
      if (typeof cls === 'number' && cls > 0.25) alerts.push({ type: 'vitals', level: 'critical', message: `CLS 过高: ${cls.toFixed(3)}`, timestamp: now });
      if (typeof ttfb === 'number' && ttfb > 800) alerts.push({ type: 'vitals', level: 'warning', message: `TTFB 较高: ${ttfb.toFixed(0)}ms`, timestamp: now });
    }
    // CPU usage
    if (typeof base.cpu === 'number') {
      const c = base.cpu;
      if (c > 95) alerts.push({ type: 'cpu', level: 'critical', message: `CPU 使用率过高: ${c.toFixed(1)}%`, timestamp: now });
      else if (c > 80) alerts.push({ type: 'cpu', level: 'warning', message: `CPU 使用率较高: ${c.toFixed(1)}%`, timestamp: now });
    }
    return alerts.slice(-10);
  }

  private async collectOnce() {
    const [cpu] = await Promise.all([ this.getCPU() ]);
    const base = {
      timestamp: Date.now(),
      webVitals: this.getWebVitals(),
      cpu: cpu,
      memory: this.getMemory(),
      concurrency: this.getConcurrency(),
      cache: this.getCache(),
    } as Omit<PerfSnapshot, 'alerts'>;
    const snap: PerfSnapshot = { ...base, alerts: this.computeAlerts(base) };
    this.emit(snap);
  }
}

export const perfHub = new PerfHub();

declare global {
  interface Window {
    __perfHub?: PerfHub;
  }
}

if (typeof window !== 'undefined') {
  window.__perfHub = perfHub;
}

export default perfHub;


