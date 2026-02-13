# Implementation Plan: Domain Query Services Suite

**Branch**: `001-domain-query-services` | **Date**: 2026-01-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-domain-query-services/spec.md`

## Summary

Implement a comprehensive domain information query service suite for Whosee.me frontend, featuring five independent query services (WHOIS, RDAP, DNS, Health Check, Screenshot) with unified token management and caching. The system follows Feature-First + MVVM architecture, with all backend communication proxied through Next.js API Routes using server-side JWT token management (30-second validity, 25-second cache TTL). Frontend implements 5-minute TanStack Query caching and single-flight pattern to optimize performance. Each service is designed as an independently testable MVP slice following constitution's MVVM layer separation and performance targets (API <500ms p95, FCP <1.5s).

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 14 (App Router), React 18
**Primary Dependencies**:
- **State Management**: TanStack Query v5 (server state), Zustand v4 (UI state)
- **UI Framework**: React 18, shadcn/ui (Radix UI primitives), Tailwind CSS v3
- **Validation**: Zod v3 for runtime validation at boundaries
- **Utilities**: clsx, tailwind-merge, date-fns

**Storage**:
- **Client-side**: localStorage for query history (10 most recent)
- **Server-side**: Node.js memory cache for JWT tokens (25-second TTL)
- **Backend**: Redis (managed by Go backend, not directly accessed by frontend)

**Testing**:
- **Unit**: Vitest + React Testing Library for hooks and utilities
- **Integration**: Vitest + MSW for API route testing
- **E2E**: Playwright for critical user journeys (WHOIS query, DNS lookup)

**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Minimum Requirements**: ES2020 support, localStorage, Fetch API
- **Responsive**: Desktop (≥1024px), Tablet (768-1023px), Mobile (≥375px)

**Project Type**: Frontend web application (Next.js 14 App Router) with server-side proxy layer

**Performance Goals**:
- **Load Performance**: FCP <1.5s, LCP <2.5s, TTI <3.5s, CLS <0.1
- **Runtime Performance**: API response (p95) <500ms for WHOIS/DNS, <100ms client interaction
- **Bundle Size**: Initial <250KB (gzipped), per-route chunks <100KB (gzipped)
- **Cache Efficiency**: 60%+ backend load reduction via 5-minute frontend caching

**Constraints**:
- **Backend Token**: JWT tokens expire in 30 seconds, single-use (nonce-based)
- **API Proxy**: ALL backend calls MUST go through Next.js API Routes (no direct client→backend)
- **No Server State**: Frontend is stateless (no database, all query history in localStorage)
- **Single Page Application**: All routes client-side navigation except health check

**Scale/Scope**:
- **User Capacity**: 100+ concurrent users without degradation
- **Query Volume**: Support 1000+ queries/day with optimal caching
- **Feature Count**: 5 independent query services (WHOIS, RDAP, DNS, Health, Screenshot)
- **Component Count**: ~30-40 components across 5 features
- **Codebase Size**: Estimated 8,000-12,000 LOC (TypeScript)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principles Compliance

- [x] **I. Feature-First Architecture**: Features organized in `features/[feature-name]/` with components/, hooks/, types.ts for WHOIS, RDAP, DNS, Screenshot, Health services
- [x] **II. MVVM Layer Separation**: Clear View (components), ViewModel (hooks), Model (services/types) boundaries maintained per architecture guide
- [x] **III. Test-Driven Quality**: Test strategy defined - Unit (hooks, utilities), Integration (API routes with MSW), E2E (Playwright for critical paths). Target: 80%+ coverage
- [x] **IV. Single Responsibility**: Architecture enforces limits - Components <300 lines, hooks <150 lines, services <400 lines. Each feature self-contained
- [x] **V. Type Safety**: TypeScript strict mode enforced. Types in `lib/types/api.ts` (global) and `features/*/types.ts` (feature-specific). Zod validation at boundaries
- [x] **VI. Performance First**: Optimization strategy defined - TanStack Query (5min cache), React.memo for result displays, dynamic imports for JSON viewer, next/image for all images
- [x] **VII. Observability**: Four-layer error handling planned - API Layer (lib/api/client.ts), Service Layer (lib/services/*), Hook Layer (features/*/hooks/*), Component Layer (error boundaries)

### Architectural Constraints

- [x] **Next.js App Router**: Using route group `(app)/` for main features (whois, rdap, dns, screenshot, health). Route group `(content)/` reserved for future CMS
- [x] **API Proxy Pattern**: All backend calls through `/app/api/v1/*` and `/app/api/internal/token/`. No direct client-to-backend communication
- [x] **Token Management**: Server-side only in `/app/api/internal/token/route.ts`. 25-second memory cache with single-flight pattern. Clients never hold tokens
- [x] **State Management**: TanStack Query for server data (WHOIS/DNS results with 5min staleTime), Zustand for UI state (theme, dialogs), useState for form inputs, useSearchParams for URL state
- [x] **Import Boundaries**: Feature isolation enforced - No cross-feature imports. Features import from lib/ and components/ only. ESLint plugin-boundaries configured

### Performance & Quality Standards

- [x] **Performance Targets**: FCP <1.5s, LCP <2.5s, TTI <3.5s achievable with code splitting (dynamic imports for heavy components), image optimization (next/image), caching (TanStack Query 5min)
- [x] **Bundle Size**: Initial bundle <250KB feasible - Next.js 14 automatic code splitting, tree-shaking, dynamic imports for JsonViewer and screenshot components
- [x] **Accessibility**: WCAG 2.1 Level AA planned - Semantic HTML (<main>, <nav>, <article>), keyboard navigation, ARIA labels, 4.5:1 contrast ratios, focus indicators
- [x] **Security**: Input validation at boundaries (Zod schemas for domain/URL validation), no client-side token exposure (server-only), sanitization of displayed data (DOMPurify if needed)

### Violations Requiring Justification

*No violations. All constitution requirements met by architecture design.*

## Project Structure

### Documentation (this feature)

```text
specs/001-domain-query-services/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (completed)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   ├── whois-api.ts     # WHOIS API contract
│   ├── rdap-api.ts      # RDAP API contract
│   ├── dns-api.ts       # DNS API contract
│   ├── screenshot-api.ts # Screenshot API contract
│   └── health-api.ts    # Health check API contract
└── checklists/
    └── requirements.md  # Quality checklist (completed)
```

### Source Code (repository root)

This is a **web application** (frontend-only with server-side proxy layer).

```text
app/
├── (app)/                          # Main application route group
│   ├── layout.tsx                  # Shared layout (Header + Sidebar)
│   ├── page.tsx                    # Home/landing page
│   ├── whois/
│   │   ├── page.tsx                # WHOIS query page (MVP: P1)
│   │   └── loading.tsx             # Loading state
│   ├── rdap/
│   │   ├── page.tsx                # RDAP query page (P4)
│   │   └── loading.tsx
│   ├── dns/
│   │   ├── page.tsx                # DNS query page (P2)
│   │   └── loading.tsx
│   ├── screenshot/
│   │   ├── page.tsx                # Screenshot page (P5)
│   │   └── loading.tsx
│   └── health/
│       └── page.tsx                # Health check dashboard (P3)
├── (content)/                      # RESERVED for future CMS (blog, docs)
├── api/                            # API Routes (server-side proxy)
│   ├── internal/
│   │   └── token/
│   │       └── route.ts            # Token management (GET /api/internal/token)
│   └── v1/
│       ├── whois/[domain]/route.ts # WHOIS proxy (GET)
│       ├── rdap/[domain]/route.ts  # RDAP proxy (GET)
│       ├── dns/[domain]/route.ts   # DNS proxy (GET)
│       ├── screenshot/route.ts     # Screenshot proxy (POST)
│       └── health/route.ts         # Health proxy (GET)
├── layout.tsx                      # Root layout
├── globals.css                     # Global styles
└── providers.tsx                   # React Query, Theme providers

features/                           # Feature modules (View + ViewModel)
├── whois/
│   ├── components/                 # View layer
│   │   ├── WhoisForm.tsx           # Query input form
│   │   ├── WhoisResult.tsx         # Result display
│   │   ├── WhoisHistory.tsx        # Local history
│   │   └── index.ts                # Public API
│   ├── hooks/                      # ViewModel layer
│   │   ├── useWhoisQuery.ts        # TanStack Query hook
│   │   ├── useWhoisHistory.ts      # localStorage hook
│   │   └── index.ts
│   ├── services/                   # Business logic
│   │   ├── mapWhoisData.ts         # DTO transformation
│   │   └── validateDomain.ts       # Domain validation
│   └── types.ts                    # Feature-specific types
├── rdap/                           # (Similar structure to whois)
├── dns/                            # (Similar structure to whois)
├── screenshot/                     # (Similar structure to whois)
└── health/                         # (Similar structure to whois)

components/
├── ui/                             # shadcn/ui base components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── skeleton.tsx
│   └── toast.tsx
├── layout/                         # Layout components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Footer.tsx
└── shared/                         # Cross-feature shared
    ├── DomainInput.tsx             # Reusable domain input
    ├── JsonViewer.tsx              # JSON display (dynamic import)
    ├── LoadingSkeleton.tsx         # Loading states
    ├── ErrorBoundary.tsx           # Error boundaries
    └── QueryHistoryItem.tsx        # History item display

lib/                                # Model layer and utilities
├── services/                       # Service layer (API calls)
│   ├── whois-service.ts            # WHOIS API service
│   ├── rdap-service.ts             # RDAP API service
│   ├── dns-service.ts              # DNS API service
│   ├── screenshot-service.ts       # Screenshot API service
│   └── health-service.ts           # Health check service
├── api/                            # HTTP client
│   ├── client.ts                   # Fetch wrapper with error handling
│   ├── endpoints.ts                # API endpoint constants
│   └── types.ts                    # API request/response types
├── auth/                           # Token management (server-side)
│   └── token-manager.ts            # Token cache + single-flight
├── hooks/                          # Generic hooks
│   ├── useToast.ts                 # Toast notifications
│   ├── useLocalStorage.ts          # localStorage abstraction
│   └── useMediaQuery.ts            # Responsive hooks
├── utils/                          # Pure utility functions
│   ├── validation.ts               # Input validation (Zod schemas)
│   ├── format.ts                   # Date/string formatting
│   ├── cn.ts                       # classNames utility
│   └── error.ts                    # Error type guards
├── types/                          # Global TypeScript types
│   ├── api.ts                      # Backend API types
│   ├── common.ts                   # Shared types
│   └── index.ts                    # Type exports
└── constants.ts                    # Global constants

store/                              # Zustand client-side state
├── theme-store.ts                  # Theme (dark/light mode)
├── ui-store.ts                     # UI state (sidebar, dialogs)
└── index.ts                        # Store exports

tests/
├── unit/                           # Unit tests (Vitest)
│   ├── hooks/
│   ├── utils/
│   └── services/
├── integration/                    # Integration tests (Vitest + MSW)
│   └── api/
└── e2e/                            # E2E tests (Playwright)
    ├── whois.spec.ts
    └── dns.spec.ts

public/                             # Static assets
└── images/

```

**Structure Decision**: Selected **web application** structure (Option 2 variant - frontend-only with server-side proxy).

Rationale:
- This is a **frontend-only** project (no separate backend codebase in this repository)
- Backend Go service exists in `docs/whosee-server/` (separate repository)
- Next.js API Routes act as thin proxy layer to backend
- Feature-First architecture dictated by constitution

Key differences from template:
- No `backend/` directory (backend is separate Go service)
- Features organized by business domain (WHOIS, DNS, etc.) not by technical layer
- Server-side code limited to `/app/api/*` API Routes only
- All business logic lives in `features/` and `lib/`, not `app/` pages

## Complexity Tracking

*No constitution violations. All requirements met by design.*

