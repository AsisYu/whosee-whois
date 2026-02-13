# Phase 1: Data Model & Entities

**Feature**: Domain Query Services Suite
**Date**: 2026-01-07
**Status**: Completed

## Overview

This document defines the data structures, entities, and type definitions for the domain query services suite. All types follow TypeScript strict mode and are organized according to MVVM layer separation (Model layer types).

## Entity Relationship Diagram

```
┌─────────────────┐
│  Domain Query   │──┐
│  (base entity)  │  │
└─────────────────┘  │
                     │
        ┌────────────┼────────────┬────────────┬────────────┐
        │            │            │            │            │
┌───────▼───────┐ ┌──▼────────┐ ┌▼──────────┐ ┌▼──────────┐ ┌▼────────────┐
│ WHOIS Query   │ │ RDAP Query│ │ DNS Query │ │Screenshot │ │ Health Check│
│   Result      │ │  Result   │ │  Result   │ │  Request  │ │   Status    │
└───────────────┘ └───────────┘ └───────────┘ └───────────┘ └─────────────┘
        │                │            │             │
        │                │            └─────┬───────┘
        │                │                  │
        │                │            ┌─────▼─────┐
        │                │            │ DNS Record│
        │                │            └───────────┘
        │                │
        └────────────────┴──────────┐
                                    │
                              ┌─────▼──────┐
                              │Query History│
                              │(localStorage)│
                              └────────────┘
```

## Core Entities

### 1. DomainQuery (Base)

Base entity for all domain-related queries.

**Location**: `lib/types/common.ts`

```typescript
/**
 * Base domain query entity
 * Represents a user's request to query domain information
 */
export interface DomainQuery {
  /** Unique identifier for this query */
  id: string;

  /** Query type discriminator */
  type: 'whois' | 'rdap' | 'dns' | 'screenshot' | 'health';

  /** Domain name being queried */
  domain: string;

  /** Query timestamp (ISO 8601) */
  timestamp: string;

  /** User session ID (for analytics, optional) */
  sessionId?: string;

  /** Query status */
  status: 'pending' | 'success' | 'failed';

  /** Error message if status is 'failed' */
  error?: {
    code: string;
    message: string;
  };

  /** Backend response time in milliseconds */
  responseTime?: number;

  /** Whether result was served from cache */
  cached?: boolean;
}
```

**Validation Rules**:
- `id`: UUID v4 format
- `domain`: Valid domain format (lowercase alphanumeric + hyphens + dots)
- `timestamp`: ISO 8601 format
- `status`: One of three enum values
- `responseTime`: Positive integer if present

**State Transitions**:
```
pending → success (with responseTime)
pending → failed (with error)
```

### 2. WhoisQueryResult

WHOIS query result with registration information.

**Location**: `lib/types/api.ts`

```typescript
/**
 * WHOIS query result entity
 * Extends DomainQuery with WHOIS-specific data
 */
export interface WhoisQueryResult extends DomainQuery {
  type: 'whois';
  data: {
    /** Whether domain is available for registration */
    available: boolean;

    /** Domain name (normalized lowercase) */
    domain: string;

    /** Registrar name */
    registrar: string | null;

    /** Domain creation date (ISO 8601) */
    creationDate: string | null;

    /** Domain expiration date (ISO 8601) */
    expiryDate: string | null;

    /** Last updated date (ISO 8601) */
    updatedDate: string | null;

    /** Domain status codes */
    status: string[];

    /** Name servers */
    nameServers: string[];

    /** DNSSEC status */
    dnssec: boolean | null;

    /** Registrant contact (if available) */
    registrant?: {
      name?: string;
      organization?: string;
      email?: string;
      country?: string;
    };

    /** Administrative contact (if available) */
    admin?: {
      name?: string;
      email?: string;
    };

    /** Technical contact (if available) */
    tech?: {
      name?: string;
      email?: string;
    };

    /** Raw WHOIS text (for advanced users) */
    rawText?: string;

    /** Backend source provider */
    sourceProvider: string;
  };
}
```

**Validation Rules**:
- `available`: Boolean, required
- `creationDate`, `expiryDate`, `updatedDate`: ISO 8601 dates or null
- `status`: Array of strings, may be empty
- `nameServers`: Array of strings (valid hostnames)
- `email`: Valid email format if present

**Data Volume**: Typically 2-10 KB JSON

### 3. RDAPQueryResult

RDAP query result with structured registration data.

**Location**: `lib/types/api.ts`

```typescript
/**
 * RDAP query result entity
 * RDAP (Registration Data Access Protocol) is modern successor to WHOIS
 */
export interface RDAPQueryResult extends DomainQuery {
  type: 'rdap';
  data: {
    /** Whether domain is available */
    available: boolean;

    /** Domain name */
    domain: string;

    /** Object class name (RDAP standard) */
    objectClassName: string;

    /** Domain handle/ID */
    handle: string | null;

    /** RDAP status values */
    status: string[];

    /** Entities (registrar, registrant, etc.) */
    entities: Array<{
      /** Entity role */
      role: 'registrar' | 'registrant' | 'administrative' | 'technical';

      /** vCard data */
      vcard: {
        name?: string;
        organization?: string;
        email?: string;
        phone?: string;
        address?: string;
      };
    }>;

    /** Name servers */
    nameServers: string[];

    /** Registration date (ISO 8601) */
    registrationDate: string | null;

    /** Expiration date (ISO 8601) */
    expirationDate: string | null;

    /** Last updated (ISO 8601) */
    lastUpdated: string | null;

    /** RDAP server URL */
    rdapServer: string;
  };
}
```

**Validation Rules**:
- `objectClassName`: Must be 'domain'
- `entities`: Array of entity objects with valid roles
- `vcard`: Optional fields, email must be valid format

**Data Volume**: Typically 3-15 KB JSON

### 4. DNSQueryResult

DNS query result with resource records.

**Location**: `lib/types/api.ts`

```typescript
/**
 * DNS query result entity
 * Contains DNS resource records for a domain
 */
export interface DNSQueryResult extends DomainQuery {
  type: 'dns';
  data: {
    /** Domain name queried */
    domain: string;

    /** Record type queried ('A', 'AAAA', 'MX', etc. or 'ALL') */
    recordType: DNSRecordType;

    /** DNS records returned */
    records: DNSRecord[];

    /** Query timestamp */
    timestamp: string;

    /** DNS server used */
    dnsServer?: string;
  };
}

/**
 * DNS record types
 */
export type DNSRecordType =
  | 'A'        // IPv4 address
  | 'AAAA'     // IPv6 address
  | 'CNAME'    // Canonical name
  | 'MX'       // Mail exchange
  | 'TXT'      // Text record
  | 'NS'       // Name server
  | 'SOA'      // Start of authority
  | 'ALL';     // All record types

/**
 * Individual DNS resource record
 */
export interface DNSRecord {
  /** Record type */
  type: DNSRecordType;

  /** Domain name */
  name: string;

  /** Record value (IP, hostname, text, etc.) */
  value: string;

  /** Time to live (seconds) */
  ttl: number;

  /** Priority (for MX records, optional) */
  priority?: number;

  /** Class (typically 'IN' for Internet) */
  class?: string;
}
```

**Validation Rules**:
- `type`: One of defined DNSRecordType enum values
- `ttl`: Positive integer
- `priority`: Required for MX records, positive integer
- `value`: Format depends on type (IP address for A/AAAA, hostname for CNAME/MX, etc.)

**Data Volume**: Typically 0.5-5 KB JSON (depends on record count)

### 5. ScreenshotRequest

Website screenshot capture request.

**Location**: `lib/types/api.ts`

```typescript
/**
 * Screenshot request entity
 * Represents a request to capture website screenshot
 */
export interface ScreenshotRequest {
  /** Unique request ID */
  id: string;

  /** Target URL */
  url: string;

  /** Viewport size */
  viewport: ScreenshotViewport;

  /** Request timestamp (ISO 8601) */
  timestamp: string;

  /** Request status */
  status: 'queued' | 'processing' | 'completed' | 'failed';

  /** Screenshot image data */
  imageData?: {
    /** Format (always 'png') */
    format: 'png';

    /** Image data (base64 encoded or URL) */
    data: string;

    /** Data type ('base64' or 'url') */
    dataType: 'base64' | 'url';

    /** Image size in bytes */
    size: number;

    /** Image dimensions */
    width: number;
    height: number;
  };

  /** Error message if status is 'failed' */
  error?: {
    code: string;
    message: string;
  };

  /** Processing time in milliseconds */
  processingTime?: number;
}

/**
 * Screenshot viewport preset
 */
export interface ScreenshotViewport {
  /** Viewport name */
  name: 'desktop' | 'laptop' | 'tablet' | 'mobile';

  /** Width in pixels */
  width: number;

  /** Height in pixels */
  height: number;
}

/** Preset viewports */
export const SCREENSHOT_VIEWPORTS: Record<string, ScreenshotViewport> = {
  desktop: { name: 'desktop', width: 1920, height: 1080 },
  laptop: { name: 'laptop', width: 1366, height: 768 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  mobile: { name: 'mobile', width: 375, height: 667 },
};
```

**Validation Rules**:
- `url`: Valid HTTP/HTTPS URL
- `viewport`: One of preset viewports
- `imageData.data`: Base64 string or valid URL if present
- `imageData.size`: Positive integer
- `processingTime`: Positive integer, typically <15000ms

**State Transitions**:
```
queued → processing → completed (with imageData)
queued → processing → failed (with error)
```

**Data Volume**: Typically 200-500 KB (base64 PNG image)

### 6. ServiceHealthStatus

Backend service health check status.

**Location**: `lib/types/api.ts`

```typescript
/**
 * Service health status entity
 * Represents health state of backend services
 */
export interface ServiceHealthStatus {
  /** Overall system status */
  overall: HealthStatus;

  /** Check timestamp (ISO 8601) */
  timestamp: string;

  /** Individual service statuses */
  services: {
    whois: ServiceStatus;
    rdap: ServiceStatus;
    dns: ServiceStatus;
    screenshot: ServiceStatus;
  };

  /** System information */
  system?: {
    /** Backend version */
    version: string;

    /** Uptime in seconds */
    uptime: number;
  };
}

/**
 * Overall health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'down';

/**
 * Individual service status
 */
export interface ServiceStatus {
  /** Service health */
  status: HealthStatus;

  /** Response time in milliseconds */
  responseTime: number;

  /** Last check timestamp (ISO 8601) */
  lastCheck: string;

  /** Error count (rolling window) */
  errorCount: number;

  /** Additional details */
  details?: string;
}
```

**Validation Rules**:
- `overall`: One of three enum values
- `responseTime`: Positive integer
- `errorCount`: Non-negative integer
- `timestamp`, `lastCheck`: ISO 8601 format

**Health Status Mapping**:
```
healthy: All services operational
degraded: One or more services experiencing issues
down: Critical service(s) unavailable
```

**Data Volume**: Typically 0.5-1 KB JSON

### 7. QueryHistory (Client-Side)

Query history stored in localStorage.

**Location**: `lib/types/common.ts`

```typescript
/**
 * Query history entry
 * Stored in browser localStorage
 */
export interface QueryHistoryEntry {
  /** Entry ID (UUID) */
  id: string;

  /** Query type */
  type: 'whois' | 'rdap' | 'dns' | 'screenshot';

  /** Domain or URL queried */
  target: string;

  /** Query timestamp (ISO 8601) */
  timestamp: string;

  /** Query success status */
  success: boolean;

  /** Cache key for retrieving from TanStack Query cache */
  cacheKey: string[];
}

/**
 * Query history collection (max 10 recent)
 */
export interface QueryHistory {
  /** History entries (sorted by timestamp desc) */
  entries: QueryHistoryEntry[];

  /** Last updated timestamp */
  lastUpdated: string;

  /** Version (for future schema migrations) */
  version: number;
}
```

**Storage Rules**:
- Maximum 10 entries (FIFO when exceeded)
- Stored in `localStorage` under key `whosee-query-history`
- Entries sorted by timestamp (most recent first)
- Expired entries removed on app load

**Data Volume**: ~2-5 KB in localStorage

## Type Utilities

**Location**: `lib/types/utils.ts`

```typescript
/**
 * Type guard: Check if query result is successful
 */
export function isSuccessfulQuery<T extends DomainQuery>(
  query: T
): query is T & { status: 'success'; responseTime: number } {
  return query.status === 'success';
}

/**
 * Type guard: Check if query result has error
 */
export function isFailedQuery<T extends DomainQuery>(
  query: T
): query is T & { status: 'failed'; error: { code: string; message: string } } {
  return query.status === 'failed';
}

/**
 * Extract data type from query result
 */
export type QueryData<T extends DomainQuery> = T extends { data: infer D } ? D : never;

/**
 * Utility: Generate cache key for TanStack Query
 */
export function getQueryKey(type: DomainQuery['type'], target: string): string[] {
  return [type, target.toLowerCase().trim()];
}
```

## Data Transformations

### Backend DTO → Frontend Model

Services in `lib/services/*` transform backend responses to frontend types:

```typescript
// lib/services/whois-service.ts
function mapBackendWhoisResponse(backend: BackendWhoisResponse): WhoisQueryResult['data'] {
  return {
    available: backend.available,
    domain: backend.domain.toLowerCase(),
    registrar: backend.registrar || null,
    creationDate: backend.creationDate || null,
    expiryDate: backend.expiryDate || null,
    updatedDate: backend.updatedDate || null,
    status: backend.status || [],
    nameServers: backend.nameServers || [],
    dnssec: backend.dnssec ?? null,
    registrant: backend.registrant ? {
      name: backend.registrant.name,
      organization: backend.registrant.organization,
      email: backend.registrant.email,
      country: backend.registrant.country,
    } : undefined,
    rawText: backend.rawText,
    sourceProvider: backend.sourceProvider || 'unknown',
  };
}
```

### Display Formatting

Components use formatters from `lib/utils/format.ts`:

```typescript
// lib/utils/format.ts
export function formatDate(isoString: string | null): string {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatResponseTime(ms: number): string {
  return `${ms}ms`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

## Summary

All data models defined with:
- ✅ TypeScript strict mode compliance
- ✅ Validation rules documented
- ✅ State transitions specified
- ✅ Data volume estimates provided
- ✅ Clear MVVM layer assignment (Model layer)
- ✅ Type utilities for type guards and transformations

Ready for contract generation (Phase 1 continued).
