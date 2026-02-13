/**
 * Common Types
 * Shared type definitions across the application
 */

/**
 * Base domain query entity
 * Represents a user's request to query domain information
 */
export interface DomainQuery {
  /** Unique identifier for this query */
  id: string

  /** Query type discriminator */
  type: 'whois' | 'rdap' | 'dns' | 'screenshot' | 'health'

  /** Domain name being queried */
  domain: string

  /** Query timestamp (ISO 8601) */
  timestamp: string

  /** User session ID (for analytics, optional) */
  sessionId?: string

  /** Query status */
  status: 'pending' | 'success' | 'failed'

  /** Error message if status is 'failed' */
  error?: {
    code: string
    message: string
  }

  /** Backend response time in milliseconds */
  responseTime?: number

  /** Whether result was served from cache */
  cached?: boolean
}

/**
 * Query history entry
 * Stored in browser localStorage
 */
export interface QueryHistoryEntry {
  /** Entry ID (UUID) */
  id: string

  /** Query type */
  type: 'whois' | 'rdap' | 'dns' | 'screenshot'

  /** Domain or URL queried */
  target: string

  /** Query timestamp (ISO 8601) */
  timestamp: string

  /** Query success status */
  success: boolean

  /** Cache key for retrieving from TanStack Query cache */
  cacheKey: string[]
}

/**
 * Query history collection (max 10 recent)
 */
export interface QueryHistory {
  /** History entries (sorted by timestamp desc) */
  entries: QueryHistoryEntry[]

  /** Last updated timestamp */
  lastUpdated: string

  /** Version (for future schema migrations) */
  version: number
}

/**
 * WHOIS query result entity
 * Extends DomainQuery with WHOIS-specific data
 */
export interface WhoisQueryResult extends DomainQuery {
  type: 'whois'
  data: {
    /** Whether domain is available for registration */
    available: boolean

    /** Domain name (normalized lowercase) */
    domain: string

    /** Registrar name */
    registrar: string | null

    /** Domain creation date (ISO 8601) */
    creationDate: string | null

    /** Domain expiration date (ISO 8601) */
    expiryDate: string | null

    /** Last updated date (ISO 8601) */
    updatedDate: string | null

    /** Domain status codes */
    status: string[]

    /** Name servers */
    nameServers: string[]

    /** DNSSEC status */
    dnssec: boolean | null

    /** Registrant contact (if available) */
    registrant?: {
      name?: string
      organization?: string
      email?: string
      country?: string
    }

    /** Administrative contact (if available) */
    admin?: {
      name?: string
      email?: string
    }

    /** Technical contact (if available) */
    tech?: {
      name?: string
      email?: string
    }

    /** Raw WHOIS text (for advanced users) */
    rawText?: string

    /** Backend source provider */
    sourceProvider: string
  }
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
  | 'ALL'      // All record types

/**
 * Individual DNS resource record
 */
export interface DNSRecord {
  /** Record type */
  type: DNSRecordType

  /** Domain name */
  name: string

  /** Record value (IP, hostname, text, etc.) */
  value: string

  /** Time to live (seconds) */
  ttl: number

  /** Priority (for MX records, optional) */
  priority?: number

  /** Class (typically 'IN' for Internet) */
  class?: string
}

/**
 * DNS query result entity
 * Contains DNS resource records for a domain
 */
export interface DNSQueryResult extends DomainQuery {
  type: 'dns'
  data: {
    /** Domain name queried */
    domain: string

    /** Record type queried */
    recordType: DNSRecordType

    /** DNS records returned */
    records: DNSRecord[]

    /** Query timestamp */
    timestamp: string

    /** DNS server used */
    dnsServer?: string
  }
}

/**
 * RDAP query result entity
 * RDAP (Registration Data Access Protocol) is modern successor to WHOIS
 */
export interface RDAPQueryResult extends DomainQuery {
  type: 'rdap'
  data: {
    /** Whether domain is available */
    available: boolean

    /** Domain name */
    domain: string

    /** Object class name (RDAP standard) */
    objectClassName: string

    /** Domain handle/ID */
    handle: string | null

    /** RDAP status values */
    status: string[]

    /** Entities (registrar, registrant, etc.) */
    entities: Array<{
      /** Entity role */
      role: 'registrar' | 'registrant' | 'administrative' | 'technical'

      /** vCard data */
      vcard: {
        name?: string
        organization?: string
        email?: string
        phone?: string
        address?: string
      }
    }>

    /** Name servers */
    nameServers: string[]

    /** Registration date (ISO 8601) */
    registrationDate: string | null

    /** Expiration date (ISO 8601) */
    expirationDate: string | null

    /** Last updated (ISO 8601) */
    lastUpdated: string | null

    /** RDAP server URL */
    rdapServer: string
  }
}

/**
 * Screenshot viewport preset
 */
export interface ScreenshotViewport {
  /** Viewport name */
  name: 'desktop' | 'laptop' | 'tablet' | 'mobile'

  /** Width in pixels */
  width: number

  /** Height in pixels */
  height: number
}

/** Preset viewports */
export const SCREENSHOT_VIEWPORTS: Record<string, ScreenshotViewport> = {
  desktop: { name: 'desktop', width: 1920, height: 1080 },
  laptop: { name: 'laptop', width: 1366, height: 768 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  mobile: { name: 'mobile', width: 375, height: 667 },
}

/**
 * Screenshot request entity
 * Represents a request to capture website screenshot
 */
export interface ScreenshotRequest {
  /** Unique request ID */
  id: string

  /** Target URL */
  url: string

  /** Viewport size */
  viewport: ScreenshotViewport

  /** Request timestamp (ISO 8601) */
  timestamp: string

  /** Request status */
  status: 'queued' | 'processing' | 'completed' | 'failed'

  /** Screenshot image data */
  imageData?: {
    /** Format (always 'png') */
    format: 'png'

    /** Image data (base64 encoded or URL) */
    data: string

    /** Data type ('base64' or 'url') */
    dataType: 'base64' | 'url'

    /** Image size in bytes */
    size: number

    /** Image dimensions */
    width: number
    height: number
  }

  /** Error message if status is 'failed' */
  error?: {
    code: string
    message: string
  }

  /** Processing time in milliseconds */
  processingTime?: number
}

/**
 * Overall health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'down'

/**
 * Individual service status
 */
export interface ServiceStatus {
  /** Service health */
  status: HealthStatus

  /** Response time in milliseconds */
  responseTime: number

  /** Last check timestamp (ISO 8601) */
  lastCheck: string

  /** Error count (rolling window) */
  errorCount: number

  /** Additional details */
  details?: string
}

/**
 * Service health status entity
 * Represents health state of backend services
 */
export interface ServiceHealthStatus {
  /** Overall system status */
  overall: HealthStatus

  /** Check timestamp (ISO 8601) */
  timestamp: string

  /** Individual service statuses */
  services: {
    whois: ServiceStatus
    rdap: ServiceStatus
    dns: ServiceStatus
    screenshot: ServiceStatus
  }

  /** System information */
  system?: {
    /** Backend version */
    version: string

    /** Uptime in seconds */
    uptime: number
  }
}
