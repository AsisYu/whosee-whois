# src/messages — 多语言文案（en/zh）

- 以页面/模块为命名空间：`domain.*`、`dns.*`、`health.*`、`screenshot.*`、`common.*`。
- 键名遵循层次结构：如 `results.basic.domain`、`search.placeholder`。
- 新页面/新组件必须同步补充 en 与 zh。

## 校验与缺失
- 运行期缺失键会抛出 `MISSING_MESSAGE`，请根据报错补齐两份语言文件。
- 避免在组件内硬编码 fallback 文案。

## Files
- `en.json`：英文文案源。
- `zh.json`：中文文案源。
