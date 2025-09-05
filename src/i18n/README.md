# src/i18n — 国际化（next-intl）

- `config.ts`：受支持语言与加载配置。
- `routing.ts`：`localePrefix: 'always'`，所有路由带语言前缀。
- `request.ts`：服务端加载 messages。

## 规范
- 页面/组件使用 `useTranslations('namespace')` 获取文案。
- 链接需保留当前 `locale`，如 `/${locale}/domain`。
- 缺失键会抛错，新增页面要同步补充 `messages/en.json` 与 `messages/zh.json`。

## Files
- `config.ts`：校验 locale、按需加载对应 `messages/*`。
- `routing.ts`：定义路由与本地化路径映射。
- `request.ts`：服务端请求时提供 locale 与 messages。
