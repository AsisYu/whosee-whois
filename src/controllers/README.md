# src/controllers — 业务控制器（Controller）

- 负责：业务编排、去重与并发、重试与降级、错误与日志。
- 不做：UI 渲染与复杂 DOM 交互。

## 模式
- 单一领域控制器（Domain/DNS/Health/Screenshot）。
- 对外暴露简洁方法（如 `searchDomain`、`queryDNS`）。
- 组合 `lib/concurrency-manager`、`lib/request-deduplication`、`lib/error-handler`。

## 规范
- 严禁在控制器内直接操作 DOM；通过 hooks 将结果交给 View。
- 可注入服务/模型以利于测试（依赖注入）。
- 记录关键性能：吞吐、错误率、延迟（`lib/logger`）。

## Files
- `BaseController.ts`：控制器基类（校验/重试/订阅/日志）。
- `DomainController.ts`：域名搜索编排（缓存命中统计、历史、竞态防护）。
- `DNSController.ts`：DNS 查询编排（类型选择、批处理/去重）。
- `HealthController.ts`：系统健康状态编排（自动刷新、导出）。
- `ScreenshotController.ts`：网站截图编排（设备预设、参数组合）。
