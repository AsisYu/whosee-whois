# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Constitution Reference

**CRITICAL**: All development MUST comply with the project constitution at `.specify/memory/constitution.md` (v1.0.0).

Key principles:
- **Feature-First Architecture** - Organize by business feature (WHOIS, DNS, etc.)
- **MVVM Layer Separation** - Clear View/ViewModel/Model boundaries
- **Test-Driven Quality** - 80%+ coverage target for critical paths
- **Single Responsibility** - Components <300 lines, hooks <150 lines
- **Type Safety** - TypeScript strict mode, validation at boundaries
- **Performance First** - FCP <1.5s, LCP <2.5s, bundle <250KB
- **Observability** - Four-layer error handling

See constitution for complete governance rules, performance targets, and quality gates.

## Project Overview

Whosee.me is a domain information query and analysis service frontend built with Next.js 14 (App Router), TypeScript, and React. It provides a web interface for WHOIS lookups, DNS queries, website screenshots, and performance testing by integrating with the Whosee.me backend service (Go/Gin).

**Backend Service**: Located in `docs/whosee-server/` - a Go-based API providing domain query, DNS resolution, screenshot, and ITDog speed testing services.

## Core Instruction for CodeX MCP

在任何时刻，你必须思考当前过程可以如何与codex进行协作，如何调用Codex 为你提供的MCP工具作为你客观全面分析的保障。
其中你**务必执行**以下几个步骤：
**1** 在你对用户需求形成初步分析后，将用户需求、初始思路告知codex，并要求其完善需求分析和实施计划。
**2** 在实施具体编码任务前，**必须向codex索要代码实现原型（要求codex仅给出unified diff patch，严禁对代码做任何真实修改）**。在获取代码原型后，你**只能以此为逻辑参考，再次对代码修改进行重写**，形成企业生产级别、可读性极高、可维护性极高的代码后，才能实施具体编程修改任务。
**3** 无论何时，只要完成切实编码行为后，**必须立即使用codex review代码改动和对应需求完成程度**。
**4** codex只能给出参考，你**必须有自己的思考，甚至需要对codex的回答提出置疑**。尽信书则不如无书，你与codex的最终使命都是达成统一、全面、精准的意见，所以你们必须不断争辩已找到通向真理的唯一途径。

## Architecture

### Feature-First + MVVM Pattern

This project uses a **Feature-First** organization combined with **MVVM (Model-View-ViewModel)** architecture, not traditional MVC:

```
Model Layer       → lib/services/*, lib/types/*, store/*, TanStack Query
View Layer        → app/*/page.tsx, components/ui/*, features/*/components/
ViewModel/Controller → features/*/hooks/*, app/api/*, app/actions/
```

**Key Principle**: Organize by business feature (WHOIS, DNS, Screenshot, ITDog) rather than technical type.

### Directory Structure (Planned)

```
app/
├── (app)/                  # Application feature layout group
│   ├── layout.tsx          # Shared layout (Header + Sidebar)
│   ├── whois/, rdap/, dns/, screenshot/, itdog/, health/
├── (content)/              # Content layout group (RESERVED for future CMS)
│   ├── blog/, docs/        # Future blog/docs integration
├── api/                    # API Routes (proxy layer to backend)
│   ├── internal/token/     # Internal token management
│   └── v1/                 # Backend API proxies

features/                   # Feature modules (View + ViewModel)
├── whois/
│   ├── components/         # View layer
│   ├── hooks/              # ViewModel layer (useWhoisQuery, etc.)
│   ├── services/           # Business logic (optional)
│   └── types.ts

components/
├── ui/                     # shadcn/ui base components
├── layout/                 # Header, Sidebar, Footer
└── shared/                 # Cross-feature shared components

lib/                        # Model layer and utilities
├── services/               # API service layer
│   └── cms/                # CMS services (RESERVED)
├── api/                    # HTTP client, interceptors
├── auth/                   # Token management
├── hooks/                  # Generic hooks (useToast, useTheme)
├── seo/                    # SEO utilities (RESERVED)
├── types/                  # Global TypeScript types
│   └── content.ts          # Content types (RESERVED)
└── utils/                  # Pure utility functions

store/                      # Zustand client-side state
```

### JWT Token Management (Critical Design)

Backend JWT tokens expire in **30 seconds** and are **single-use**. The architecture uses:

**Single-Flight Token Pattern**:
- Token management happens in **Next.js API Routes** (server-side)
- Memory cache with 25-second expiry (5-second buffer)
- Multiple concurrent requests wait for the same token fetch
- Clients never directly hold tokens

**Flow**:
```
Client → Next.js API Route → Token Manager → Backend /api/auth/token
                           ↓
                    Cache (25s TTL)
                           ↓
                    Backend API (with token)
```

### Layer Boundaries (Enforced by ESLint)

**Allowed**:
- ✅ Features can import from `lib/` and `components/`
- ✅ Components can import from `lib/`
- ✅ Lib can only import from other `lib/` modules

**Forbidden**:
- ❌ Features cannot import from other features
- ❌ UI components cannot import from `services/`
- ❌ Lib cannot import from upper layers

## Development Workflow

### Project Setup (When Starting)

This is currently a **design-only** repository with documentation. To initialize the actual codebase:

```bash
# Initialize Next.js project (when ready)
npx create-next-app@latest . --typescript --app --tailwind

# Install core dependencies
npm install @tanstack/react-query zustand zod clsx tailwind-merge
npm install recharts date-fns react-json-view-lite

# Install shadcn/ui
npx shadcn-ui@latest init

# Install dev tools
npm install -D @types/node eslint-plugin-boundaries
```

### Codex MCP Tool Usage

**Available Tools**:
- `mcp__codex__codex` - Execute AI-assisted coding tasks via Codex
- `mcp__cc-codex__codex` - Alternative Codex invocation

**Parameters**:
- `PROMPT` (required): Task instruction for Codex
- `cd` (required): Working directory path
- `sandbox`: Use `"read-only"` for analysis (NEVER allow code modifications)
- `SESSION_ID`: Continue previous session for multi-turn interaction
- `return_all_messages`: Set `true` for detailed reasoning traces

**Workflow**:
1. Analyze requirements → Consult Codex for implementation plan
2. Get code prototype from Codex (diff patch only, no actual changes)
3. Rewrite code to enterprise-grade quality before implementing
4. After implementation → Use Codex to review changes
5. Challenge Codex responses when needed - seek unified truth through debate

## Key Design Decisions

### 1. No User Authentication System

- **No login/registration** - Service uses backend JWT tokens only
- Query history stored in **localStorage** (not cloud/database)
- Future: Optional backend persistence if needed

### 2. API Proxy Strategy

**All API calls go through Next.js API Routes** (not direct to backend):
- Keeps backend credentials server-side
- Centralized token injection
- Unified error handling and logging

### 3. Future CMS Integration (Reserved)

**When project succeeds**, integrate headless CMS for blog/docs:

**Recommended**: Sanity.io
- Generous free tier (500k API calls/month)
- Excellent Next.js integration
- Chinese localization support

**Architecture Preparation**:
- Routes reserved: `/blog`, `/docs` under `app/(content)/`
- Types defined in `lib/types/content.ts`
- Service layer stub in `lib/services/cms/`
- Environment variables in `.env.example` (commented)

**Data Strategy**:
- Blog: ISR (Incremental Static Regeneration) with 10-min revalidate
- Docs: SSG (Static Site Generation)
- On-demand revalidation via CMS webhooks

### 4. State Management

**Decision Tree**:
- **Server data** (API responses) → TanStack Query
- **UI state** (theme, dialogs) → Zustand
- **Form state** → useState + react-hook-form
- **URL state** (search params) → Next.js Router

### 5. Backend Service Integration

**Backend Location**: `docs/whosee-server/` (Go service)

**Key APIs**:
- `POST /api/auth/token` - Get JWT token (public)
- `GET /api/v1/whois/:domain` - WHOIS query (JWT required)
- `GET /api/v1/rdap/:domain` - RDAP query (JWT required)
- `GET /api/v1/dns/:domain` - DNS query (JWT required)
- `GET /api/v1/screenshot/:domain` - Screenshot (JWT required)
- `POST /api/v1/screenshot/` - Unified screenshot API
- `GET /api/v1/itdog/:domain` - ITDog speed test (JWT required)
- `GET /api/health` - Health check (public)

**All endpoints** (except health and token) require JWT authentication.

## Code Standards

### Naming Conventions

- **Directories**: `kebab-case`
- **React Components**: `PascalCase.tsx`
- **Hooks**: `use` + `PascalCase.ts` (e.g., `useWhoisQuery.ts`)
- **Services/Utils**: `kebab-case.ts`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`

### Import Order

```typescript
// 1. React/Next core
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party
import { useQuery } from '@tanstack/react-query';

// 3. Internal (grouped)
// 3.1 Features
import { WhoisForm } from '@/features/whois';
// 3.2 Components
import { Button } from '@/components/ui/button';
// 3.3 Lib
import { whoisService } from '@/lib/services/whois-service';
// 3.4 Types
import type { WhoisData } from '@/lib/types/api';

// 4. Styles
import styles from './styles.module.css';

// 5. Relative imports (same feature)
import { mapWhoisData } from './services/mapWhoisData';
```

### Component Patterns

**Single Responsibility**:
```typescript
// ✅ Good: Separate concerns
function WhoisPage() {
  const { data, isLoading } = useWhoisQuery(domain);

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <WhoisEmpty />;
  return <WhoisResult data={data} />;
}

// ❌ Bad: One component does everything
function WhoisPageBad() {
  // 500 lines of JSX mixing all concerns
}
```

**Props Minimization**:
```typescript
// ✅ Good: Only pass needed fields
interface Props {
  domain: string;
  registrar: string;
  expiryDate: string;
}

// ❌ Bad: Pass entire object
interface BadProps {
  whoisData: WhoisApiResponse; // 100 fields
}
```

### Hook Patterns

**Return Objects (not arrays)**:
```typescript
// ✅ Good: Named properties
export function useWhoisQuery(domain: string) {
  return {
    data,
    isLoading,
    error,
    refetch,
    exportAsJson,
  };
}

// ❌ Bad: Positional array
export function useWhoisQueryBad(domain: string) {
  return [data, isLoading, error, refetch];
}
```

**Encapsulate Complete Logic**:
```typescript
// ✅ Good: Full logic encapsulation
export function useWhoisQuery(domain: string) {
  return useQuery({
    queryKey: ['whois', domain],
    queryFn: () => whoisService.query(domain),
    enabled: !!domain && isValidDomain(domain), // Validation
    staleTime: 5 * 60 * 1000,                    // Caching
    retry: 3,                                     // Retry
    onError: handleError,                        // Error handling
  });
}
```

## Error Handling

**4-Layer Error Handling**:

1. **API Layer** (`lib/api/client.ts`): Network errors
2. **Service Layer** (`lib/services/*.ts`): Business errors
3. **Hook Layer** (`features/*/hooks/*.ts`): User-friendly errors
4. **Component Layer**: UI feedback

Example:
```typescript
// Service layer
if (!isValidDomain(domain)) {
  throw new ValidationError('Invalid domain format');
}

// Hook layer
onError: (error) => {
  if (error instanceof ValidationError) {
    toast.error('请输入有效的域名格式');
  } else {
    toast.error('查询失败,请稍后重试');
    logError(error);
  }
}
```

## Performance Optimization

- **React.memo**: Use for pure presentational components
- **useMemo/useCallback**: Cache expensive computations and callbacks
- **Dynamic Imports**: Use `next/dynamic` for heavy components
- **Image Optimization**: Always use `next/image`
- **Code Splitting**: Route-based automatic splitting via Next.js

## Testing Strategy

**Unit Tests**: Pure functions, hooks (with React Testing Library)
**Integration Tests**: API Routes (with MSW)
**E2E Tests**: User flows (with Playwright)

## Documentation References

- **Architecture Guide**: `docs/ARCHITECTURE_GUIDE.md` - Detailed architecture, MVC mapping, code standards
- **Frontend Design**: `docs/FRONTEND_DESIGN.md` - Full design doc, tech stack, implementation roadmap
- **Backend API**: `docs/whosee-server/docs/ALL_JSON.md` - API response formats
- **Backend Auth Flow**: `docs/whosee-server/docs/BACKEND_AUTHENTICATION_FLOW.md` - JWT token authentication

## Path Aliases (tsconfig.json)

```json
{
  "paths": {
    "@/*": ["./*"],
    "@/features/*": ["./features/*"],
    "@/components/*": ["./components/*"],
    "@/lib/*": ["./lib/*"],
    "@/store/*": ["./store/*"],
    "@/app/*": ["./app/*"]
  }
}
```

## Environment Variables

```bash
# Backend service
BACKEND_URL=http://localhost:3900
BACKEND_API_KEY=your_api_key

# Next.js
NEXT_PUBLIC_APP_NAME=Whosee.me
NEXT_PUBLIC_APP_URL=http://localhost:3000

# CMS (RESERVED - commented out)
# CMS_PROVIDER=sanity
# SANITY_PROJECT_ID=
# SANITY_DATASET=production
```

## Reserved Routes

**DO NOT use these paths** - reserved for future CMS integration:
- `/blog`
- `/blog/[slug]`
- `/docs`
- `/docs/[...slug]`

## Common Pitfalls

1. **Don't fetch data in UI components** - Use hooks/services
2. **Don't cross feature boundaries** - Features are isolated modules
3. **Don't bypass API proxy** - Always go through Next.js API Routes
4. **Don't store tokens client-side** - Token management is server-only
5. **Don't create abstractions prematurely** - Three duplicates before abstracting

## Implementation Status

**Current**: Design and planning phase
**Next**: Project scaffolding (Phase 1 - see `docs/FRONTEND_DESIGN.md`)

When ready to implement, follow the 8-phase roadmap in the frontend design document.
