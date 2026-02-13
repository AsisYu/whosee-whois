# Phase 0: Research & Technology Decisions

**Feature**: Domain Query Services Suite
**Date**: 2026-01-07
**Status**: Completed

## Overview

This document records technology choices, architectural decisions, and best practices research for implementing the domain query services suite. All decisions align with the existing Feature-First + MVVM architecture documented in `CLAUDE.md` and `docs/ARCHITECTURE_GUIDE.md`.

## Technology Stack Decisions

### 1. Frontend Framework: Next.js 14 (App Router)

**Decision**: Use Next.js 14 with App Router (already established)

**Rationale**:
- **Server Components**: Default server-side rendering reduces client-side JavaScript
- **API Routes**: Built-in API layer perfect for backend proxy pattern
- **Route Groups**: `(app)/` and `(content)/` separation aligns with constitution
- **Code Splitting**: Automatic per-route code splitting meets <250KB bundle target
- **Image Optimization**: Built-in `next/image` component for performance

**Alternatives Considered**:
- **Create React App**: Rejected - no server-side proxy, larger bundle sizes, no route-based code splitting
- **Vite + React Router**: Rejected - would require separate Express.js for API proxy, more complex setup
- **Remix**: Rejected - not aligned with existing project architecture

**Best Practices**:
- Use Server Components by default, mark with `"use client"` only when needed
- Implement loading.tsx for streaming SSR
- Use dynamic imports for heavy components (JsonViewer, screenshot displays)

### 2. State Management: TanStack Query v5 + Zustand v4

**Decision**: TanStack Query for server state, Zustand for UI state (per architecture guide)

**Rationale**:
- **TanStack Query**: Perfect for query result caching (5min staleTime), automatic refetching, built-in loading/error states
- **Zustand**: Lightweight (<1KB), perfect for theme/UI state, no React Context boilerplate
- **Separation of Concerns**: Server data (TanStack Query) vs. UI state (Zustand) is clear boundary

**Alternatives Considered**:
- **Redux Toolkit**: Rejected - overkill for UI state, more boilerplate than Zustand
- **React Context only**: Rejected - poor caching for server data, performance issues with frequent updates
- **Apollo Client**: Rejected - GraphQL-specific, backend uses REST

**Best Practices**:
- Configure TanStack Query with `staleTime: 5 * 60 * 1000` (5 minutes per spec)
- Use `queryKey` factories for consistent cache keys: `['whois', domain]`
- Implement single-flight pattern via TanStack Query's automatic deduplication

**Implementation**:
```typescript
// lib/query-config.ts
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
};
```

### 3. UI Component Library: shadcn/ui + Radix UI

**Decision**: Use shadcn/ui (copy-paste components) built on Radix UI primitives

**Rationale**:
- **No Runtime Dependency**: Components copied into codebase, full control over styling
- **Accessibility**: Radix UI primitives are WCAG 2.1 AA compliant out-of-the-box
- **Tailwind Integration**: Perfect match with Tailwind CSS
- **Customization**: Easy to modify components to match design system

**Alternatives Considered**:
- **Material-UI**: Rejected - large bundle size (~300KB), opinionated design system
- **Ant Design**: Rejected - even larger bundle, not aligned with Tailwind approach
- **Chakra UI**: Rejected - CSS-in-JS runtime overhead, larger bundle

**Best Practices**:
- Install only needed components: `npx shadcn-ui@latest add button input card`
- Use `cn()` utility for conditional classNames: `cn("base-classes", condition && "conditional-classes")`
- Implement form components with react-hook-form integration

**Required Components**:
- button, input, card, skeleton (loading states)
- toast (notifications), dialog (modals)
- tabs (for multi-record type DNS results)
- dropdown-menu (history, export options)

### 4. Validation: Zod v3

**Decision**: Use Zod for runtime validation at system boundaries

**Rationale**:
- **TypeScript-First**: Schemas generate TypeScript types automatically
- **Composable**: Easy to build complex validation from simple schemas
- **Error Messages**: Detailed error messages for user feedback
- **Small Bundle**: ~8KB gzipped

**Alternatives Considered**:
- **Yup**: Rejected - older API, less TypeScript-friendly
- **Joi**: Rejected - larger bundle, backend-focused
- **Custom Validation**: Rejected - reinventing the wheel, error-prone

**Best Practices**:
- Define schemas in `lib/utils/validation.ts`
- Validate at boundaries: form inputs, API route handlers
- Generate TypeScript types from schemas: `type DomainInput = z.infer<typeof domainSchema>`

**Implementation**:
```typescript
// lib/utils/validation.ts
import { z } from 'zod';

export const domainSchema = z.string()
  .min(1, 'Domain is required')
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, 'Invalid domain format')
  .transform((val) => val.toLowerCase().trim());

export const urlSchema = z.string()
  .url('Invalid URL format')
  .refine((url) => {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  }, 'URL must use http or https protocol');
```

### 5. Testing Framework: Vitest + React Testing Library + Playwright

**Decision**: Vitest for unit/integration, Playwright for E2E (modern, fast alternatives)

**Rationale**:
- **Vitest**: Vite-powered, faster than Jest, better TypeScript support, compatible with Jest API
- **React Testing Library**: Testing best practices (user-centric), standard in React ecosystem
- **Playwright**: Multi-browser E2E, better developer experience than Cypress

**Alternatives Considered**:
- **Jest**: Rejected - slower than Vitest, more configuration needed
- **Cypress**: Rejected - limited browser support, slower than Playwright
- **Testing Library alone**: Rejected - needs test runner (Vitest provides this)

**Best Practices**:
- **Unit tests**: Pure functions, custom hooks (with `renderHook`), data transformations
- **Integration tests**: API routes with MSW (Mock Service Worker)
- **E2E tests**: Critical paths only (WHOIS query, DNS lookup)

**Coverage Targets** (per constitution):
- Critical paths: **≥80%** (hooks, services, API routes)
- UI components: **≥60%** (focus on logic, not visual)
- E2E: Cover P1 and P2 user stories (WHOIS, DNS)

### 6. Token Management Pattern: Single-Flight with Memory Cache

**Decision**: Implement single-flight pattern with in-memory token cache (25-second TTL)

**Rationale**:
- **Prevents Duplicate Calls**: Multiple concurrent requests wait for single token fetch
- **Server-Side Only**: Tokens never exposed to client (security requirement)
- **Buffer Window**: 25-second cache < 30-second backend expiry = 5-second safety buffer
- **No External Dependency**: Node.js Map in memory (no Redis needed in frontend)

**Alternatives Considered**:
- **Per-Request Token**: Rejected - excessive token generation, higher latency
- **Redis Cache**: Rejected - unnecessary external dependency for short-lived tokens
- **Client-Side Token Storage**: Rejected - security violation, token must be server-only

**Implementation**:
```typescript
// lib/auth/token-manager.ts
interface TokenCacheEntry {
  token: string;
  expiresAt: number;
  promise: Promise<string> | null; // For single-flight
}

const tokenCache = new Map<string, TokenCacheEntry>();
const CACHE_TTL = 25 * 1000; // 25 seconds

export async function getToken(): Promise<string> {
  const cacheKey = 'auth-token';
  const cached = tokenCache.get(cacheKey);

  // Return valid cached token
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.promise) {
      return cached.promise; // Wait for in-flight request
    }
    return cached.token;
  }

  // Single-flight: create promise for concurrent requests
  const promise = fetch('/api/internal/token')
    .then(res => res.json())
    .then(data => {
      const entry: TokenCacheEntry = {
        token: data.token,
        expiresAt: Date.now() + CACHE_TTL,
        promise: null,
      };
      tokenCache.set(cacheKey, entry);
      return data.token;
    });

  // Store promise for concurrent requests
  tokenCache.set(cacheKey, {
    token: '',
    expiresAt: Date.now() + CACHE_TTL,
    promise,
  });

  return promise;
}
```

### 7. Error Handling Strategy: Four-Layer Architecture

**Decision**: Implement four-layer error handling per constitution

**Rationale**:
- **Layer 1 (API)**: Network errors, HTTP status codes → throw ApiError
- **Layer 2 (Service)**: Business validation, domain errors → throw DomainError
- **Layer 3 (Hook)**: User-friendly messages, toast notifications
- **Layer 4 (Component)**: Error boundaries for unexpected React errors

**Best Practices**:
- Define custom error classes: `ApiError`, `ValidationError`, `DomainNotFoundError`
- Use error boundaries to catch React errors (not handled by hooks)
- Log errors server-side for monitoring (API routes)
- Show user-friendly messages (no stack traces)

**Implementation**:
```typescript
// lib/utils/error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// features/whois/hooks/useWhoisQuery.ts
export function useWhoisQuery(domain: string) {
  return useQuery({
    // ...
    onError: (error) => {
      if (error instanceof ValidationError) {
        toast.error('请输入有效的域名格式');
      } else if (error instanceof ApiError && error.statusCode === 404) {
        toast.error(`域名 ${domain} 未找到或未注册`);
      } else {
        toast.error('查询失败，请稍后重试');
        console.error('WHOIS query failed:', error);
      }
    },
  });
}
```

### 8. Performance Optimization Strategies

**Decision**: Multi-pronged approach to meet constitution performance targets

**Strategies**:

1. **Code Splitting**:
   - Dynamic imports for heavy components: `const JsonViewer = dynamic(() => import('./JsonViewer'))`
   - Route-based splitting (automatic with Next.js App Router)
   - Component-level splitting for rarely-used features (export dialogs)

2. **React Optimization**:
   - `React.memo` for pure presentational components (WhoisResult, DNSResult)
   - `useMemo` for expensive computations (parsing/formatting large WHOIS records)
   - `useCallback` for stable event handlers passed as props

3. **Caching Strategy**:
   - Frontend: TanStack Query (5min staleTime)
   - Backend: Redis (WHOIS dynamic TTL, DNS 30min, Screenshot 24h)
   - Browser: localStorage for query history (10 most recent)

4. **Bundle Optimization**:
   - Tree-shaking (automatic with Next.js)
   - Remove unused dependencies
   - Use `next/dynamic` with `ssr: false` for client-only components

**Measurement**:
- Lighthouse CI in GitHub Actions
- Bundle analyzer: `@next/bundle-analyzer`
- Performance monitoring: Web Vitals API

### 9. Accessibility Standards: WCAG 2.1 Level AA

**Decision**: Implement WCAG 2.1 Level AA compliance from the start

**Requirements** (per constitution):
- **Semantic HTML**: `<main>`, `<nav>`, `<article>`, `<section>` for proper structure
- **Keyboard Navigation**: All interactive elements accessible via Tab/Enter/Space
- **ARIA Labels**: Where semantic HTML insufficient (e.g., icon buttons)
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Focus Indicators**: Visible focus rings on all focusable elements

**Implementation Checklist**:
- [ ] All forms have associated `<label>` elements
- [ ] Buttons have descriptive text or `aria-label`
- [ ] Images have `alt` text (use empty `alt=""` for decorative)
- [ ] Skip links for keyboard navigation (`<a href="#main-content">Skip to content</a>`)
- [ ] Color not sole means of conveying information
- [ ] Error messages linked to form fields (`aria-describedby`)

**Tools**:
- axe DevTools (browser extension)
- eslint-plugin-jsx-a11y
- Lighthouse accessibility audit

## Architecture Patterns

### 1. Feature Module Pattern

Each feature (WHOIS, DNS, etc.) follows identical structure:

```
features/[feature-name]/
├── components/           # View layer (presentational)
│   ├── [Feature]Form.tsx     # Input form
│   ├── [Feature]Result.tsx   # Result display
│   ├── [Feature]History.tsx  # History (if applicable)
│   └── index.ts              # Public exports
├── hooks/                # ViewModel layer (business logic)
│   ├── use[Feature]Query.ts  # TanStack Query hook
│   ├── use[Feature]History.ts # localStorage hook
│   └── index.ts
├── services/             # Optional: complex data transformations
│   ├── map[Feature]Data.ts   # Backend DTO → Frontend model
│   └── validate[Feature].ts  # Custom validation
└── types.ts              # Feature-specific types
```

**Public API** (features/whois/index.ts):
```typescript
export { WhoisForm, WhoisResult, WhoisHistory } from './components';
export { useWhoisQuery, useWhoisHistory } from './hooks';
export type { WhoisFormData, WhoisDisplayData } from './types';
```

**Import Pattern**:
```typescript
// ✅ Correct: Import from feature index
import { WhoisForm, useWhoisQuery } from '@/features/whois';

// ❌ Wrong: Direct file import
import { WhoisForm } from '@/features/whois/components/WhoisForm';
```

### 2. API Proxy Pattern

All API routes follow consistent structure:

```typescript
// app/api/v1/whois/[domain]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/auth/token-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    // 1. Validate input
    const domain = params.domain;
    // (validation logic)

    // 2. Get token (server-side only)
    const token = await getToken();

    // 3. Call backend
    const response = await fetch(`${process.env.BACKEND_URL}/api/v1/whois/${domain}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-KEY': process.env.BACKEND_API_KEY!,
      },
    });

    // 4. Handle response
    if (!response.ok) {
      return NextResponse.json(
        { error: 'WHOIS query failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('WHOIS proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key Points**:
- Input validation before backend call
- Token managed server-side via `getToken()`
- Error handling with proper HTTP status codes
- Logging for debugging

### 3. Service Layer Pattern

Services encapsulate API calls and business logic:

```typescript
// lib/services/whois-service.ts
import { apiClient } from '@/lib/api/client';
import { WhoisResponse, WhoisData } from '@/lib/types/api';

export const whoisService = {
  async query(domain: string): Promise<WhoisData> {
    // Input validation
    if (!isValidDomain(domain)) {
      throw new ValidationError('Invalid domain format');
    }

    // API call (goes through Next.js proxy)
    const response = await apiClient.get<WhoisResponse>(
      `/api/v1/whois/${domain}`
    );

    // Data transformation
    return mapWhoisResponse(response.data);
  },

  async batchQuery(domains: string[]): Promise<WhoisData[]> {
    // Business logic: limit concurrency
    const chunks = chunkArray(domains, 3);
    const results: WhoisData[] = [];

    for (const chunk of chunks) {
      const promises = chunk.map(d => this.query(d));
      const chunkResults = await Promise.allSettled(promises);
      results.push(
        ...chunkResults
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value)
      );
    }

    return results;
  },
};
```

## Best Practices Summary

1. **Component Design**:
   - Single responsibility (one component = one concern)
   - Props minimization (only pass needed fields)
   - Composition over conditional rendering

2. **Hook Design**:
   - Return objects (not arrays) for clarity
   - Encapsulate complete logic (validation, caching, error handling)
   - Named exports only (no default exports)

3. **State Management**:
   - Server data → TanStack Query
   - UI state → Zustand
   - Form state → useState + react-hook-form
   - URL state → useSearchParams

4. **Import Order**:
   ```typescript
   // 1. React/Next core
   import { useState } from 'react';
   import { useRouter } from 'next/navigation';

   // 2. Third-party
   import { useQuery } from '@tanstack/react-query';

   // 3. Internal (grouped)
   import { WhoisForm } from '@/features/whois';     // Features
   import { Button } from '@/components/ui/button';  // Components
   import { whoisService } from '@/lib/services';    // Lib
   import type { WhoisData } from '@/lib/types/api'; // Types

   // 4. Relative imports (same feature)
   import { mapWhoisData } from './mapWhoisData';
   ```

5. **Naming Conventions**:
   - Directories: `kebab-case`
   - React components: `PascalCase.tsx`
   - Hooks: `use` + `PascalCase.ts`
   - Services/utils: `kebab-case.ts`
   - Types/interfaces: `PascalCase`
   - Constants: `UPPER_SNAKE_CASE`

## Research Conclusions

All technology choices and architectural patterns are solidified:

1. ✅ Next.js 14 App Router provides optimal foundation for Feature-First architecture
2. ✅ TanStack Query + Zustand combination meets state management needs
3. ✅ shadcn/ui + Radix UI ensures accessibility and customization
4. ✅ Zod provides type-safe validation at boundaries
5. ✅ Vitest + Playwright modern testing stack
6. ✅ Single-flight token pattern solves concurrent request challenge
7. ✅ Four-layer error handling meets observability requirements
8. ✅ Performance optimization strategies align with constitution targets
9. ✅ WCAG 2.1 Level AA compliance planned from start

No unresolved technical questions remain. Ready for Phase 1: Design & Contracts.
