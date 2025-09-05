# src/models — 数据模型（Model）

- 负责：数据结构与校验、响应转换、轻量内存缓存。
- 不做：远程 IO（由 services 处理）。

## 规范
- 明确类型约束，与 `src/types` 对齐。
- 小缓存 + TTL（防止内存膨胀），注意上限与淘汰策略。
- 提供便捷方法：`getCacheStats/clearCache` 供诊断使用。

## Files
- `BaseModel.ts`：模型基类（订阅/状态/错误）。
- `DomainModel.ts`：域名数据与本地缓存。
- `DNSModel.ts`：DNS 记录聚合与转换。
- `HealthModel.ts`：健康状态聚合与转换。
- `ScreenshotModel.ts`：截图数据与元信息管理。
