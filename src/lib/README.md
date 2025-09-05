# src/lib — 基础设施库（Infra）

- 并发：`concurrency-manager`（最大并发、队列、吞吐/错误率、动态 tick）。
- 去重与缓存：`request-deduplication`（LRU+TTL、命中率、持久化可选）。
- 错误：`error-handler`（分类、重试、降级、上报）。
- 日志：`logger`（级别+采样，控制台/本地存储/服务端）。
- 性能：`perf-*`（指标采集、告警、面板订阅）。
- 工具：`utils.ts` 等。

## 使用建议
- 尽量通过这些库完成通用能力，避免分散实现。
- 生产环境开启采样，降低噪声与成本。
- 通过 env 调整缓存与并发阈值，按场景 tuning。

## Files
- `api.ts`：统一 API 分组（whois/dns/health/screenshot）。
- `api-error-handler.ts`：API 错误分类、重试与降级工具。
- `concurrency-manager.ts`：并发队列与任务调度、指标。
- `request-deduplication.ts`：请求去重与缓存（LRU+TTL）。
- `logger.ts`：分级 + 采样日志与性能计时。
- `error-handler.ts`：错误对象、全局处理与重试管理。
- `perf-hub.ts`/`perf-types.ts`：性能指标聚合与类型。
- `performance-*.ts`：性能监控、告警与集成。
- `cpu-monitor.ts`/`memory-monitor.ts`：资源消耗采集。
- `component-profiler.ts`：组件级渲染分析辅助。
- `utils.ts`：通用工具函数集合。
