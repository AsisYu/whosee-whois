# Feature Specification: Domain Query Services Suite

**Feature Branch**: `001-domain-query-services`
**Created**: 2026-01-07
**Status**: Draft
**Input**: User description: "实现完整的域名信息查询服务套件，包括：1) WHOIS查询服务 2) RDAP协议查询服务 3) 系统健康检查API 4) DNS记录查询服务 5) 新版截图服务API。需要明确定义JWT token机制：token有效期30秒（单次使用），前端通过Next.js API Routes代理访问后端，token管理采用25秒TTL内存缓存（5秒缓冲）和single-flight模式避免并发重复请求。需要定义错误重试策略、API响应格式、性能目标（API响应<500ms p95）以及各服务的具体查询参数和返回数据结构。"

## Clarifications

### Session 2026-01-07

- Q: How long should query results (WHOIS, DNS, RDAP) be cached on the frontend before expiring? → A: 5 minutes - This balances performance and freshness. Backend already has 30-minute DNS cache and smart WHOIS TTL. Frontend 5-minute cache prevents redundant API calls in same session while keeping data reasonably fresh.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - WHOIS Domain Information Lookup (Priority: P1)

Users need to quickly查询 domain registration information (registrar, expiration date, registrant contact) to verify domain ownership, check availability, or investigate suspicious domains.

**Why this priority**: WHOIS is the foundational domain information service. Most users start their domain research with WHOIS lookups. This delivers immediate value and is the most frequently used query type.

**Independent Test**: Can be fully tested by entering a domain name (e.g., "example.com"), submitting the query, and verifying that registration details (registrar, creation date, expiration date, name servers) are displayed within 2 seconds.

**Acceptance Scenarios**:

1. **Given** user is on the WHOIS query page, **When** user enters a valid domain "example.com" and clicks "Query", **Then** system displays registrar name, registration date, expiration date, registrant information, and name servers within 2 seconds
2. **Given** user enters an invalid domain format "invalid@domain", **When** user submits the query, **Then** system shows a clear error message "Invalid domain format. Please enter a valid domain (e.g., example.com)" before making any backend request
3. **Given** user submits a query for a non-existent domain "thisdomaindoesnotexist123456.com", **When** backend returns "not found", **Then** system displays "Domain not found or not registered" message with suggestions to check spelling
4. **Given** user successfully queries a domain, **When** user clicks "Export JSON" button, **Then** system downloads a JSON file containing all query results
5. **Given** user has queried 3 domains in the current session, **When** user views query history, **Then** system displays the last 3 queries with timestamps and allows re-running any previous query

---

### User Story 2 - DNS Record Lookup (Priority: P2)

Users need to查询 DNS records (A, AAAA, CNAME, MX, TXT, NS) for a domain to troubleshoot email delivery issues, verify domain configuration, or investigate DNS security settings.

**Why this priority**: DNS lookup is the second most common query type. It's essential for technical users troubleshooting connectivity issues or verifying domain configurations.

**Independent Test**: Can be fully tested by entering a domain "google.com", selecting record type "MX", and verifying that mail server records are displayed with priority values and hostnames.

**Acceptance Scenarios**:

1. **Given** user is on the DNS query page, **When** user enters domain "google.com" and selects "MX records", **Then** system displays all MX records with priority values and mail server hostnames within 1.5 seconds
2. **Given** user wants to query multiple record types, **When** user selects "All Records", **Then** system displays A, AAAA, CNAME, MX, TXT, NS, and SOA records organized by type
3. **Given** user queries a domain with no MX records, **When** backend returns empty result set, **Then** system displays "No MX records found for this domain"
4. **Given** user views DNS query results, **When** user clicks "Copy" button next to any record, **Then** system copies the record value to clipboard and shows "Copied!" confirmation

---

### User Story 3 - System Health Monitoring (Priority: P3)

System administrators and monitoring tools need to check the availability and response time of all query services to ensure service reliability and trigger alerts when services are degraded.

**Why this priority**: Health checks are critical for operational monitoring but don't directly serve end-users. They enable proactive issue detection and SLA monitoring.

**Independent Test**: Can be fully tested by calling the health check endpoint and verifying it returns service status, response times, and backend connectivity within 200ms without requiring authentication.

**Acceptance Scenarios**:

1. **Given** monitoring system calls `/api/health` endpoint, **When** all backend services are operational, **Then** system returns HTTP 200 with JSON containing status "healthy", timestamp, and response times for each service
2. **Given** backend WHOIS service is unavailable, **When** health check runs, **Then** system returns HTTP 503 with status "degraded" and indicates which specific service is down
3. **Given** health check is called 100 times per minute, **When** monitoring spikes occur, **Then** system responds to all requests without rate limiting or performance degradation

---

### User Story 4 - RDAP Protocol Query (Priority: P4)

Advanced users need to query domain registration data using the modern RDAP protocol to access structured, machine-readable data with better internationalization support than legacy WHOIS.

**Why this priority**: RDAP is the modern successor to WHOIS but less commonly used. It's valuable for technical users needing structured data but not critical for MVP.

**Independent Test**: Can be fully tested by entering a domain "example.com", selecting "RDAP Query", and verifying that structured JSON response includes registration data with standardized field names and Unicode support.

**Acceptance Scenarios**:

1. **Given** user selects RDAP query mode, **When** user queries "example.com", **Then** system displays structured registration data in JSON format with standard RDAP fields (objectClassName, handle, status, entities)
2. **Given** user queries an internationalized domain name (IDN) like "例え.jp", **When** using RDAP, **Then** system correctly displays Unicode characters and punycode representation
3. **Given** RDAP query returns contact entities, **When** displaying results, **Then** system shows structured vCard data (name, email, address) in readable format

---

### User Story 5 - Website Screenshot Capture (Priority: P5)

Users need to capture visual screenshots of websites to preview domain content, verify site appearance, or document website state for security investigations.

**Why this priority**: Screenshot service is a valuable enhancement but not core to domain information queries. It's useful for visual verification but can be added after foundational query services are stable.

**Independent Test**: Can be fully tested by entering a URL "https://example.com", selecting viewport size "1920x1080", and verifying that a screenshot image loads within 10 seconds.

**Acceptance Scenarios**:

1. **Given** user enters URL "https://example.com", **When** user clicks "Capture Screenshot", **Then** system displays a loading indicator and shows the captured screenshot within 10 seconds
2. **Given** user selects viewport "Mobile (375x667)", **When** screenshot is captured, **Then** system renders the website in mobile viewport dimensions
3. **Given** screenshot capture fails (timeout or unreachable site), **When** error occurs, **Then** system displays "Unable to capture screenshot: [specific reason]" with option to retry
4. **Given** user successfully captures a screenshot, **When** user clicks "Download", **Then** system downloads the image as PNG file named "screenshot-[domain]-[timestamp].png"

---

### Edge Cases

- What happens when a user submits the same query twice within 5 seconds? (System should return cached results instantly without redundant backend calls)
- How does the system handle queries for domains with extremely long WHOIS records (>10KB)? (System should paginate or truncate display with "Show More" option)
- What happens when backend service is temporarily unavailable? (System should show user-friendly error "Service temporarily unavailable. Please try again in a moment" and log error for monitoring)
- How does the system handle rate limiting from backend or external WHOIS servers? (System should queue requests and show estimated wait time to user)
- What happens when token expiration (30 seconds) is reached during a long-running screenshot capture? (System should automatically refresh token server-side without user interaction)
- How does system handle concurrent requests from the same user for different services? (Single-flight pattern ensures each unique request only calls backend once, subsequent identical requests wait for first result)
- What happens when user's internet connection drops mid-query? (System should show connection error and allow retry without resubmitting form)
- How does system handle malicious input (SQL injection attempts, XSS payloads in domain field)? (System validates input format before backend call and sanitizes all displayed data)

## Requirements *(mandatory)*

### Functional Requirements

**WHOIS Query Service**:

- **FR-001**: System MUST accept domain names as input and validate format (alphanumeric characters, hyphens, dots, valid TLD) before processing
- **FR-002**: System MUST display WHOIS query results including: domain name, registrar, registration date, expiration date, updated date, registrant contact, administrative contact, technical contact, name servers, DNSSEC status
- **FR-003**: System MUST allow users to export query results as JSON format
- **FR-004**: System MUST store query history in browser local storage for the current session (last 10 queries minimum)
- **FR-005**: System MUST display query timestamps in user's local timezone

**DNS Query Service**:

- **FR-006**: System MUST support DNS record type selection: A, AAAA, CNAME, MX, TXT, NS, SOA, and "All Records" option
- **FR-007**: System MUST display DNS query results organized by record type with clear labels
- **FR-008**: System MUST show TTL (Time To Live) values for each DNS record
- **FR-009**: System MUST provide "Copy to Clipboard" functionality for individual records and full result sets
- **FR-010**: System MUST handle queries for subdomains (e.g., "www.example.com", "mail.example.com")

**System Health Check API**:

- **FR-011**: System MUST provide a public health check endpoint that returns service status without authentication
- **FR-012**: System MUST include in health check response: overall status (healthy/degraded/down), timestamp, individual service status (WHOIS, DNS, RDAP, Screenshot), response time metrics
- **FR-013**: System MUST respond to health check requests within 200ms under normal load
- **FR-014**: System MUST use HTTP status codes correctly: 200 (all healthy), 503 (one or more services degraded)

**RDAP Query Service**:

- **FR-015**: System MUST support RDAP queries and display results in structured format
- **FR-016**: System MUST handle internationalized domain names (IDN) with proper Unicode and Punycode conversion
- **FR-017**: System MUST display RDAP entities (registrar, registrant, admin, tech contacts) with role labels
- **FR-018**: System MUST show RDAP domain status flags (active, locked, transfer prohibited, etc.)

**Screenshot Service**:

- **FR-019**: System MUST accept URLs (http/https) and capture website screenshots
- **FR-020**: System MUST support viewport size selection: Desktop (1920x1080), Laptop (1366x768), Tablet (768x1024), Mobile (375x667)
- **FR-021**: System MUST display loading progress indicator during screenshot capture (estimated time remaining)
- **FR-022**: System MUST allow users to download captured screenshots as PNG format
- **FR-023**: System MUST handle screenshot timeouts gracefully (max 15 seconds per capture attempt)

**Authentication & Security**:

- **FR-024**: System MUST authenticate all backend API requests using short-lived tokens (30-second validity)
- **FR-025**: System MUST handle token expiration transparently without user intervention (automatic renewal on server-side)
- **FR-026**: System MUST validate all user input for security vulnerabilities (XSS, SQL injection) before processing
- **FR-027**: System MUST sanitize all displayed data from backend responses to prevent XSS attacks

**Error Handling & Retry**:

- **FR-028**: System MUST retry failed requests automatically using exponential backoff: 1st retry after 1 second, 2nd retry after 2 seconds, 3rd retry after 4 seconds, then fail
- **FR-029**: System MUST display user-friendly error messages that explain what went wrong and suggest next steps
- **FR-030**: System MUST log all errors server-side with request context for debugging
- **FR-031**: System MUST distinguish between temporary errors (retryable) and permanent errors (invalid input) and handle appropriately

**Performance & Caching**:

- **FR-032**: System MUST cache identical queries for 5 minutes on the frontend (TanStack Query) to reduce backend load and improve user experience during same session
- **FR-033**: System MUST prevent duplicate concurrent requests using single-flight pattern (multiple requests for same query wait for single backend call)
- **FR-034**: System MUST respond to user interactions (button clicks, form submissions) within 100ms with visual feedback (loading indicators)

**API Response Format**:

- **FR-035**: System MUST return all API responses in consistent JSON format with structure: `{ success: boolean, data: object | null, error: { code: string, message: string } | null, timestamp: ISO8601 }`
- **FR-036**: System MUST include request tracing IDs in all API responses for debugging
- **FR-037**: System MUST use standard HTTP status codes: 200 (success), 400 (invalid input), 401 (authentication required), 404 (not found), 429 (rate limited), 500 (server error), 503 (service unavailable)

### Key Entities

- **Domain Query**: Represents a user's request to查询 domain information. Attributes: domain name, query type (WHOIS/RDAP/DNS), timestamp, user session ID, result data, status (pending/success/failed)

- **Query Result**: Represents the data returned from backend services. Attributes: query ID, result type, raw data, parsed data, cache expiration time, backend response time

- **DNS Record**: Represents a single DNS resource record. Attributes: record type (A/AAAA/CNAME/MX/TXT/NS/SOA), domain name, value, TTL, priority (for MX records)

- **Screenshot Request**: Represents a website screenshot capture request. Attributes: URL, viewport size, capture timestamp, image data (base64 or URL), status (queued/processing/completed/failed), error message

- **Service Health Status**: Represents the health state of backend services. Attributes: service name, status (healthy/degraded/down), last check timestamp, response time, error count

- **Token Cache Entry**: Represents a cached authentication token (server-side only). Attributes: token value, creation timestamp, expiration time (25 seconds), associated request count

## Success Criteria *(mandatory)*

### Functional Outcomes

- **SC-001**: Users can successfully查询 WHOIS information for any registered domain and view results within 2 seconds
- **SC-002**: Users can查询 DNS records for common record types (A, MX, TXT) and receive accurate results within 1.5 seconds
- **SC-003**: System health check endpoint responds within 200ms and accurately reflects backend service availability
- **SC-004**: Users can export query results in JSON format with one click
- **SC-005**: 95% of queries complete successfully on first attempt without manual retry
- **SC-006**: Users can capture website screenshots within 10 seconds for responsive websites

### Performance Criteria (from Constitution)

- **SC-P01**: First Contentful Paint (FCP) **< 1.5 seconds** for all query pages
- **SC-P02**: Largest Contentful Paint (LCP) **< 2.5 seconds** for result displays
- **SC-P03**: Time to Interactive (TTI) **< 3.5 seconds** for query forms
- **SC-P04**: Cumulative Layout Shift (CLS) **< 0.1** during result rendering
- **SC-P05**: API response time (95th percentile) **< 500ms** for WHOIS and DNS queries (excluding screenshot service which allows up to 10 seconds)
- **SC-P06**: Client-side interaction response **< 100ms** for button clicks and form submissions

### Quality Criteria (from Constitution)

- **SC-Q01**: Test coverage **≥80%** for critical paths (query submission, result parsing, error handling, token management)
- **SC-Q02**: TypeScript compilation passes with `strict: true` (zero errors)
- **SC-Q03**: ESLint passes with zero errors
- **SC-Q04**: Lighthouse performance score **≥90 (desktop)**, **≥80 (mobile)**
- **SC-Q05**: WCAG 2.1 Level AA compliance (semantic HTML, keyboard navigation, proper contrast ratios for all result displays)
- **SC-Q06**: Zero high/critical npm audit vulnerabilities in dependencies

### Operational Criteria

- **SC-O01**: Token management system maintains 99.9% uptime with automatic recovery from cache failures
- **SC-O02**: Single-flight pattern reduces duplicate backend calls by at least 80% during concurrent requests
- **SC-O03**: Automatic retry mechanism successfully recovers from transient failures in 90% of cases
- **SC-O04**: System handles at least 100 concurrent users without performance degradation
- **SC-O05**: Query result caching reduces backend load by at least 60% for repeated queries

## Assumptions

1. **Backend Service Availability**: Backend Go/Gin service (in `docs/whosee-server/`) is operational and provides the following endpoints:
   - `POST /api/auth/token` - Token generation
   - `GET /api/v1/whois/:domain` - WHOIS query
   - `GET /api/v1/rdap/:domain` - RDAP query
   - `GET /api/v1/dns/:domain` - DNS query
   - `GET /api/v1/screenshot/:domain` - Screenshot capture
   - `POST /api/v1/screenshot/` - Unified screenshot API
   - `GET /api/health` - Health check

2. **Token Mechanism**: JWT tokens are generated by backend with 30-second expiration and are single-use. Frontend never directly holds or manages tokens - this is handled server-side by Next.js API Routes.

3. **Caching Strategy**:
   - **Token cache** (server-side): 25-second TTL (5-second buffer before backend 30-second expiration) stored in Next.js server memory
   - **Query result cache** (frontend): 5-minute TTL using TanStack Query for WHOIS, DNS, and RDAP queries
   - **Backend cache** (Redis): Backend maintains its own caching - WHOIS (dynamic TTL based on domain expiry), DNS (30 minutes), Screenshots (24 hours)

4. **Browser Support**: Modern browsers with JavaScript enabled, support for localStorage, and Fetch API.

5. **Network Conditions**: Users have stable internet connection with latency <200ms to backend services under normal conditions.

6. **Data Volume**: Individual query results typically <100KB. Screenshot images typically 200-500KB PNG format.

7. **Rate Limiting**: Backend services do not impose strict rate limits for authenticated requests. If rate limiting exists, system will handle 429 status codes gracefully.

8. **Internationalization**: System primarily serves English-speaking users but should handle IDN (Internationalized Domain Names) correctly.

9. **Query History Storage**: Query history is stored client-side in localStorage with 10MB storage limit. No server-side query history persistence required for MVP.

10. **Error Retry Policy**: Retry logic applies only to network errors and 5xx server errors, not to 4xx client errors (invalid input). Maximum 3 retry attempts before failing.
