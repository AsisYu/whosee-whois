# Whosee WHOIS — 高并发 · 高拓展 · 高性能 · 最佳体验

本仓库是 Whosee 域名信息查询前端（Next.js 15 / React 19 / TypeScript）。我们以「高并发、高拓展、高性能、最佳用户体验」为核心设计原则，采用 MVC 分层与约定式目录，内建国际化、并发与缓存治理、性能监控与降级能力。

## 核心理念
- 高并发：请求去重、批处理、限流/重试、Abort 超时与取消、并发管理器。
- 高拓展：严格 MVC 分层，稳定公共库（lib/），清晰类型（types/），独立功能模块（components/features、controllers、hooks、models、services）。
- 高性能：缓存（LRU+TTL）、SWR 策略、边缘与浏览器多层优化、按需渲染、监控与告警。
- 最佳体验：骨架屏/加载态、错误边界、可访问性、主题/多语言无缝切换、渐进式展示。

## 前端架构（MVC）
- Model（models/, types/）：数据结构、校验与缓存、转换。
- Controller（controllers/, hooks/）：业务编排、并发与副作用、容错重试。
- View（components/, app/）：纯渲染与交互，遵循 shadcn/ui 组合模式。

## 目录导航
- `src/app/`：Next.js App Router 页面与布局（含 `[locale]/` 国际化路由）。
- `src/components/`：UI 组件、提供者、性能面板、特性组件。
- `src/controllers/`：领域控制器（Domain/DNS/Health/Screenshot）。
- `src/hooks/`：与控制器协作的自定义 Hooks。
- `src/i18n/`：国际化配置（next-intl），路由与加载。
- `src/lib/`：并发/缓存/日志/错误/性能等基础库。
- `src/messages/`：多语言文案（en/zh）。
- `src/models/`：领域模型与内存缓存。
- `src/services/`：API 调用与 Token 管理、超时与取消。
- `src/types/`：公共类型定义。
- `public/`：静态资源。

## 开发规范（关键）
1) 严格 MVC：View 不写业务；Controller 不堆渲染；Model 不直接发请求（交由 services）。
2) TypeScript 严格模式：显式类型，避免 `any`；导出公共类型。
3) 组件模式：shadcn/ui 组合、受控/非受控一致、无副作用；使用 `cn()` 组织类名。
4) 国际化：所有用户可见文本走 `next-intl`，路径使用 `/${locale}` 前缀；缺失键及时补齐。
5) 并发与缓存：优先使用 `lib/request-deduplication` 与 `lib/concurrency-manager`；使用批处理与单飞(singleflight)。
6) 错误与降级：统一经 `lib/error-handler`；必要时使用 `ErrorBoundary`；提供可恢复提示与重试。
7) 监控与日志：通过 `lib/logger` 与性能面板观测；生产环境采样与分级落盘。

## 性能与并发策略（内置）
- 请求去重与缓存：LRU+TTL、命中率与内存上限（可配 env）。
- 并发调度：动态 tick，最大并发、队列长度、吞吐/错误率指标。
- 超时与取消：`AbortController` + 全链路超时与重试（指数退避）。
- 国际化路由：导航保留 locale，避免无谓重定向与闪烁。

## 环境变量（节选）
- `NEXT_PUBLIC_API_URL`：后端 API 基址（开发代理见 next.config.ts）。
- `NEXT_PUBLIC_MAX_CONCURRENCY` / `NEXT_PUBLIC_QUEUE_LIMIT`：并发与队列。
- `NEXT_PUBLIC_CACHE_MAX_SIZE` / `NEXT_PUBLIC_CACHE_MAX_MEMORY_MB` / `NEXT_PUBLIC_CACHE_DEFAULT_TTL_MS` / `NEXT_PUBLIC_CACHE_PERSIST`：缓存调优。
- `NEXT_PUBLIC_LOG_LEVEL` / `NEXT_PUBLIC_LOG_SAMPLE`：日志分级与采样。

## 快速开始
```bash
npm i
npm run dev
# 浏览器访问 http://localhost:3000/{en|zh}
```

## 质量与发布
- 开发阶段建议启用 React StrictMode 与本地 lint/type-check；CI/生产保持严格标准。
- 变更应覆盖：类型、国际化键、性能影响评估与降级策略说明。

更多分层细节与规范，请进入对应目录阅读各自 README。
