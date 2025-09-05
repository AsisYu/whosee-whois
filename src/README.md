# src/ — 前端源代码总览

本目录包含应用的全部前端代码，遵循 MVC 分层与高并发/高性能规范：

## 分层与职责
- `app/`（View 容器）
  - Next.js App Router 页面、布局与国际化路由（`[locale]/`）。
  - 仅做数据拉取与组件拼装，不承载业务复杂度。
- `components/`（View 组件）
  - shadcn/ui 基础组件与复合组件、Provider、性能面板。
  - 纯渲染，可复用、可测试、无副作用。
- `controllers/`（Controller）
  - 业务编排、并发/缓存/重试/降级；与 hooks 搭配输出给页面。
- `hooks/`（Controller Hooks）
  - 包装控制器并维护页面状态，提供简单 API 给 View。
- `models/`（Model）
  - 领域对象、数据校验与转换、轻量内存缓存。
- `services/`（IO）
  - API 调用、Token 管理、超时取消、错误分类。
- `lib/`（基础设施）
  - 并发/缓存/日志/错误/性能/工具集，跨域复用。
- `i18n/`（国际化）
  - next-intl 配置、路由与消息加载。
- `messages/`（文案）
  - en/zh 文案，按照功能命名空间分组。
- `types/`（类型）
  - 全局/领域类型定义，跨层共享。
- `views/`（可选）
  - 高层展示封装（若项目需要）。

## 高并发/高性能要点
- 请求去重与缓存（`lib/request-deduplication`），LRU+TTL，可通过 env 调优。
- 并发调度（`lib/concurrency-manager`），动态 tick、吞吐与错误率指标。
- 超时与取消（`AbortController`）与指数退避重试。
- 性能观察（`components/performance/performance-panel` + `lib/perf-*`）。
- 错误边界（`components/providers/error-boundary`）与降级策略。

## 开发规范
1. View 只渲染；业务放到 Controller/Hook；数据定义在 Model/Types。
2. 所有用户可见文本走 `useTranslations()`；补全 `messages/*` 文案键。
3. 组件遵循 shadcn/ui 模式：可组合、可测、无副作用。
4. 优先使用库内并发/缓存/日志工具，避免重复造轮子。
5. 提交前自检：类型、文案、性能影响与降级说明。

## Files
- `app/layout.tsx`：根布局（主题/错误边界/性能面板/全局样式）。
- `app/[locale]/layout.tsx`：按语言的页面布局与 i18n Provider。
- `app/[locale]/page.tsx`：首页（多语言）。
- `app/[locale]/domain/page.tsx`：域名查询页。
- `app/[locale]/dns/page.tsx`：DNS 查询页。
- `app/[locale]/health/page.tsx`：系统健康页。
- `app/[locale]/screenshot/page.tsx`：网站截图页。
- `app/not-found.tsx`：404 页面。
- `app/globals.css`：全局样式与设计变量。
- 其余目录请参阅各自 README。


