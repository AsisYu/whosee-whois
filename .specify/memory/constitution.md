<!--
SYNC IMPACT REPORT
==================
Version Change: Initial Constitution → 1.0.0
Change Type: MINOR (new constitution establishment)

Modified Principles: N/A (initial creation)

Added Sections:
  - All core principles (I through VII)
  - Architectural Constraints
  - Performance & Quality Standards
  - Governance

Removed Sections: N/A

Templates Requiring Updates:
  ✅ plan-template.md - Updated constitution check gates
  ✅ spec-template.md - Aligned success criteria with performance standards
  ✅ tasks-template.md - Incorporated test-first approach and quality gates

Follow-up TODOs: None - all placeholders filled
-->

# Whosee.me Frontend Constitution

## Core Principles

### I. Feature-First Architecture (NON-NEGOTIABLE)

Code MUST be organized by business feature (WHOIS, DNS, Screenshot, ITDog) rather than technical type.

**Rules:**
- Each feature MUST be self-contained within `features/[feature-name]/` directory
- Features MUST include: `components/` (View), `hooks/` (ViewModel), `types.ts`
- Features MUST NOT import from other features - only from `lib/` and `components/`
- Cross-feature functionality MUST be extracted to `lib/` or `components/shared/`

**Rationale:** Feature isolation enables independent development, testing, and maintenance. It prevents cascading changes across unrelated functionality and supports team scalability.

### II. MVVM Layer Separation (NON-NEGOTIABLE)

Clear separation between Model-ViewModel-View layers MUST be maintained.

**Rules:**
- **View Layer** (`app/*/page.tsx`, `components/`, `features/*/components/`):
  - MUST only render UI and handle presentation logic
  - MUST NOT directly call API services or contain business logic
  - MUST receive data via props and trigger events via callbacks

- **ViewModel Layer** (`features/*/hooks/`, `app/actions/`, `app/api/`):
  - MUST encapsulate complete business logic and data transformation
  - MUST handle all user interactions, state management, and orchestration
  - MUST return objects (not arrays) for clarity unless order is semantically important

- **Model Layer** (`lib/services/`, `lib/api/`, `store/`, TanStack Query):
  - MUST handle all data fetching, business rules, and validation
  - MUST NOT import or reference UI components
  - MUST define TypeScript types in `lib/types/` or feature `types.ts`

**Rationale:** Layer separation ensures testability, reusability, and prevents architectural decay. Business logic in hooks/services can be unit tested without rendering components.

### III. Test-Driven Quality (RECOMMENDED)

High-quality code with comprehensive testing coverage is expected.

**Rules:**
- Unit tests MUST cover:
  - Pure utility functions (`lib/utils/*`)
  - Custom hooks (`features/*/hooks/*`) with React Testing Library
  - Data transformation logic (`features/*/services/*`)

- Integration tests MUST cover:
  - API Route Handlers (`app/api/*/route.ts`)
  - Service layer integration with backend APIs
  - TanStack Query hook integration

- E2E tests MUST cover:
  - Critical user journeys (WHOIS query, DNS lookup, screenshot capture)
  - Complete feature workflows from user input to result display

- Test coverage target: **80%+ for critical paths**

**Rationale:** Testing prevents regression, documents expected behavior, and enables confident refactoring. TDD approach (when practical) leads to better-designed, more modular code.

### IV. Single Responsibility & Simplicity (NON-NEGOTIABLE)

Components and functions MUST do one thing well. Avoid premature abstraction.

**Rules:**
- React components MUST be under 300 lines; hooks under 150 lines; services under 400 lines
- Components MUST have single responsibility - split if handling multiple concerns
- Props MUST be minimized - only pass required fields, not entire objects
- Three instances of duplication required before creating abstraction (avoid premature DRY)
- No unused parameters, backward-compatibility hacks, or speculative features

**Rationale:** Small, focused units are easier to understand, test, and maintain. Premature abstraction creates unnecessary complexity.

### V. Type Safety & Validation (NON-NEGOTIABLE)

TypeScript MUST be strictly enforced; external data MUST be validated.

**Rules:**
- `strict: true` in `tsconfig.json` - no `any` types except truly dynamic data
- API response types MUST be defined in `lib/types/api.ts`
- Feature-specific types in `features/*/types.ts`
- Input validation MUST occur at system boundaries:
  - User input forms - validate before submission
  - API Route handlers - validate incoming requests
  - Service layer - validate domain format, parameters
- Internal code and framework guarantees MUST be trusted (no redundant validation)
- Use Zod or similar for runtime validation at boundaries

**Rationale:** Type safety catches errors at compile time. Validation at boundaries prevents invalid data propagation and clarifies trust boundaries.

### VI. Performance First

User experience MUST prioritize fast load times and responsive interactions.

**Rules:**
- React.memo MUST be used for pure presentational components with expensive renders
- useMemo/useCallback MUST cache expensive computations and stable callbacks
- Dynamic imports MUST be used for:
  - Heavy visualization libraries (JSON viewers, charts)
  - Components not visible on initial render
  - Route-based code splitting (automatic via Next.js App Router)
- Images MUST use `next/image` for automatic optimization
- API responses MUST be cached via TanStack Query with appropriate `staleTime`
- Lighthouse performance score target: **≥90 on desktop**, **≥80 on mobile**

**Rationale:** Performance directly impacts user satisfaction and SEO. React optimization prevents wasted renders; code splitting reduces initial bundle size.

### VII. Observability & Error Handling

Failures MUST be observable and gracefully handled at all layers.

**Rules:**
- Four-layer error handling:
  1. **API Layer** (`lib/api/client.ts`): Network errors, HTTP status codes
  2. **Service Layer** (`lib/services/*`): Business validation errors, domain-specific errors
  3. **Hook Layer** (`features/*/hooks/*`): User-friendly error messages, toast notifications
  4. **Component Layer**: UI fallbacks, error boundaries for component failures

- Custom error classes MUST be defined for domain errors:
  - `ValidationError`, `DomainNotFoundError`, `ApiError`, `NetworkError`

- Errors MUST be logged with context:
  - User action that triggered the error
  - Timestamp, user agent, request payload (sanitized)
  - Stack trace for unexpected errors

- User-facing errors MUST be:
  - Clear, actionable messages in user's language
  - Non-technical (avoid exposing internal implementation details)
  - Include suggested next steps when possible

**Rationale:** Layered error handling ensures appropriate responses at each level. Observable errors enable rapid debugging and issue resolution.

## Architectural Constraints

### Next.js App Router Patterns

**Route Organization:**
- Route groups MUST be used for layout isolation:
  - `(app)/` for main application features (Header + Sidebar layout)
  - `(content)/` RESERVED for future CMS content (blog, docs)
- Page components MUST only handle routing and layout composition
- Server Components MUST be default; `"use client"` only when necessary

**API Proxy Pattern (NON-NEGOTIABLE):**
- All backend API calls MUST go through Next.js API Routes (`app/api/v1/*`)
- Client components MUST NEVER call backend directly
- API Routes MUST handle:
  - JWT token injection via server-side token manager
  - Centralized error handling and transformation
  - Backend credential management (BACKEND_API_KEY)

**Token Management:**
- Backend JWT tokens expire in 30 seconds and are single-use
- Single-flight token pattern:
  - Token fetching MUST use memory cache with 25-second TTL (5-second buffer)
  - Concurrent requests MUST await the same token fetch (no duplicate requests)
- Token management MUST be server-side only in `/app/api/internal/token/`

### State Management Decision Tree

**Server Data** (API responses):
- MUST use TanStack Query with appropriate `staleTime` and `cacheTime`
- Examples: WHOIS results, DNS records, health check status

**UI State** (theme, dialogs, sidebar state):
- MUST use Zustand for cross-component state
- Examples: dark mode toggle, notification queue, sidebar collapsed state

**Form State** (inputs, validation):
- MUST use `useState` + `react-hook-form` for complex forms
- MUST use `useState` for simple single-field inputs
- Examples: domain input, search filters

**URL State** (shareable, SEO-relevant):
- MUST use Next.js `useSearchParams` / `useRouter`
- Examples: search queries, pagination, filter parameters

### Import Boundaries (Enforced by ESLint)

**Allowed:**
- ✅ `app/*` MAY import from `features/*`, `components/*`, `lib/*`
- ✅ `features/*` MAY import from `components/*`, `lib/*`
- ✅ `components/*` MAY import from `lib/*`
- ✅ `lib/*` MAY import from other `lib/*` modules

**Forbidden:**
- ❌ `features/*` MUST NOT import from other `features/*`
- ❌ `components/ui/*` MUST NOT import from `lib/services/*`
- ❌ `lib/*` MUST NOT import from upper layers (`features`, `components`, `app`)

Violations MUST be caught by `eslint-plugin-boundaries` during CI/CD.

## Performance & Quality Standards

### Performance Targets

**Load Performance:**
- First Contentful Paint (FCP): **< 1.5 seconds**
- Largest Contentful Paint (LCP): **< 2.5 seconds**
- Time to Interactive (TTI): **< 3.5 seconds**
- Cumulative Layout Shift (CLS): **< 0.1**

**Runtime Performance:**
- API response time (95th percentile): **< 500ms** (including token fetch)
- Client-side interaction response: **< 100ms** (button clicks, input typing)
- Query cache hit ratio: **> 70%** for repeated requests

**Bundle Size:**
- Initial JavaScript bundle: **< 250 KB** (gzipped)
- Per-route code split chunks: **< 100 KB** each (gzipped)
- CSS: **< 50 KB** (gzipped)

### Code Quality Gates

**Pre-commit:**
- TypeScript compilation MUST pass with `strict: true`
- ESLint MUST pass with zero errors (warnings allowed if justified)
- Prettier formatting MUST be enforced

**Pre-merge (CI/CD):**
- All tests MUST pass (unit + integration + E2E for affected features)
- Test coverage MUST be ≥80% for modified files
- Bundle size MUST NOT increase by >10% without justification
- Lighthouse CI score MUST be ≥90 (desktop), ≥80 (mobile)
- No new `any` types introduced (allowlist exceptions documented)

### Accessibility Requirements

**WCAG 2.1 Level AA Compliance:**
- Semantic HTML MUST be used (nav, main, article, aside, section)
- All interactive elements MUST be keyboard accessible
- Form inputs MUST have associated labels
- Color contrast MUST meet 4.5:1 ratio for normal text, 3:1 for large text
- Focus indicators MUST be visible and clear
- ARIA labels MUST be provided where semantic HTML insufficient

### Security Standards

**Input Validation:**
- All user input MUST be validated before processing
- Domain names MUST be validated against regex pattern
- No code injection vulnerabilities (SQL, XSS, command injection)

**Authentication:**
- JWT tokens MUST NEVER be exposed to client (server-side only)
- Environment variables with secrets MUST NOT be prefixed with `NEXT_PUBLIC_`
- API keys and credentials MUST be stored server-side only

**Dependencies:**
- npm audit MUST show zero high/critical vulnerabilities
- Dependencies MUST be reviewed before major version upgrades
- Renovate bot MUST keep dependencies up-to-date with automated testing

## Governance

### Amendment Process

**Proposal:**
1. Create GitHub issue with `[Constitution Amendment]` label
2. Document: rationale, affected code, migration plan, version bump justification

**Approval:**
- Requires review and approval from at least 2 core maintainers
- Must demonstrate alignment with project goals and architecture

**Implementation:**
- Update `.specify/memory/constitution.md` with new version
- Update dependent templates (`plan-template.md`, `spec-template.md`, `tasks-template.md`)
- Update `CLAUDE.md` if runtime guidance changes
- Create migration guide for breaking changes

### Versioning Policy

**Semantic Versioning (MAJOR.MINOR.PATCH):**

**MAJOR** (e.g., 1.0.0 → 2.0.0):
- Backward-incompatible governance changes
- Principle removal or complete redefinition
- Architectural pattern changes requiring codebase refactoring

**MINOR** (e.g., 1.0.0 → 1.1.0):
- New principle added
- Section materially expanded with new requirements
- New quality gates or standards introduced

**PATCH** (e.g., 1.0.0 → 1.0.1):
- Clarifications and wording improvements
- Typo fixes, formatting, non-semantic refinements
- Example updates without changing rules

### Compliance Review

**Per Pull Request:**
- All PRs MUST reference constitution principles in description
- Constitution violations MUST be justified or fixed before merge
- Architectural decisions MUST cite relevant principles

**Quarterly:**
- Architecture review against constitution compliance
- Identify technical debt and architectural drift
- Update constitution if patterns have evolved appropriately

**Guidance Document:**
- Runtime development guidance in `CLAUDE.md` (project-level)
- User global instructions in `~/.claude/CLAUDE.md`
- Constitution supersedes contradictions with guidance documents

### Codex MCP Integration

**Required Workflow:**
1. **Requirement Analysis:** Consult Codex MCP for implementation plan refinement
2. **Code Prototype:** Request Codex provide unified diff patch (read-only sandbox, no actual changes)
3. **Rewrite:** Use Codex prototype as logical reference; rewrite to enterprise-grade quality
4. **Review:** After implementation, use Codex to review code changes against requirements
5. **Challenge:** Question Codex responses when appropriate; seek unified truth through debate

**Tool Parameters:**
- `sandbox: "read-only"` MUST be used (Codex NEVER makes direct modifications)
- `SESSION_ID` MUST be tracked for multi-turn conversations
- `cd` parameter MUST point to repository root: `/home/biaogeai002/desktop/whosee-whois/whois-web`

### Complexity Justification

When constitution violations are necessary:
- Document in implementation plan's "Complexity Tracking" section
- Explain why needed and what simpler alternatives were rejected
- Include mitigation plan and future refactoring strategy

---

**Version**: 1.0.0 | **Ratified**: 2026-01-07 | **Last Amended**: 2026-01-07
