# src/components — UI 组件与提供者（View）

- `ui/`：基础组件（shadcn/ui 风格），无副作用、可组合。
- `providers/`：主题、错误边界、系统初始化等 Provider。
- `performance/`：性能监控面板，仅开发或运维场景显示。
- `features/`：特性展示组件（如 DomainSearch/Info），仍保持纯 View。

## 规范
- Props 使用显式 TypeScript 接口，命名语义化。
- 组件无业务副作用；状态提升或交由 hooks/controller。
- 所有用户文案用 `useTranslations()`；严禁硬编码。
- 遵循 Tailwind 语义化类名顺序：布局→间距→样式→状态→响应式。

## Files
- `features/DomainSearch.tsx`：域名搜索输入与提交组件（纯 View）。
- `features/DomainInfo.tsx`：域名信息展示组件（纯 View）。
- `performance/performance-panel.tsx`：悬浮性能面板，订阅 perfHub 指标。
- `providers/error-boundary.tsx`：全局错误边界与降级 UI。
- `providers/system-initializer.tsx`：系统初始化（日志/性能/并发/缓存）。
- `providers/theme-provider.tsx`：主题（明/暗/系统）Provider。
- `ui/badge.tsx`：徽章组件。
- `ui/button.tsx`：按钮组件（variant/size）。
- `ui/card.tsx`：卡片容器（Header/Content/Footer）。
- `ui/checkbox.tsx`：复选框。
- `ui/dialog.tsx`：对话框。
- `ui/dropdown-menu.tsx`：下拉菜单。
- `ui/input.tsx`：输入框。
- `ui/language-toggle.tsx`：语言切换（保留 locale 前缀）。
- `ui/navbar.tsx`：导航栏（链接保留 locale）。
- `ui/navigation-menu.tsx`：导航菜单容器。
- `ui/separator.tsx`：分割线。
- `ui/tabs.tsx`：标签页。
- `ui/theme-toggle.tsx`：主题切换按钮。
