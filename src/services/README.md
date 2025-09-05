# src/services — 外部服务与 API 访问

- `ApiService`：统一封装 fetch、认证、错误、性能与取消。
- Token：单飞(singleflight)获取；尊重服务端 `expiresIn`；提前刷新与抖动。
- 超时：全链路超时（默认 30s）+ `AbortController` 取消。

## 规范
- service 只做 IO；不包含业务编排（交给 controllers/hooks）。
- 为所有请求添加分类日志与性能指标，便于观测。
- 遇到 401/403 自动清 Token 并上报。

## Files
- `ApiService.ts`：API 客户端、TokenManager、请求超时与取消。
