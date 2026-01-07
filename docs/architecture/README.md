# Architecture Documentation

本目录包含项目架构设计文档和技术决策记录。

## 目录结构

```
docs/architecture/
├── README.md                         # 本文件
└── (待添加架构文档)
```

## 架构概览

Whosee.me是一个高性能域名信息查询和分析服务，采用Go 1.24+和Gin框架构建。

### 核心架构模式

#### 1. Service Container Pattern
- **位置**: `services/container.go`
- **用途**: 统一服务生命周期管理、依赖注入
- **管理的服务**:
  - WhoisManager - 多提供商WHOIS查询编排
  - DNSChecker - DNS记录解析
  - ScreenshotService - 统一截图服务
  - ChromeManager - Chrome实例池
  - WorkerPool - CPU并发任务执行
  - HealthChecker - 服务健康监控
  - RateLimiter - Redis分布式限流

#### 2. Provider Pattern
- **位置**: `types/whois.go`, `providers/`
- **接口**: `WhoisProvider`
- **实现**: WhoisFreaks, WhoisXML, IANA-RDAP, IANA-WHOIS
- **特性**: 负载均衡、自动failover、熔断保护

#### 3. Circuit Breaker Pattern
- **位置**: `services/circuit_breaker.go`
- **用途**: 防止级联故障
- **应用**: ChromeManager, WHOIS providers, 外部API

#### 4. Two-Phase Locking (并发安全修复)
- **位置**: `services/whois_manager.go`
- **函数**: `selectProvider()`, `TestProvidersHealth()`
- **方案**: 读锁快照 → 无锁计算 → 短暂写锁更新

### 技术栈

- **语言**: Go 1.24+
- **Web框架**: Gin
- **缓存**: Redis
- **浏览器**: Chrome/Chromium (via chromedp)
- **部署**: Docker, Kubernetes

## 待添加文档

本目录计划添加以下架构文档：

### 1. 系统架构图
- **文件**: `system-architecture.md`
- **内容**:
  - 整体架构图（服务拓扑）
  - 请求流程图
  - 数据流图

### 2. 服务交互图
- **文件**: `service-interactions.md`
- **内容**:
  - Service Container管理的服务交互
  - 依赖关系图
  - 生命周期管理

### 3. 并发模型
- **文件**: `concurrency-model.md`
- **内容**:
  - 两阶段锁方案（P1修复）
  - WorkerPool设计
  - Goroutine管理策略

### 4. 缓存策略
- **文件**: `caching-strategy.md`
- **内容**:
  - Redis缓存键设计
  - TTL策略（基于域名到期时间）
  - 缓存失效和预热

### 5. 认证与安全
- **文件**: `security-architecture.md`
- **内容**:
  - 多层安全架构
  - JWT + API Key + IP白名单
  - 安全中间件链
  - 威胁模型和防御

### 6. 错误处理
- **文件**: `error-handling.md`
- **内容**:
  - 标准错误码
  - 错误响应格式
  - 日志级别策略

### 7. 性能优化
- **文件**: `performance-optimization.md`
- **内容**:
  - Provider负载均衡算法
  - Chrome实例池管理
  - 连接池配置

### 8. 技术决策记录 (ADR)
- **目录**: `adr/`
- **格式**: ADR-001-title.md, ADR-002-title.md, ...
- **内容**: 重大技术决策、背景、权衡、结果

## 相关文档

### 已有文档
- [CLAUDE.md](../../CLAUDE.md) - 项目级开发指南（Claude Code使用）
- [README.md](../../README.md) - 项目概述和快速开始
- [docs/](../) - API文档、认证流程等

### 外部资源
- [Go官方文档](https://golang.org/doc/)
- [Gin框架文档](https://gin-gonic.com/docs/)
- [Redis文档](https://redis.io/documentation)

## 文档规范

### 创建新架构文档时

**模板结构**:
```markdown
# [架构主题]

## 概述
简要说明（2-3句）

## 背景与动机
为什么需要这个设计？

## 架构方案

### 方案图
[图片或ASCII图]

### 核心组件
- 组件A：说明
- 组件B：说明

### 交互流程
1. 步骤1
2. 步骤2

## 设计决策

### 选项1 vs 选项2
权衡分析

## 实现细节
代码位置、关键函数

## 性能考量
性能影响、优化策略

## 安全考虑
安全威胁、防御措施

## 运维要点
监控指标、告警配置

## 未来改进
已知限制、优化方向

## 参考资料
相关文档、外部链接
```

### 文档命名规范
- 使用小写字母和连字符: `system-architecture.md`
- 技术决策记录: `adr/ADR-001-description.md`
- 图片存放: `architecture/diagrams/`

### 图表工具推荐
- [Mermaid](https://mermaid-js.github.io/) - Markdown内嵌图表
- [Draw.io](https://app.diagrams.net/) - 在线流程图工具
- [PlantUML](https://plantuml.com/) - 代码生成UML图

## 优先级

按优先级添加架构文档：

| 优先级 | 文档 | 原因 |
|-------|------|------|
| 🔴 高 | security-architecture.md | 刚完成P0/P1安全修复，需要记录 |
| 🔴 高 | concurrency-model.md | P1并发修复，需要文档化方案 |
| 🟡 中 | system-architecture.md | 新开发者快速理解系统 |
| 🟡 中 | caching-strategy.md | Redis缓存设计复杂 |
| 🟢 低 | service-interactions.md | 代码已较清晰 |
| 🟢 低 | performance-optimization.md | 性能已可接受 |

