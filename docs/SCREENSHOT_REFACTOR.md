# 截图服务重构架构文档

**文档版本**: 2.0
**最后更新**: 2025-12-04
**重构完成**: 2025-01-20
**P2-3启用**: 2025-12-04

---

## 概述

本文档详细说明了Whosee WHOIS后端服务中截图功能的完整重构架构。重构的目标是提供统一、高效、可扩展的截图服务，同时保持向后兼容性。

**重构状态**: P2-3修复已完成，统一截图架构现已全面启用

---

## 架构设计

### 设计目标

1. **统一API**: 所有截图类型通过单一端点访问
2. **资源复用**: Chrome实例池化，避免重复启动
3. **智能并发**: 并发槽位控制，防止资源耗尽
4. **故障隔离**: 熔断器保护，自动故障恢复
5. **向后兼容**: 保留所有legacy端点，客户端无需修改
6. **安全加固**: 域名验证、文件名清理、URL安全检查

### 核心组件

```
┌──────────────────────────────────────────────────────┐
│                   截图服务架构                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────┐       ┌──────────────────┐    │
│  │  客户端请求     │──────>│  Unified API     │    │
│  │  (统一/Legacy)  │       │  /screenshot/    │    │
│  └─────────────────┘       └────────┬─────────┘    │
│                                     │              │
│                                     v              │
│  ┌──────────────────────────────────────────────┐  │
│  │        ScreenshotService                    │  │
│  │  - 请求验证和参数标准化                      │  │
│  │  - 缓存管理 (Redis)                         │  │
│  │  - 截图类型路由                             │  │
│  │  - 错误处理和响应构建                       │  │
│  └────────────────┬─────────────────────────────┘  │
│                   │                                │
│                   v                                │
│  ┌──────────────────────────────────────────────┐  │
│  │        ChromeManager                        │  │
│  │  - Chrome实例池管理 (max 3 slots)          │  │
│  │  - 熔断器保护                               │  │
│  │  - 健康检查和自动恢复                       │  │
│  │  - 三种运行模式 (cold/warm/auto)           │  │
│  └────────────────┬─────────────────────────────┘  │
│                   │                                │
│                   v                                │
│  ┌──────────────────────────────────────────────┐  │
│  │       Chrome Browser Instances              │  │
│  │  - chromedp上下文管理                       │  │
│  │  - 页面导航和渲染                           │  │
│  │  - 元素选择和截图捕获                       │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 组件详解

### 1. ScreenshotService

**位置**: `services/screenshot_service.go`

**职责**:
- 请求验证（域名格式、URL安全性）
- 参数标准化和类型转换
- Redis缓存管理（TTL限制保护）
- 截图类型路由（basic/element/itdog_*)
- 错误处理和响应构建
- 输出格式转换（file/base64）

**支持的截图类型**:

| 类型 | 说明 | 典型用途 |
|------|------|----------|
| `basic` | 完整页面截图 | 网站首页快照 |
| `element` | 特定元素截图 | 精确捕获页面元素 |
| `itdog_map` | ITDog性能地图 | 全国节点分布图 |
| `itdog_table` | ITDog结果表格 | 测试结果详细数据 |
| `itdog_ip` | ITDog IP统计 | IP地址统计信息 |
| `itdog_resolve` | ITDog综合测速 | 全国DNS解析速度 |

**配置结构**:

```go
type ScreenshotServiceConfig struct {
    CacheExpiration  time.Duration  // 默认缓存TTL (24小时)
    Timeout          time.Duration  // 截图超时 (30秒)
    ViewportWidth    int            // 视口宽度 (1920)
    ViewportHeight   int            // 视口高度 (1080)
    Quality          int            // JPEG质量 (90)
    WaitTime         time.Duration  // 页面加载等待时间
    UserAgent        string         // 自定义User-Agent
}
```

**缓存TTL保护** (P2-2修复):
```go
const MaxUserCacheExpireHours = 72 // 最多3天

// 用户指定的cache_expire会被限制在[1分钟, 72小时]范围内
// 防止DoS攻击导致Redis内存耗尽
```

---

### 2. ChromeManager

**位置**: `services/chrome_manager.go`

**职责**:
- Chrome实例生命周期管理
- 并发槽位控制（最多3个并发截图）
- 熔断器保护（自动故障恢复）
- 健康检查（周期性实例验证）
- 三种运行模式的智能切换

**并发槽位控制**:

```go
// 最多3个并发截图任务
type ChromeManager struct {
    semaphore chan struct{}  // buffered channel (size=3)
    // ...
}

// 获取槽位（阻塞直到有空闲槽位）
func (cm *ChromeManager) acquireSlot() {
    cm.semaphore <- struct{}{}
}

// 释放槽位
func (cm *ChromeManager) releaseSlot() {
    <-cm.semaphore
}
```

**熔断器状态机**:

```
         ┌──────────┐
         │  Closed  │ (正常工作)
         │ (关闭)   │
         └────┬─────┘
              │
    失败次数达到阈值
              │
              v
         ┌──────────┐
         │   Open   │ (停止服务)
         │ (打开)   │
         └────┬─────┘
              │
        超时时间后
              │
              v
         ┌──────────┐
         │Half-Open │ (试探恢复)
         │ (半开)   │
         └──────────┘
              │
       成功 │      │ 失败
            │      │
            v      v
        Closed   Open
```

**三种运行模式**:

| 模式 | Chrome启动 | 资源占用 | 响应速度 | 适用场景 |
|------|-----------|---------|---------|---------|
| **cold** | 每次重新启动 | 最低 (~50MB) | 慢 (2-3秒) | 极少使用截图 |
| **warm** | 保持运行 | 高 (~500MB) | 快 (<500ms) | 频繁使用截图 |
| **auto** | 智能管理 | 中等 | 中等 | 推荐（默认） |

**auto模式特性**:
- 首次请求时启动Chrome
- 空闲5分钟后自动关闭
- 再次请求时重新启动
- 最适合WHOIS主业务 + 偶尔截图的场景

**环境变量配置**:
```bash
CHROME_MODE=auto  # auto (默认), cold, warm
```

---

### 3. 统一API设计

#### 新版统一接口

**端点**: `POST /api/v1/screenshot/`

**请求格式**:

```json
{
  "type": "basic|element|itdog_map|itdog_table|itdog_ip|itdog_resolve",
  "domain": "example.com",
  "url": "https://example.com",  // 可选，优先级高于domain
  "format": "file|base64",         // 默认file
  "cache_expire": 24,              // 缓存TTL（小时），限制在[1分钟, 72小时]

  // element类型专用参数
  "selector": "#header",
  "selector_type": "css|xpath",

  // 通用参数
  "viewport_width": 1920,
  "viewport_height": 1080,
  "wait_time": 3000  // 毫秒
}
```

**响应格式**:

```json
{
  "success": true,
  "data": {
    "type": "basic",
    "domain": "example.com",
    "url": "https://example.com",
    "format": "file",
    "file_url": "/static/screenshots/example_com_1234567890.png",
    "base64": "",  // 仅当format=base64时存在
    "timestamp": "2025-12-04T10:30:00Z",
    "cached": false,
    "metadata": {
      "viewport_width": 1920,
      "viewport_height": 1080,
      "file_size": 245678,
      "mime_type": "image/png"
    }
  },
  "message": "Screenshot captured successfully"
}
```

**错误响应**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DOMAIN",
    "message": "Invalid domain format",
    "details": "Domain must not contain path or query parameters"
  }
}
```

#### Chrome管理API

**1. 状态检查**

```bash
GET /api/v1/screenshot/chrome/status

# 响应
{
  "running": true,
  "mode": "auto",
  "uptime": "2h35m",
  "requests_handled": 142,
  "circuit_breaker_state": "closed",
  "available_slots": 2,
  "total_slots": 3
}
```

**2. 重启Chrome**

```bash
POST /api/v1/screenshot/chrome/restart

# 响应
{
  "success": true,
  "message": "Chrome restarted successfully",
  "new_pid": 12345
}
```

---

### 4. Legacy兼容接口

**保留的端点**（保持100%向后兼容）:

```bash
# 基础截图
GET /api/v1/screenshot/:domain
GET /api/v1/screenshot

# Base64截图
GET /api/v1/screenshot/base64/:domain

# 元素截图
POST /api/v1/screenshot/element
POST /api/v1/screenshot/element/base64

# ITDog截图
GET /api/v1/itdog/:domain
GET /api/v1/itdog/base64/:domain
GET /api/v1/itdog/table/:domain
GET /api/v1/itdog/table/base64/:domain
GET /api/v1/itdog/ip/:domain
GET /api/v1/itdog/ip/base64/:domain
GET /api/v1/itdog/resolve/:domain
GET /api/v1/itdog/resolve/base64/:domain
```

**兼容性保证**:
- URL路径不变
- 请求参数不变
- 响应格式不变
- 所有legacy端点内部调用统一的ScreenshotService

---

## 中间件链

截图路由经过完整的安全中间件保护（P2-3修复后启用）:

```
客户端请求
    │
    ↓
[JWT认证中间件]
    │ (验证Bearer token + IP绑定)
    ↓
[IP白名单中间件]
    │ (检查IP或API Key)
    ↓
[域名验证中间件]
    │ (验证域名格式和安全性)
    ↓
[限流中间件]
    │ (Redis分布式限流)
    ↓
[异步Worker中间件]
    │ (120秒超时，worker pool调度)
    ↓
[截图Handler]
    │
    ↓
ScreenshotService
    │
    ↓
ChromeManager
    │
    ↓
Chrome Browser
```

**关键修复** (P2-3):
- 中间件必须在路由注册之前应用
- Gin的`Use()`只影响之后注册的路由
- 修复前：middleware在routes后添加，完全不执行
- 修复后：middleware在routes前添加，正确保护所有端点

---

## 安全特性

### 1. 域名验证

```go
func ValidateDomain(domain string) error {
    // 检查空值
    if domain == "" {
        return errors.New("domain cannot be empty")
    }

    // 检查长度限制
    if len(domain) > 253 {
        return errors.New("domain too long")
    }

    // 检查非法字符
    if containsInvalidChars(domain) {
        return errors.New("domain contains invalid characters")
    }

    // 检查路径和查询参数
    if strings.Contains(domain, "/") || strings.Contains(domain, "?") {
        return errors.New("domain should not contain path or query")
    }

    return nil
}
```

### 2. URL安全检查

```go
func ValidateURL(url string) error {
    parsed, err := url.Parse(url)
    if err != nil {
        return err
    }

    // 只允许http/https
    if parsed.Scheme != "http" && parsed.Scheme != "https" {
        return errors.New("only http/https schemes allowed")
    }

    // 阻止本地地址（SSRF防护）
    if isLocalAddress(parsed.Host) {
        return errors.New("local addresses not allowed")
    }

    return nil
}
```

### 3. 文件名清理

```go
func SanitizeFilename(filename string) string {
    // 移除所有路径分隔符
    filename = strings.ReplaceAll(filename, "/", "_")
    filename = strings.ReplaceAll(filename, "\\", "_")

    // 移除特殊字符
    reg := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
    filename = reg.ReplaceAllString(filename, "_")

    // 限制长度
    if len(filename) > 255 {
        filename = filename[:255]
    }

    return filename
}
```

### 4. 缓存TTL保护 (P2-2)

```go
const MaxUserCacheExpireHours = 72

func ClampCacheTTL(hours int) time.Duration {
    if hours <= 0 {
        return 24 * time.Hour  // 默认24小时
    }

    // 上限保护
    if hours > MaxUserCacheExpireHours {
        log.Printf("[Security] Cache TTL %dh exceeds max, clamping to %dh",
            hours, MaxUserCacheExpireHours)
        hours = MaxUserCacheExpireHours
    }

    // 下限保护
    duration := time.Duration(hours) * time.Hour
    if duration < time.Minute {
        log.Printf("[Security] Cache TTL too small, setting to 1 minute")
        duration = time.Minute
    }

    return duration
}
```

---

## 性能优化

### 1. Chrome实例复用

**重构前**:
- 每次请求启动新Chrome进程
- 启动耗时: 2-3秒
- 内存峰值: 每个进程500MB
- 并发10个请求 = 5GB内存

**重构后**:
- 实例池复用（warm/auto模式）
- 启动耗时: 首次2-3秒，后续<500ms
- 内存稳定: 500MB左右
- 并发10个请求 = 排队执行，稳定500MB

**性能提升**: 响应速度4-6倍，内存占用降低90%

### 2. 并发槽位控制

```go
// 最多3个并发截图任务
semaphore := make(chan struct{}, 3)

// 防止资源耗尽
func takeScreenshot() {
    semaphore <- struct{}{}        // 获取槽位（可能阻塞）
    defer func() { <-semaphore }() // 释放槽位

    // 执行截图...
}
```

**效果**:
- 防止Chrome进程爆炸
- CPU使用平滑
- 内存占用可控
- 请求排队而非拒绝

### 3. 智能缓存

**缓存键设计**:
```
screenshot:{type}:{domain_or_url_hash}
```

**TTL策略**:
- 默认: 24小时
- 用户可配置: 1分钟 - 72小时
- 基于内容类型自适应

**缓存命中率**:
- 相同domain/url的重复请求直接返回
- 减少Chrome负载
- 降低响应延迟

---

## 监控与健康检查

### 1. Chrome健康检查

```go
func (cm *ChromeManager) HealthCheck() error {
    // 检查Chrome进程是否存活
    if !cm.isRunning() {
        return errors.New("Chrome not running")
    }

    // 检查熔断器状态
    if cm.circuitBreaker.IsOpen() {
        return errors.New("Circuit breaker open")
    }

    // 执行测试截图
    err := cm.testScreenshot()
    if err != nil {
        return fmt.Errorf("test screenshot failed: %v", err)
    }

    return nil
}
```

### 2. 监控指标

**关键指标**:
- Chrome运行状态 (running/stopped)
- 熔断器状态 (closed/open/half-open)
- 可用槽位数 (0-3)
- 请求处理数
- 平均响应时间
- 错误率
- 缓存命中率

**健康检查端点**:
```bash
GET /api/health?detailed=true

# 响应包含Chrome manager状态
{
  "services": {
    "chrome": {
      "status": "healthy",
      "mode": "auto",
      "uptime": "2h35m",
      "circuit_breaker": "closed",
      "available_slots": 2
    }
  }
}
```

---

## 迁移指南

### 从Legacy迁移到统一API

**旧代码** (GET方式):
```bash
curl http://localhost:3900/api/v1/screenshot/example.com
```

**新代码** (POST方式):
```bash
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -d '{
    "type": "basic",
    "domain": "example.com",
    "format": "file"
  }'
```

**迁移优势**:
- 更灵活的参数配置
- 支持所有截图类型
- 统一的错误处理
- 更好的性能

**迁移策略**:
1. 新功能使用统一API
2. Legacy接口保持不变
3. 逐步迁移现有客户端
4. 最终废弃legacy接口（可选）

---

## 故障排查

### 常见问题

**1. Chrome启动失败**

```
错误: Failed to launch Chrome
原因: Chrome二进制文件不存在或权限不足
解决:
- 检查chrome_runtime/目录
- 运行自动下载: 首次启动会自动下载
- 确认文件权限: chmod +x chrome_runtime/chrome
```

**2. 截图超时**

```
错误: Screenshot timeout after 30s
原因: 页面加载过慢或网络问题
解决:
- 增加timeout配置
- 检查目标网站可访问性
- 使用warm模式加快响应
```

**3. 熔断器打开**

```
错误: Circuit breaker open
原因: 连续失败次数过多
解决:
- 等待自动恢复（通常1分钟）
- 或手动重启Chrome: POST /api/v1/screenshot/chrome/restart
- 检查Chrome健康状态
```

**4. 并发限制**

```
错误: Request queued, waiting for available slot
原因: 3个并发槽位都在使用中
解决:
- 正常现象，请求会排队执行
- 如需更高并发，考虑horizontal scaling
- 监控平均等待时间
```

### 日志分析

**正常日志**:
```
[INFO] Chrome started in auto mode
[INFO] Screenshot captured: example.com (cached=false, duration=1.2s)
[INFO] Chrome idle for 5m, shutting down
```

**警告日志**:
```
[WARN] Chrome health check failed, attempting recovery
[WARN] Cache TTL 999h exceeds max 72h, clamping
```

**错误日志**:
```
[ERROR] Chrome launch failed: exec format error
[ERROR] Circuit breaker opened after 5 consecutive failures
[ERROR] Screenshot timeout for domain: slow-site.com
```

---

## 配置参考

### 环境变量

```bash
# Chrome管理
CHROME_MODE=auto              # auto (推荐), cold, warm
CHROME_BINARY_PATH=/path/to/chrome  # 可选，自动检测

# Screenshot服务
SCREENSHOT_CACHE_TTL=24h      # 默认缓存时间
SCREENSHOT_TIMEOUT=30s        # 截图超时
SCREENSHOT_VIEWPORT_WIDTH=1920
SCREENSHOT_VIEWPORT_HEIGHT=1080
SCREENSHOT_QUALITY=90         # JPEG质量

# 并发控制
CHROME_MAX_CONCURRENT=3       # 最大并发数

# 熔断器
CIRCUIT_BREAKER_THRESHOLD=5   # 失败阈值
CIRCUIT_BREAKER_TIMEOUT=60s   # 熔断超时
```

### 默认配置

```go
var DefaultScreenshotServiceConfig = ScreenshotServiceConfig{
    CacheExpiration:  24 * time.Hour,
    Timeout:          30 * time.Second,
    ViewportWidth:    1920,
    ViewportHeight:   1080,
    Quality:          90,
    WaitTime:         3 * time.Second,
    UserAgent:        "Mozilla/5.0 (Whosee Screenshot Bot)",
}
```

---

## 最佳实践

### 1. 选择合适的运行模式

```
使用场景             推荐模式    原因
────────────────────────────────────────────
WHOIS为主，偶尔截图   auto      平衡性能和资源
频繁截图（>10次/分）  warm      最快响应速度
极少截图（<1次/小时） cold      最低资源占用
开发测试环境         auto      稳定且资源友好
生产环境（高负载）    warm      最佳性能
```

### 2. 缓存策略

```
内容类型            推荐TTL     原因
────────────────────────────────────────────
静态首页            72小时      变化不频繁
动态内容            1-6小时     保持时效性
实时数据            1-10分钟    数据实时性
测试/调试           关闭缓存    确保最新结果
```

### 3. 错误处理

```go
// 推荐：重试机制
func screenshotWithRetry(domain string, maxRetries int) (*Screenshot, error) {
    for i := 0; i < maxRetries; i++ {
        result, err := takeScreenshot(domain)
        if err == nil {
            return result, nil
        }

        // 检查是否为可重试错误
        if !isRetryable(err) {
            return nil, err
        }

        // 指数退避
        time.Sleep(time.Duration(math.Pow(2, float64(i))) * time.Second)
    }

    return nil, errors.New("max retries exceeded")
}
```

### 4. 监控告警

```
监控项                   告警阈值      处理方式
────────────────────────────────────────────────
Chrome启动失败次数       >3次/10分钟   发送告警+自动重启
熔断器打开              立即          发送告警+检查健康
平均响应时间            >5秒          调查慢速站点
错误率                  >10%          检查服务状态
内存使用                >2GB          考虑重启或扩容
```

---

## 技术栈

**核心依赖**:
- `chromedp/chromedp` - Chrome DevTools Protocol客户端
- `gin-gonic/gin` - Web框架
- `go-redis/redis` - Redis客户端（缓存和锁）
- Go标准库 - context, sync, time等

**Chrome版本要求**:
- Chrome/Chromium 90+
- 自动下载支持Linux amd64/arm64, macOS, Windows

---

## 未来规划

### 短期优化

1. WebP格式支持（更小的文件）
2. 并发槽位动态调整
3. 更精细的缓存失效策略
4. 截图质量自动优化

### 长期规划

1. 分布式截图集群
2. 多Chrome池负载均衡
3. GPU加速渲染
4. 机器学习驱动的智能等待
5. 截图内容分析API

---

## 参考资料

**内部文档**:
- [CLAUDE.md](../CLAUDE.md) - 项目开发指南
- [P2_SECURITY_FIX_REPORT.md](reports/P2_SECURITY_FIX_REPORT.md) - P2-3修复详情
- [routes/screenshot_routes.go](../routes/screenshot_routes.go) - 路由实现

**外部资源**:
- [chromedp文档](https://github.com/chromedp/chromedp)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [熔断器模式](https://martinfowler.com/bliki/CircuitBreaker.html)

---

**文档维护**: Claude Code
**最后审核**: 2025-12-04
**下次审核**: 2025-03-04
