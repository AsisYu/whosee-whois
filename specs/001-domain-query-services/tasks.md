# Implementation Tasks: Domain Query Services Suite

**Feature**: Domain Query Services Suite
**Branch**: `001-domain-query-services`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Generated**: 2026-01-07

## Task Summary

- **Total Tasks**: 166 (updated: +4 security/sanitization tasks)
- **Setup & Foundation**: 21 tasks (was 18, +3 for DOMPurify and sanitization)
- **User Story 1 (WHOIS - P1)**: 23 tasks
- **User Story 2 (DNS - P2)**: 22 tasks
- **User Story 3 (Health Check - P3)**: 15 tasks
- **User Story 4 (RDAP - P4)**: 22 tasks
- **User Story 5 (Screenshot - P5)**: 20 tasks
- **Polish & Integration**: 8 tasks (was 7, +1 for npm audit)

## MVP Scope (Minimum Viable Product)

**MVP = Phase 1 (Setup) + Phase 2 (Foundation) + Phase 3 (User Story 1 - WHOIS)**

- **Task Count**: 44 tasks (was 41, +3 for DOMPurify/sanitization security enhancements)
- **Estimated Effort**: 3-4 days for experienced developer
- **Deliverable**: Fully functional WHOIS query service with tests, API integration, UI, and XSS protection

## Task Format

```
- [ ] T### [P?] [Story?] Description | file/path | Dependencies: [T###, ...]
```

**Legend**:
- `T###`: Task ID (sequential)
- `[P?]`: Priority (P1-P5 from user stories)
- `[Story?]`: User story reference (e.g., US1, US2)
- **Dependencies**: Tasks that must complete before this one

---

## Phase 1: Project Setup & Dependencies

**Goal**: Initialize Next.js project, install dependencies, configure tools

### 1.1 Project Initialization

- [ ] T001 [--] [--] Initialize Next.js 14 project with TypeScript, App Router, Tailwind CSS | `package.json`, `tsconfig.json`, `next.config.js` | Dependencies: []
- [ ] T002 [--] [--] Configure TypeScript strict mode and path aliases | `tsconfig.json` | Dependencies: [T001]
- [ ] T003 [--] [--] Create directory structure (features/, lib/, components/, store/) | `/` | Dependencies: [T001]
- [ ] T004 [--] [--] Install state management dependencies (TanStack Query v5, Zustand v4) | `package.json` | Dependencies: [T001]
- [ ] T005 [--] [--] Install validation library (Zod v3) | `package.json` | Dependencies: [T001]
- [ ] T006 [--] [--] Install UI utilities (clsx, tailwind-merge, date-fns) | `package.json` | Dependencies: [T001]
- [ ] T006a [--] [--] Install DOMPurify for XSS prevention (sanitize backend data before display) | `package.json` | Dependencies: [T001]
- [ ] T007 [--] [--] Initialize shadcn/ui with base configuration | `components/ui/`, `components.json` | Dependencies: [T001]
- [ ] T008 [--] [--] Install shadcn/ui components (button, input, card, skeleton, toast, tabs, dropdown-menu, dialog) | `components/ui/` | Dependencies: [T007]
- [ ] T009 [--] [--] Install testing dependencies (Vitest, React Testing Library, @testing-library/jest-dom) | `package.json`, `vitest.config.ts` | Dependencies: [T001]
- [ ] T010 [--] [--] Install integration test tools (MSW - Mock Service Worker) | `package.json` | Dependencies: [T001]
- [ ] T011 [--] [--] Install E2E testing framework (Playwright) | `package.json`, `playwright.config.ts` | Dependencies: [T001]
- [ ] T012 [--] [--] Configure ESLint with boundaries plugin | `.eslintrc.js` | Dependencies: [T002]
- [ ] T013 [--] [--] Create environment variable files (.env.local, .env.example) | `.env.local`, `.env.example` | Dependencies: [T001]
- [ ] T014 [--] [--] Update .gitignore for Next.js project | `.gitignore` | Dependencies: [T001]

### 1.2 Configuration Files

- [ ] T015 [--] [--] Create Vitest configuration | `vitest.config.ts` | Dependencies: [T009]
- [ ] T016 [--] [--] Create Playwright configuration | `playwright.config.ts` | Dependencies: [T011]
- [ ] T017 [--] [--] Create MSW setup for integration tests | `tests/integration/mocks/handlers.ts`, `tests/integration/mocks/server.ts` | Dependencies: [T010]
- [ ] T018 [--] [--] Configure Next.js bundle analyzer | `next.config.js` | Dependencies: [T001]

---

## Phase 2: Foundational Infrastructure

**Goal**: Build shared utilities, type system, API client, token management

### 2.1 Global Types & Constants

- [ ] T019 [--] [--] Define base types (DomainQuery, QueryHistory) | `lib/types/common.ts` | Dependencies: [T003]
- [ ] T020 [--] [--] Define API response types (WhoisQueryResult, RDAPQueryResult, DNSQueryResult, ScreenshotRequest, ServiceHealthStatus) | `lib/types/api.ts` | Dependencies: [T019]
- [ ] T021 [--] [--] Create type utilities (type guards, query key generators) | `lib/types/utils.ts` | Dependencies: [T020]
- [ ] T022 [--] [--] Define global constants (API endpoints, cache TTLs, screenshot viewports) | `lib/constants.ts` | Dependencies: [T003]

### 2.2 Validation & Utilities

- [ ] T023 [--] [--] Create Zod validation schemas (domain, URL, DNS record types) | `lib/utils/validation.ts` | Dependencies: [T005]
- [ ] T024 [--] [--] Unit test: validation schemas | `tests/unit/utils/validation.test.ts` | Dependencies: [T023]
- [ ] T025 [--] [--] Create formatting utilities (dates, file sizes, response times) | `lib/utils/format.ts` | Dependencies: [T006]
- [ ] T026 [--] [--] Unit test: formatting utilities | `tests/unit/utils/format.test.ts` | Dependencies: [T025]
- [ ] T027 [--] [--] Create error classes (ApiError, ValidationError) | `lib/utils/error.ts` | Dependencies: [T020]
- [ ] T027a [--] [--] Create sanitization utility using DOMPurify (sanitize all backend data before display per FR-027) | `lib/utils/sanitize.ts` | Dependencies: [T006a]
- [ ] T027b [--] [--] Unit test: sanitization utility (XSS prevention) | `tests/unit/utils/sanitize.test.ts` | Dependencies: [T027a]
- [ ] T028 [--] [--] Create classNames utility (cn function) | `lib/utils/cn.ts` | Dependencies: [T006]

### 2.3 API Client & Token Management

- [ ] T029 [--] [--] Create token manager with single-flight pattern | `lib/auth/token-manager.ts` | Dependencies: [T022]
- [ ] T030 [--] [--] Unit test: token manager (cache, expiry, single-flight) | `tests/unit/auth/token-manager.test.ts` | Dependencies: [T029]
- [ ] T031 [--] [--] Create HTTP client wrapper with error handling | `lib/api/client.ts` | Dependencies: [T027, T022]
- [ ] T032 [--] [--] Unit test: HTTP client error handling | `tests/unit/api/client.test.ts` | Dependencies: [T031]
- [ ] T033 [--] [--] Create API endpoint constants | `lib/api/endpoints.ts` | Dependencies: [T022]
- [ ] T034 [--] [--] Create internal token API route | `app/api/internal/token/route.ts` | Dependencies: [T029]
- [ ] T035 [--] [--] Integration test: token API route | `tests/integration/api/token.test.ts` | Dependencies: [T034, T017]

### 2.4 Generic Hooks & State

- [ ] T036 [--] [--] Create useLocalStorage hook | `lib/hooks/useLocalStorage.ts` | Dependencies: [T003]
- [ ] T037 [--] [--] Unit test: useLocalStorage hook | `tests/unit/hooks/useLocalStorage.test.ts` | Dependencies: [T036]
- [ ] T038 [--] [--] Create useToast hook (wrapper for shadcn toast) | `lib/hooks/useToast.ts` | Dependencies: [T008]
- [ ] T039 [--] [--] Create useMediaQuery hook for responsive design | `lib/hooks/useMediaQuery.ts` | Dependencies: [T003]
- [ ] T040 [--] [--] Create Zustand theme store (dark/light mode) | `store/theme-store.ts` | Dependencies: [T004]
- [ ] T041 [--] [--] Create Zustand UI store (sidebar, dialogs) | `store/ui-store.ts` | Dependencies: [T004]

### 2.5 Shared Components

- [ ] T042 [--] [--] Create DomainInput component (reusable domain input with validation) | `components/shared/DomainInput.tsx` | Dependencies: [T008, T023]
- [ ] T043 [--] [--] Create LoadingSkeleton component | `components/shared/LoadingSkeleton.tsx` | Dependencies: [T008]
- [ ] T044 [--] [--] Create ErrorBoundary component | `components/shared/ErrorBoundary.tsx` | Dependencies: [T027]
- [ ] T045 [--] [--] Create QueryHistoryItem component | `components/shared/QueryHistoryItem.tsx` | Dependencies: [T008, T019]
- [ ] T046 [--] [--] Create JsonViewer component (dynamic import, lazy loading) | `components/shared/JsonViewer.tsx` | Dependencies: [T008]

### 2.6 Layout Components

- [ ] T047 [--] [--] Create Header component | `components/layout/Header.tsx` | Dependencies: [T008, T040]
- [ ] T048 [--] [--] Create Sidebar component | `components/layout/Sidebar.tsx` | Dependencies: [T008, T041]
- [ ] T049 [--] [--] Create Footer component | `components/layout/Footer.tsx` | Dependencies: [T008]
- [ ] T050 [--] [--] Create app layout with Header + Sidebar | `app/(app)/layout.tsx` | Dependencies: [T047, T048, T049]
- [ ] T051 [--] [--] Create root layout with providers (TanStack Query, Theme) | `app/layout.tsx`, `app/providers.tsx` | Dependencies: [T004, T040]

---

## Phase 3: User Story 1 - WHOIS Query Service (P1) 🎯 MVP

**User Story**: "As a domain investor, I want to query WHOIS information for a domain so that I can view registration details, expiration dates, and registrar information."

### 3.1 WHOIS Types & Validation

- [ ] T052 [P1] [US1] Define WHOIS feature-specific types | `features/whois/types.ts` | Dependencies: [T020]
- [ ] T053 [P1] [US1] Create WHOIS data transformation service (backend DTO → frontend model) | `features/whois/services/mapWhoisData.ts` | Dependencies: [T052]
- [ ] T054 [P1] [US1] Unit test: WHOIS data transformation | `tests/unit/features/whois/mapWhoisData.test.ts` | Dependencies: [T053]

### 3.2 WHOIS Service Layer

- [ ] T055 [P1] [US1] Create WHOIS service (API calls to Next.js proxy) | `lib/services/whois-service.ts` | Dependencies: [T031, T033, T052]
- [ ] T056 [P1] [US1] Unit test: WHOIS service error handling | `tests/unit/services/whois-service.test.ts` | Dependencies: [T055]

### 3.3 WHOIS API Route (Next.js Proxy)

- [ ] T057 [P1] [US1] Create WHOIS API route (GET /api/v1/whois/[domain]) | `app/api/v1/whois/[domain]/route.ts` | Dependencies: [T034, T055]
- [ ] T058 [P1] [US1] Integration test: WHOIS API route with MSW | `tests/integration/api/whois.test.ts` | Dependencies: [T057, T017]

### 3.4 WHOIS Hooks (ViewModel Layer)

- [ ] T059 [P1] [US1] Create useWhoisQuery hook (TanStack Query wrapper) | `features/whois/hooks/useWhoisQuery.ts` | Dependencies: [T055, T004]
- [ ] T060 [P1] [US1] Unit test: useWhoisQuery hook | `tests/unit/features/whois/useWhoisQuery.test.ts` | Dependencies: [T059]
- [ ] T061 [P1] [US1] Create useWhoisHistory hook (localStorage integration) | `features/whois/hooks/useWhoisHistory.ts` | Dependencies: [T036, T019]
- [ ] T062 [P1] [US1] Unit test: useWhoisHistory hook | `tests/unit/features/whois/useWhoisHistory.test.ts` | Dependencies: [T061]

### 3.5 WHOIS Components (View Layer)

- [ ] T063 [P1] [US1] Create WhoisForm component (input form with validation) | `features/whois/components/WhoisForm.tsx` | Dependencies: [T042, T023, T059]
- [ ] T064 [P1] [US1] Create WhoisResult component (display WHOIS data) | `features/whois/components/WhoisResult.tsx` | Dependencies: [T008, T025, T059]
- [ ] T065 [P1] [US1] Create WhoisHistory component (recent queries) | `features/whois/components/WhoisHistory.tsx` | Dependencies: [T045, T061]
- [ ] T066 [P1] [US1] Unit test: WhoisForm component | `tests/unit/features/whois/WhoisForm.test.ts` | Dependencies: [T063]
- [ ] T067 [P1] [US1] Unit test: WhoisResult component | `tests/unit/features/whois/WhoisResult.test.ts` | Dependencies: [T064]

### 3.6 WHOIS Page & Integration

- [ ] T068 [P1] [US1] Create feature index (public API exports) | `features/whois/index.ts` | Dependencies: [T063, T064, T065, T059, T061]
- [ ] T069 [P1] [US1] Create WHOIS page (app/(app)/whois/page.tsx) | `app/(app)/whois/page.tsx` | Dependencies: [T068, T050]
- [ ] T070 [P1] [US1] Create WHOIS loading state | `app/(app)/whois/loading.tsx` | Dependencies: [T043]
- [ ] T071 [P1] [US1] E2E test: WHOIS query flow (form submission → result display) | `tests/e2e/whois.spec.ts` | Dependencies: [T069, T011]

### 3.7 WHOIS Polish & Optimization

- [ ] T072 [P1] [US1] Implement React.memo for WhoisResult (performance optimization) | `features/whois/components/WhoisResult.tsx` | Dependencies: [T064]
- [ ] T073 [P1] [US1] Add JSON export functionality to WhoisResult | `features/whois/components/WhoisResult.tsx` | Dependencies: [T064]
- [ ] T074 [P1] [US1] Add raw WHOIS text toggle (dynamic import JsonViewer) | `features/whois/components/WhoisResult.tsx` | Dependencies: [T046, T064]

---

## Phase 4: User Story 2 - DNS Query Service (P2)

**User Story**: "As a system administrator, I want to query DNS records (A, AAAA, MX, TXT, NS, CNAME, SOA) for a domain so that I can troubleshoot DNS configuration issues."

### 4.1 DNS Types & Validation

- [ ] T075 [P2] [US2] Define DNS feature-specific types | `features/dns/types.ts` | Dependencies: [T020]
- [ ] T076 [P2] [US2] Create DNS data transformation service | `features/dns/services/mapDnsData.ts` | Dependencies: [T075]
- [ ] T077 [P2] [US2] Unit test: DNS data transformation | `tests/unit/features/dns/mapDnsData.test.ts` | Dependencies: [T076]

### 4.2 DNS Service Layer

- [X] T078 [P2] [US2] Create DNS service | `lib/services/dns-service.ts` | Dependencies: [T031, T033, T075]
- [X] T079 [P2] [US2] Unit test: DNS service error handling | `tests/unit/services/dns-service.test.ts` | Dependencies: [T078]

### 4.3 DNS API Route

- [X] T080 [P2] [US2] Create DNS API route (GET /api/v1/dns/[domain]) | `app/api/v1/dns/[domain]/route.ts` | Dependencies: [T034, T078]
- [X] T081 [P2] [US2] Integration test: DNS API route | `tests/integration/api/dns.test.ts` | Dependencies: [T080, T017]

### 4.4 DNS Hooks (ViewModel Layer)

- [ ] T082 [P2] [US2] Create useDnsQuery hook | `features/dns/hooks/useDnsQuery.ts` | Dependencies: [T078, T004]
- [ ] T083 [P2] [US2] Unit test: useDnsQuery hook | `tests/unit/features/dns/useDnsQuery.test.ts` | Dependencies: [T082]
- [ ] T084 [P2] [US2] Create useDnsHistory hook | `features/dns/hooks/useDnsHistory.ts` | Dependencies: [T036, T019]

### 4.5 DNS Components (View Layer)

- [ ] T085 [P2] [US2] Create DnsForm component (with record type selector) | `features/dns/components/DnsForm.tsx` | Dependencies: [T042, T082]
- [ ] T086 [P2] [US2] Create DnsResult component (tabbed display by record type) | `features/dns/components/DnsResult.tsx` | Dependencies: [T008, T082]
- [ ] T087 [P2] [US2] Create DnsRecordTable component (display DNS records) | `features/dns/components/DnsRecordTable.tsx` | Dependencies: [T008, T025]
- [ ] T088 [P2] [US2] Create DnsHistory component | `features/dns/components/DnsHistory.tsx` | Dependencies: [T045, T084]
- [ ] T089 [P2] [US2] Unit test: DnsForm component | `tests/unit/features/dns/DnsForm.test.ts` | Dependencies: [T085]
- [ ] T090 [P2] [US2] Unit test: DnsResult component | `tests/unit/features/dns/DnsResult.test.ts` | Dependencies: [T086]

### 4.6 DNS Page & Integration

- [ ] T091 [P2] [US2] Create feature index | `features/dns/index.ts` | Dependencies: [T085, T086, T087, T088, T082]
- [ ] T092 [P2] [US2] Create DNS page | `app/(app)/dns/page.tsx` | Dependencies: [T091, T050]
- [ ] T093 [P2] [US2] Create DNS loading state | `app/(app)/dns/loading.tsx` | Dependencies: [T043]
- [ ] T094 [P2] [US2] E2E test: DNS query flow | `tests/e2e/dns.spec.ts` | Dependencies: [T092, T011]

### 4.7 DNS Polish & Optimization

- [ ] T095 [P2] [US2] Implement React.memo for DnsRecordTable | `features/dns/components/DnsRecordTable.tsx` | Dependencies: [T087]
- [ ] T096 [P2] [US2] Add CSV export functionality | `features/dns/components/DnsResult.tsx` | Dependencies: [T086]

---

## Phase 5: User Story 3 - Health Check Dashboard (P3)

**User Story**: "As a service operator, I want to view the health status of all backend services (WHOIS, RDAP, DNS, Screenshot) so that I can monitor system availability in real-time."

### 5.1 Health Types & Service

- [ ] T097 [P3] [US3] Define Health feature-specific types | `features/health/types.ts` | Dependencies: [T020]
- [ ] T098 [P3] [US3] Create Health service | `lib/services/health-service.ts` | Dependencies: [T031, T033, T097]

### 5.2 Health API Route

- [ ] T099 [P3] [US3] Create Health API route (GET /api/health) | `app/api/health/route.ts` | Dependencies: [T098]
- [ ] T100 [P3] [US3] Integration test: Health API route | `tests/integration/api/health.test.ts` | Dependencies: [T099, T017]

### 5.3 Health Hooks & Components

- [ ] T101 [P3] [US3] Create useHealthCheck hook (10-second polling interval) | `features/health/hooks/useHealthCheck.ts` | Dependencies: [T098, T004]
- [ ] T102 [P3] [US3] Unit test: useHealthCheck hook | `tests/unit/features/health/useHealthCheck.test.ts` | Dependencies: [T101]
- [ ] T103 [P3] [US3] Create HealthStatusCard component (service status display) | `features/health/components/HealthStatusCard.tsx` | Dependencies: [T008, T101]
- [ ] T104 [P3] [US3] Create HealthDashboard component (grid of status cards) | `features/health/components/HealthDashboard.tsx` | Dependencies: [T103]
- [ ] T105 [P3] [US3] Create SystemInfoCard component (version, uptime) | `features/health/components/SystemInfoCard.tsx` | Dependencies: [T008, T025, T101]

### 5.4 Health Page & Integration

- [ ] T106 [P3] [US3] Create feature index | `features/health/index.ts` | Dependencies: [T103, T104, T105, T101]
- [ ] T107 [P3] [US3] Create Health page | `app/(app)/health/page.tsx` | Dependencies: [T106, T050]
- [ ] T108 [P3] [US3] E2E test: Health check dashboard | `tests/e2e/health.spec.ts` | Dependencies: [T107, T011]

### 5.5 Health Polish

- [ ] T109 [P3] [US3] Add auto-refresh indicator | `features/health/components/HealthDashboard.tsx` | Dependencies: [T104]
- [ ] T110 [P3] [US3] Add status change toast notifications | `features/health/components/HealthDashboard.tsx` | Dependencies: [T038, T104]
- [ ] T111 [P3] [US3] Implement color-coded status badges | `features/health/components/HealthStatusCard.tsx` | Dependencies: [T103]

---

## Phase 6: User Story 4 - RDAP Query Service (P4)

**User Story**: "As a compliance officer, I want to query RDAP information for a domain so that I can access structured registration data in standard JSON format."

### 6.1 RDAP Types & Validation

- [ ] T112 [P4] [US4] Define RDAP feature-specific types | `features/rdap/types.ts` | Dependencies: [T020]
- [ ] T113 [P4] [US4] Create RDAP data transformation service | `features/rdap/services/mapRdapData.ts` | Dependencies: [T112]
- [ ] T114 [P4] [US4] Unit test: RDAP data transformation | `tests/unit/features/rdap/mapRdapData.test.ts` | Dependencies: [T113]

### 6.2 RDAP Service Layer

- [ ] T115 [P4] [US4] Create RDAP service | `lib/services/rdap-service.ts` | Dependencies: [T031, T033, T112]
- [ ] T116 [P4] [US4] Unit test: RDAP service error handling | `tests/unit/services/rdap-service.test.ts` | Dependencies: [T115]

### 6.3 RDAP API Route

- [ ] T117 [P4] [US4] Create RDAP API route (GET /api/v1/rdap/[domain]) | `app/api/v1/rdap/[domain]/route.ts` | Dependencies: [T034, T115]
- [ ] T118 [P4] [US4] Integration test: RDAP API route | `tests/integration/api/rdap.test.ts` | Dependencies: [T117, T017]

### 6.4 RDAP Hooks (ViewModel Layer)

- [ ] T119 [P4] [US4] Create useRdapQuery hook | `features/rdap/hooks/useRdapQuery.ts` | Dependencies: [T115, T004]
- [ ] T120 [P4] [US4] Unit test: useRdapQuery hook | `tests/unit/features/rdap/useRdapQuery.test.ts` | Dependencies: [T119]
- [ ] T121 [P4] [US4] Create useRdapHistory hook | `features/rdap/hooks/useRdapHistory.ts` | Dependencies: [T036, T019]

### 6.5 RDAP Components (View Layer)

- [ ] T122 [P4] [US4] Create RdapForm component | `features/rdap/components/RdapForm.tsx` | Dependencies: [T042, T119]
- [ ] T123 [P4] [US4] Create RdapResult component | `features/rdap/components/RdapResult.tsx` | Dependencies: [T008, T025, T119]
- [ ] T124 [P4] [US4] Create RdapEntityCard component (display vCard entities) | `features/rdap/components/RdapEntityCard.tsx` | Dependencies: [T008]
- [ ] T125 [P4] [US4] Create RdapHistory component | `features/rdap/components/RdapHistory.tsx` | Dependencies: [T045, T121]
- [ ] T126 [P4] [US4] Unit test: RdapResult component | `tests/unit/features/rdap/RdapResult.test.ts` | Dependencies: [T123]

### 6.6 RDAP Page & Integration

- [ ] T127 [P4] [US4] Create feature index | `features/rdap/index.ts` | Dependencies: [T122, T123, T124, T125, T119]
- [ ] T128 [P4] [US4] Create RDAP page | `app/(app)/rdap/page.tsx` | Dependencies: [T127, T050]
- [ ] T129 [P4] [US4] Create RDAP loading state | `app/(app)/rdap/loading.tsx` | Dependencies: [T043]
- [ ] T130 [P4] [US4] E2E test: RDAP query flow | `tests/e2e/rdap.spec.ts` | Dependencies: [T128, T011]

### 6.7 RDAP Polish

- [ ] T131 [P4] [US4] Add JSON export functionality | `features/rdap/components/RdapResult.tsx` | Dependencies: [T123]
- [ ] T132 [P4] [US4] Add JSON viewer for full RDAP response | `features/rdap/components/RdapResult.tsx` | Dependencies: [T046, T123]
- [ ] T133 [P4] [US4] Implement React.memo for RdapEntityCard | `features/rdap/components/RdapEntityCard.tsx` | Dependencies: [T124]

---

## Phase 7: User Story 5 - Screenshot Service (P5)

**User Story**: "As a web developer, I want to capture screenshots of a website in different viewport sizes (desktop, tablet, mobile) so that I can verify responsive design across devices."

### 7.1 Screenshot Types & Validation

- [ ] T134 [P5] [US5] Define Screenshot feature-specific types | `features/screenshot/types.ts` | Dependencies: [T020]
- [ ] T135 [P5] [US5] Create URL validation service | `features/screenshot/services/validateUrl.ts` | Dependencies: [T023]
- [ ] T136 [P5] [US5] Unit test: URL validation | `tests/unit/features/screenshot/validateUrl.test.ts` | Dependencies: [T135]

### 7.2 Screenshot Service Layer

- [ ] T137 [P5] [US5] Create Screenshot service | `lib/services/screenshot-service.ts` | Dependencies: [T031, T033, T134]
- [ ] T138 [P5] [US5] Unit test: Screenshot service error handling | `tests/unit/services/screenshot-service.test.ts` | Dependencies: [T137]

### 7.3 Screenshot API Route

- [ ] T139 [P5] [US5] Create Screenshot API route (POST /api/v1/screenshot) | `app/api/v1/screenshot/route.ts` | Dependencies: [T034, T137]
- [ ] T140 [P5] [US5] Integration test: Screenshot API route | `tests/integration/api/screenshot.test.ts` | Dependencies: [T139, T017]

### 7.4 Screenshot Hooks (ViewModel Layer)

- [ ] T141 [P5] [US5] Create useScreenshotCapture hook (mutation hook) | `features/screenshot/hooks/useScreenshotCapture.ts` | Dependencies: [T137, T004]
- [ ] T142 [P5] [US5] Unit test: useScreenshotCapture hook | `tests/unit/features/screenshot/useScreenshotCapture.test.ts` | Dependencies: [T141]
- [ ] T143 [P5] [US5] Create useScreenshotHistory hook | `features/screenshot/hooks/useScreenshotHistory.ts` | Dependencies: [T036, T019]

### 7.5 Screenshot Components (View Layer)

- [ ] T144 [P5] [US5] Create ScreenshotForm component (URL input + viewport selector) | `features/screenshot/components/ScreenshotForm.tsx` | Dependencies: [T008, T141]
- [ ] T145 [P5] [US5] Create ViewportSelector component (preset viewport options) | `features/screenshot/components/ViewportSelector.tsx` | Dependencies: [T008, T134]
- [ ] T146 [P5] [US5] Create ScreenshotResult component (image display with download) | `features/screenshot/components/ScreenshotResult.tsx` | Dependencies: [T008, T141]
- [ ] T147 [P5] [US5] Create ScreenshotGallery component (multiple viewport comparison) | `features/screenshot/components/ScreenshotGallery.tsx` | Dependencies: [T146]
- [ ] T148 [P5] [US5] Create ScreenshotHistory component | `features/screenshot/components/ScreenshotHistory.tsx` | Dependencies: [T045, T143]
- [ ] T149 [P5] [US5] Unit test: ScreenshotForm component | `tests/unit/features/screenshot/ScreenshotForm.test.ts` | Dependencies: [T144]

### 7.6 Screenshot Page & Integration

- [ ] T150 [P5] [US5] Create feature index | `features/screenshot/index.ts` | Dependencies: [T144, T145, T146, T147, T148, T141]
- [ ] T151 [P5] [US5] Create Screenshot page | `app/(app)/screenshot/page.tsx` | Dependencies: [T150, T050]
- [ ] T152 [P5] [US5] Create Screenshot loading state | `app/(app)/screenshot/loading.tsx` | Dependencies: [T043]
- [ ] T153 [P5] [US5] E2E test: Screenshot capture flow | `tests/e2e/screenshot.spec.ts` | Dependencies: [T151, T011]

---

## Phase 8: Polish, Optimization & Final Integration

**Goal**: Cross-feature integration, performance optimization, accessibility, documentation

### 8.1 Home Page & Navigation

- [ ] T154 [--] [--] Create home/landing page | `app/(app)/page.tsx` | Dependencies: [T050]
- [ ] T155 [--] [--] Update Sidebar with all service navigation links | `components/layout/Sidebar.tsx` | Dependencies: [T048, T069, T092, T107, T128, T151]

### 8.2 Performance Optimization

- [ ] T156 [--] [--] Add dynamic imports for heavy components (JsonViewer, ScreenshotGallery) | All feature components | Dependencies: [T046, T147]
- [ ] T157 [--] [--] Run Lighthouse CI audit (BLOCK deployment if <90 desktop or <80 mobile); verify bundle <250KB and API p95 <500ms | `next.config.js`, CI/CD pipeline | Dependencies: [T018]
- [ ] T158 [--] [--] Add next/image optimization for all images | All components with images | Dependencies: [T001]

### 8.3 Accessibility Audit

- [ ] T159 [--] [--] Run axe DevTools accessibility audit and fix violations | All pages | Dependencies: [T069, T092, T107, T128, T151]
- [ ] T160 [--] [--] Verify keyboard navigation (Tab, Enter, Space) | All interactive components | Dependencies: [T159]

### 8.4 Documentation & Deployment

- [ ] T161 [--] [--] Update README.md with setup instructions | `README.md` | Dependencies: [T001]
- [ ] T162 [--] [--] Create deployment guide (Vercel) | `docs/DEPLOYMENT.md` | Dependencies: [T161]
- [ ] T162a [--] [--] Run npm audit and resolve all high/critical vulnerabilities (constitution security requirement) | `package.json` | Dependencies: [T001]

---

## Constitution Compliance Final Check

**Run before marking feature complete**:

### Core Principles

- [ ] **Feature-First Architecture**: All features in `features/[name]/` with components/, hooks/, types.ts
- [ ] **MVVM Layer Separation**: Clear View (components), ViewModel (hooks), Model (services/types) boundaries
- [ ] **Test-Driven Quality**: Unit tests for hooks/services, Integration tests for API routes, E2E tests for critical paths
- [ ] **Single Responsibility**: Components <300 lines, hooks <150 lines, services <400 lines
- [ ] **Type Safety**: TypeScript strict mode, Zod validation at boundaries
- [ ] **Performance First**: FCP <1.5s, LCP <2.5s, TTI <3.5s, Bundle <250KB
- [ ] **Observability**: Four-layer error handling implemented

### Architectural Constraints

- [ ] **Next.js App Router**: Routes organized in `(app)/` group
- [ ] **API Proxy Pattern**: All backend calls through `/app/api/v1/*`
- [ ] **Token Management**: Server-side only with 25-second cache
- [ ] **State Management**: TanStack Query (5min cache) + Zustand (UI state)
- [ ] **Import Boundaries**: No cross-feature imports, ESLint boundaries enforced

### Performance & Quality Standards

- [ ] **Performance Targets**: Lighthouse audit passing (FCP, LCP, TTI, CLS)
- [ ] **Bundle Size**: Initial <250KB, per-route <100KB
- [ ] **Accessibility**: WCAG 2.1 Level AA compliance (axe DevTools passing)
- [ ] **Security**: Input validation, no client-side tokens, sanitization

---

## Parallel Execution Opportunities

**Tasks that can run in parallel** (no dependencies or independent branches):

**Phase 1 (Setup)**: T001-T014 can run in any order (dependency chain: T001 → T002-T014)

**Phase 2 (Foundation)**:
- **Group A (Types)**: T019 → T020 → T021, T022 (sequential)
- **Group B (Validation)**: T023 → T024, T025 → T026, T027, T028 (after Group A)
- **Group C (API)**: T029 → T030 → T034 → T035, T031 → T032, T033 (after T022)
- **Group D (Hooks)**: T036 → T037, T038, T039 (after T003)
- **Group E (State)**: T040, T041 (after T004)
- **Group F (Components)**: T042-T046 (after T008, T023), T047-T049 (after T008), T050 (after T047-T049), T051 (after T004, T040)

**Phase 3-7 (Features)**: Each user story (US1-US5) is **fully independent** and can be built in parallel after Phase 2 completes.

**Example**: 5 developers can work on WHOIS, DNS, Health, RDAP, Screenshot simultaneously.

---

## Task Estimation

**Effort Level** (for experienced developer):

- **Setup & Foundation** (T001-T051): 1.5-2 days
- **Per User Story** (WHOIS, DNS, RDAP, Screenshot): 0.75-1 day each
- **Health Check** (simpler): 0.5 day
- **Polish & Integration**: 0.5 day

**Total Sequential**: 5-7 days
**Total Parallel (5 devs)**: 2-3 days

**MVP (User Story 1 only)**: 3-4 days

---

## Notes

1. **Test Coverage**: Each feature includes unit tests (hooks, services), integration tests (API routes), and E2E tests (user flows).
2. **API Integration**: All API routes follow the proxy pattern: `Client → Next.js API Route → Token Manager → Backend API`.
3. **Token Management**: T029 (token manager) is critical - must be completed before any API routes.
4. **Component Reuse**: Shared components (T042-T046) are used across all features, reducing duplication.
5. **Constitution Compliance**: Final checklist (bottom of document) must pass before feature is considered complete.
6. **Parallel Development**: Features (US1-US5) are fully isolated and can be developed concurrently by separate developers.
7. **Dynamic Imports**: Heavy components (JsonViewer, ScreenshotGallery) use dynamic imports for optimal bundle size.
8. **Accessibility**: Built-in from start (shadcn/ui components, semantic HTML, keyboard navigation).
9. **Security Enhancements (2026-01-07)**: Added T006a (DOMPurify installation), T027a/T027b (sanitization utility + tests), and T162a (npm audit) to ensure XSS prevention per constitution security requirements (FR-026, FR-027).
10. **Performance Gates**: T157 blocks deployment if Lighthouse scores fail (<90 desktop, <80 mobile) per constitution performance standards.

---

**Generated by**: `/speckit.tasks` command
**Based on**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)
