# Cursor Rules Overview - Whosee WHOIS Project

This document provides an overview of all Cursor rules configured for the `whosee-whois` project. These rules guide AI-assisted development to maintain consistency, quality, and architectural integrity.

## Rule Files

### 1. Project Guide ([project-guide.mdc](mdc:.cursor/rules/project-guide.mdc))
**Always Applied**: Yes | **Globs**: `*`
- Overall project structure and architecture
- Frontend (Next.js) and backend (Go) organization
- Key file references and configuration
- Development workflow and deployment
- Feature pages and API integration

### 2. API Patterns ([api-patterns.mdc](mdc:.cursor/rules/api-patterns.mdc))
**Always Applied**: No | **Globs**: `server/**/*.go,src/lib/api.ts`
- Go backend API development patterns
- HTTP handler structure and middleware
- Request/response patterns
- Error handling and validation
- Authentication and security
- Database integration patterns

### 3. Next.js Patterns ([nextjs-patterns.mdc](mdc:.cursor/rules/nextjs-patterns.mdc))
**Always Applied**: No | **Globs**: `src/**/*.tsx,src/**/*.ts`
- Next.js 15 App Router patterns
- Server and client component patterns
- Route handling and middleware
- Data fetching strategies
- Performance optimization
- SEO and metadata management

### 4. Component Patterns ([component-patterns.mdc](mdc:.cursor/rules/component-patterns.mdc))
**Always Applied**: No | **Globs**: `src/components/**/*.tsx`
- React component architecture
- shadcn/ui component usage
- Component composition patterns
- Props and state management
- Event handling patterns
- Accessibility guidelines

### 5. Development Workflow ([development-workflow.mdc](mdc:.cursor/rules/development-workflow.mdc))
**Always Applied**: No | **Globs**: `*`
- Development commands and scripts
- Code standards and conventions
- Testing patterns for both frontend and backend
- Deployment workflows
- Git workflow and commit conventions

### 6. Styling Patterns ([styling-patterns.mdc](mdc:.cursor/rules/styling-patterns.mdc))
**Always Applied**: No | **Globs**: `*.tsx,*.ts,*.css`
- Tailwind CSS configuration and conventions
- Design system and color palette
- Component styling patterns
- Responsive design patterns
- Dark mode implementation
- Animation and transition patterns

### 7. Internationalization Patterns ([i18n-patterns.mdc](mdc:.cursor/rules/i18n-patterns.mdc))
**Always Applied**: No | **Globs**: `*.tsx,*.ts,*.json`
- next-intl configuration and setup
- Translation file organization
- Component internationalization patterns
- Locale management and routing
- Form validation with i18n
- Testing internationalized components

### 8. Type Patterns ([type-patterns.mdc](mdc:.cursor/rules/type-patterns.mdc))
**Always Applied**: No | **Globs**: `*.ts,*.tsx`
- Core API type definitions
- Component prop type patterns
- Hook type patterns
- Utility type definitions
- Type guards and validators
- Advanced TypeScript patterns

### 9. MVC Patterns ([mvc-patterns.mdc](mdc:.cursor/rules/mvc-patterns.mdc))
**Always Applied**: Yes | **Globs**: `*.ts,*.tsx`
- MVC 架构模式指导和严格分层要求
- Model 层数据模型和状态管理
- Controller 层业务逻辑控制
- View 层用户界面组件
- 并发性能优化策略和实现
- 用户预览体验优化技术
- AI 代码生成指导原则
- 最佳实践和性能优化
- 测试策略和代码组织

## Rule Categories

### Architecture & Structure
- [project-guide.mdc](mdc:.cursor/rules/project-guide.mdc) - Overall project structure
- [mvc-patterns.mdc](mdc:.cursor/rules/mvc-patterns.mdc) - MVC 架构模式指导
- [development-workflow.mdc](mdc:.cursor/rules/development-workflow.mdc) - Development processes

### Frontend Development
- [nextjs-patterns.mdc](mdc:.cursor/rules/nextjs-patterns.mdc) - Next.js specific patterns
- [component-patterns.mdc](mdc:.cursor/rules/component-patterns.mdc) - React component patterns
- [styling-patterns.mdc](mdc:.cursor/rules/styling-patterns.mdc) - CSS and design patterns

### Backend Development
- [api-patterns.mdc](mdc:.cursor/rules/api-patterns.mdc) - Go backend patterns

### Cross-cutting Concerns
- [i18n-patterns.mdc](mdc:.cursor/rules/i18n-patterns.mdc) - Internationalization
- [type-patterns.mdc](mdc:.cursor/rules/type-patterns.mdc) - TypeScript types

## Quick Reference

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Go, custom HTTP server, Redis, Docker/Kubernetes
- **Internationalization**: next-intl (English, Chinese)
- **Styling**: Tailwind CSS with design tokens, dark/light mode
- **Deployment**: Docker containers, Kubernetes, Vercel

### Project Structure Quick Links
- **Frontend Pages**: [src/app/](mdc:src/app) - Next.js App Router pages
- **Components**: [src/components/ui/](mdc:src/components/ui) - Reusable UI components
- **API Client**: [src/lib/api.ts](mdc:src/lib/api.ts) - Frontend API communication
- **Types**: [src/types/index.ts](mdc:src/types/index.ts) - TypeScript definitions
- **Backend Handlers**: [server/handlers/](mdc:server/handlers) - API endpoints
- **Backend Services**: [server/services/](mdc:server/services) - Business logic

### Core Features
1. **Domain WHOIS Lookup** - [src/app/domain/page.tsx](mdc:src/app/domain/page.tsx)
2. **DNS Records** - [src/app/dns/page.tsx](mdc:src/app/dns/page.tsx)
3. **Health Monitoring** - [src/app/health/page.tsx](mdc:src/app/health/page.tsx)
4. **Website Screenshots** - [src/app/screenshot/page.tsx](mdc:src/app/screenshot/page.tsx)

### Development Commands
```bash
# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Code linting

# Backend
cd server
go run main.go       # Development server
go test ./...        # Run tests
```

## Usage Guidelines

### When to Use Each Rule
1. **Starting new features**: 首先参考 `mvc-patterns.mdc` 确保架构合规，然后使用 `project-guide.mdc` 和 `nextjs-patterns.mdc`
2. **Creating components**: 严格遵循 `mvc-patterns.mdc` 的分层原则，配合 `component-patterns.mdc` 和 `styling-patterns.mdc`
3. **Performance optimization**: 参考 `mvc-patterns.mdc` 中的并发性能优化策略
4. **User experience**: 遵循 `mvc-patterns.mdc` 中的用户预览体验优化指导
5. **Backend development**: Follow `api-patterns.mdc`
6. **Adding translations**: Refer to `i18n-patterns.mdc`
7. **Type definitions**: Use `type-patterns.mdc`
8. **Setting up development**: Follow `development-workflow.mdc`
9. **Architecture design**: 严格遵循 `mvc-patterns.mdc` 进行合理的关注点分离
10. **AI code generation**: 确保生成的代码符合 `mvc-patterns.mdc` 中的所有要求

### Best Practices
- **MVC 架构**: 严格遵循 MVC 分层架构，确保代码的可维护性和可测试性
- **并发性能**: 优先使用 Promise.allSettled() 进行并发请求，实现请求去重和缓存机制
- **用户体验**: 实现渐进式加载、骨架屏和智能错误恢复策略
- **TypeScript**: 使用严格模式和完整的类型定义
- **国际化**: 为所有用户界面文本实现国际化支持
- **组件模式**: 遵循 shadcn/ui 的组件组合模式
- **样式规范**: 使用语义化的 Tailwind 类和设计令牌
- **测试覆盖**: 为前端组件和后端处理器提供完整测试
- **Git 规范**: 遵循提交和分支的约定

## Updating Rules

These rules should be updated when:
- New architectural decisions are made
- New patterns emerge in the codebase
- Technology stack changes
- Best practices evolve

To update a rule, edit the corresponding `.mdc` file in the `.cursor/rules` directory.