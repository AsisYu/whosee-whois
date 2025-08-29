# src/hooks — 自定义 Hooks（Controller Hooks）

- 包装控制器方法，维护页面所需的最小状态。
- 提供：loading/error/data 与操作函数。
- 实现：防抖/节流、竞态规避、取消与重试、渐进式加载。

## 规范
- Hook 内不做 UI；返回的数据/方法命名清晰。
- 与 `controllers/*` 配合，避免重复并发与重复请求。
- 使用 `AbortController`/标记位避免过期结果覆盖。

## Files
- `useDomain.ts`：域名搜索状态与动作，调用 `DomainController`。
- `useDNS.ts`：DNS 查询状态与动作、记录分组，调用 `DNSController`。
- `useHealth.ts`：健康状态查询、自动刷新与导出，调用 `HealthController`。
- `useScreenshot.ts`：截图参数与获取、历史与下载复制，调用 `ScreenshotController`。
