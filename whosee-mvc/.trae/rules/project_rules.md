---
description: 
globs: 
alwaysApply: false
---
# Project Guide - Whosee WHOIS Domain Lookup Tool

## Project Overview

Whosee is a comprehensive domain information lookup tool built with Next.js frontend and Go backend, providing WHOIS data, DNS records, health monitoring, and website screenshots.

## Architecture

### Frontend (Next.js)
- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Internationalization**: next-intl (English/Chinese)
- **Theme**: Dark/Light mode with next-themes

### Backend (Go)
- **Framework**: Custom Go HTTP server with Gin-like patterns
- **Services**: WHOIS, DNS, Screenshot, Health monitoring
- **Deployment**: Docker + Kubernetes ready
- **Cache**: Redis for performance optimization

## Project Structure

### Frontend Structure (`src/`)
```
src/
├── app/                     # Next.js App Router pages
│   ├── domain/             # Domain WHOIS lookup page
│   ├── dns/                # DNS records page  
│   ├── health/             # Health monitoring page
│   ├── screenshot/         # Website screenshot page
│   ├── layout.tsx          # Root layout with i18n & theme
│   └── page.tsx            # Homepage with features
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui base components
│   ├── providers/          # Context providers (theme)
│   └── examples/           # API demo components
├── lib/                    # Utility libraries
│   ├── api.ts              # Frontend API client
│   ├── secure-api.ts       # Secure API endpoints
│   └── utils/              # Helper utilities
├── types/                  # TypeScript type definitions
├── i18n/                   # Internationalization config
└── messages/               # Translation files (en.json, zh.json)
```

### Backend Structure (`server/`)
```
server/
├── handlers/               # HTTP request handlers
├── middleware/             # HTTP middleware chain  
├── services/              # Business logic layer
├── providers/             # External API integrations
├── routes/                # Route definitions
├── types/                 # Go struct definitions
├── utils/                 # Helper utilities
├── config/                # Configuration files
├── k8s/                   # Kubernetes deployment
└── static/                # Static file serving
```

## Key File References

### Frontend Core Files
- **Main Layout**: [src/app/layout.tsx](mdc:src/app/layout.tsx) - Root layout with providers
- **Homepage**: [src/app/page.tsx](mdc:src/app/page.tsx) - Landing page with features
- **API Client**: [src/lib/api.ts](mdc:src/lib/api.ts) - Frontend API communication
- **Types**: [src/types/index.ts](mdc:src/types/index.ts) - TypeScript interfaces
- **Config**: [src/i18n/config.ts](mdc:src/i18n/config.ts) - Internationalization setup

### Backend Core Files  
- **Main Server**: [server/main.go](mdc:server/main.go) - Application entry point
- **Routes**: [server/routes/routes.go](mdc:server/routes/routes.go) - API route definitions
- **WHOIS Handler**: [server/handlers/whois.go](mdc:server/handlers/whois.go) - Domain lookup logic
- **DNS Handler**: [server/handlers/dns.go](mdc:server/handlers/dns.go) - DNS record queries
- **Types**: [server/types/whois.go](mdc:server/types/whois.go) - Go struct definitions

### Configuration Files
- **Next.js Config**: [next.config.ts](mdc:next.config.ts) - Next.js configuration
- **Package**: [package.json](mdc:package.json) - Dependencies and scripts
- **Tailwind**: [tailwind.config.ts](mdc:tailwind.config.ts) - Styling configuration
- **TypeScript**: [tsconfig.json](mdc:tsconfig.json) - TypeScript config

## Development Workflow

### Getting Started
1. **Frontend**: `npm run dev` (Next.js on port 3000)
2. **Backend**: `cd server && go run main.go` (Go server on port 8080)
3. **Build**: `npm run build` for production build

### Environment Setup
- **Development**: Uses Next.js proxy for API calls
- **Production**: Direct API calls to Go backend
- **Authentication**: JWT tokens with X-API-KEY headers

## Feature Pages

### Domain Page ([src/app/domain/page.tsx](mdc:src/app/domain/page.tsx))
- WHOIS data lookup and display
- RDAP protocol support
- Domain availability checking
- Registrar and nameserver information

### DNS Page ([src/app/dns/page.tsx](mdc:src/app/dns/page.tsx))  
- DNS record queries (A, AAAA, MX, TXT, NS, CNAME, SOA)
- Multiple DNS server testing
- Response time monitoring
- Cache status display

### Health Page ([src/app/health/page.tsx](mdc:src/app/health/page.tsx))
- System health monitoring
- Service status dashboard
- Performance metrics
- Redis and database connectivity

### Screenshot Page ([src/app/screenshot/page.tsx](mdc:src/app/screenshot/page.tsx))
- Website screenshot capture
- Multiple device views (desktop, mobile, tablet)
- ITDog speed testing integration
- Base64 image data support

## Internationalization

### Supported Languages
- **English** (`en`): [src/messages/en.json](mdc:src/messages/en.json)
- **Chinese** (`zh`): [src/messages/zh.json](mdc:src/messages/zh.json)

### Usage Pattern
```typescript
import { useTranslations } from 'next-intl';

function Component() {
  const t = useTranslations('namespace');
  return <h1>{t('title')}</h1>;
}
```

## API Integration

### Frontend API Client
- **Base Client**: [src/lib/api.ts](mdc:src/lib/api.ts)
- **Secure Client**: [src/lib/secure-api.ts](mdc:src/lib/secure-api.ts)
- **JWT Authentication**: Automatic token management
- **Error Handling**: Comprehensive error types and recovery

### Backend API Endpoints
- **WHOIS**: `/api/v1/whois/{domain}` - Domain information
- **RDAP**: `/api/v1/rdap/{domain}` - RDAP protocol queries  
- **DNS**: `/api/v1/dns/{domain}` - DNS record lookup
- **Health**: `/api/health` - System health status
- **Screenshot**: `/api/v1/screenshot/{domain}` - Website capture

## Deployment

### Docker Support
- **Backend**: [server/Dockerfile](mdc:server/Dockerfile)
- **Kubernetes**: [server/k8s/](mdc:server/k8s) deployment files

### Environment Variables
- `NEXT_PUBLIC_API_KEY`: Frontend API key
- `NEXT_PUBLIC_API_SECRET`: Frontend API secret  
- `NODE_ENV`: Environment mode
- `PORT`: Server port configuration

## MVC 开发架构要求

### 架构原则
本项目严格遵循 MVC (Model-View-Controller) 架构模式，确保代码的可维护性、可测试性和可扩展性。

- **Model 层**: 负责数据模型、状态管理和API交互
- **View 层**: 负责UI渲染和用户交互
- **Controller 层**: 负责业务逻辑和数据流控制

### 开发规范
- 严格分离各层职责，避免跨层直接调用
- 使用TypeScript严格模式，确保类型安全
- 实现依赖注入，提高代码可测试性
- 遵循单一职责原则，每个文件只负责一个功能

## 并发性能优化要求

### 性能优化策略
- **并发请求**: 使用 `Promise.allSettled()` 进行并发API调用
- **请求去重**: 实现请求缓存和去重机制，避免重复请求
- **批量处理**: 合理控制批次大小和并发数量
- **资源管理**: 防止内存泄漏，合理管理网络资源

### 缓存策略
- 实现多层缓存：内存缓存、本地存储、Redis缓存
- 设置合理的缓存过期时间
- 提供缓存失效和刷新机制

## 用户预览体验优化

### 加载体验
- **渐进式加载**: 分阶段加载数据，优先显示关键信息
- **骨架屏**: 提供优雅的加载状态展示
- **懒加载**: 对非关键组件实现懒加载
- **预加载**: 预测用户行为，提前加载可能需要的数据

### 交互体验
- **实时反馈**: 提供搜索建议、自动完成等交互反馈
- **错误恢复**: 实现智能重试和降级策略
- **响应式设计**: 确保在不同设备上的良好体验
- **可访问性**: 遵循WCAG标准，支持键盘导航和屏幕阅读器

### 性能监控
- 集成性能监控和错误追踪
- 监控关键性能指标（LCP、FID、CLS）
- 实现用户行为分析和体验优化

## AI 代码生成指导

当使用AI生成代码时，必须遵循以下原则：

1. **MVC架构**: 生成的代码必须符合MVC分层架构
2. **并发优化**: 优先考虑并发性能和资源利用效率
3. **用户体验**: 注重加载状态、错误处理和交互反馈
4. **代码质量**: 使用TypeScript严格模式，提供完整的类型定义
5. **测试覆盖**: 为关键功能提供单元测试和集成测试

