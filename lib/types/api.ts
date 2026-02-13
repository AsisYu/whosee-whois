/**
 * API Types
 * Type definitions for API requests and responses
 */

/**
 * Backend JWT token response
 */
export interface TokenResponse {
  token: string
  expiresIn?: number
  issuedAt?: string
}

/**
 * Backend error response format
 * Based on docs/whosee-server/docs/ALL_JSON.md
 */
export interface BackendErrorResponse {
  error: string
  message: string
  timestamp?: string
  path?: string
  [key: string]: unknown
}

/**
 * Successful API response wrapper
 */
export interface ApiSuccess<T> {
  data: T
  status: number
}

/**
 * API Error initialization parameters
 */
type ApiErrorInit = {
  status: number
  message: string
  code?: string
  details?: unknown
  cause?: unknown
}

/**
 * Custom API Error class
 * Extends Error with additional context for API failures
 */
export class ApiError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly details?: unknown

  constructor({ status, message, code, details, cause }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details

    // Attach cause if provided (Error.cause support)
    if (cause) {
      ;(this as Error & { cause?: unknown }).cause = cause
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /**
   * Helper to check if error is an ApiError instance
   */
  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
  }

  /**
   * Convert any error to ApiError
   */
  static fromError(error: unknown, status = 500): ApiError {
    if (ApiError.isApiError(error)) {
      return error
    }

    return new ApiError({
      status,
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNKNOWN_ERROR',
      cause: error,
    })
  }
}

/**
 * DNS Record Types
 * All supported DNS record query types
 */
export const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR'] as const
export type DnsRecordType = (typeof DNS_RECORD_TYPES)[number]

/**
 * Normalized DNS error codes
 * Provides finite set of error codes for UI error handling and user messaging
 */
export const DNS_ERROR_CODES = [
  'INVALID_DOMAIN', // Domain format validation failed
  'INVALID_TYPE', // DNS record type validation failed
  'DNS_LOOKUP_FAILED', // General DNS lookup failure
  'NXDOMAIN', // Domain does not exist in DNS
  'SERVFAIL', // Authoritative server failed to respond
  'REFUSED', // DNS server refused the query
  'REQUEST_FAILED', // Network/fetch error
  'REQUEST_TIMEOUT', // DNS query timed out
] as const
export type DnsErrorCode = (typeof DNS_ERROR_CODES)[number]

/**
 * Base DNS Record structure
 * Common fields for all DNS record types
 */
export interface DnsRecordBase {
  type: DnsRecordType
  name: string
  ttl: number
  value: string
}

/**
 * MX Record with priority
 * Mail exchange record with priority ranking
 */
export interface DnsMxRecord extends DnsRecordBase {
  type: 'MX'
  priority: number
}

/**
 * SOA Record with zone metadata
 * Start of Authority record containing zone management information
 */
export interface DnsSoaRecord extends DnsRecordBase {
  type: 'SOA'
  serial: number
  refresh: number
  retry: number
  expire: number
  minimum: number
  primaryNs: string
  adminEmail: string
}

/**
 * Union of all DNS record types
 */
export type DnsRecord = DnsRecordBase | DnsMxRecord | DnsSoaRecord

/**
 * DNS records grouped by type
 * Maps record type to array of records of that type
 */
export type DnsRecordMap = Partial<Record<DnsRecordType, DnsRecord[]>>

/**
 * DNS query response data
 */
export interface DnsData {
  /** The queried domain name */
  domain: string

  /** Record types requested in the query */
  requestedTypes: DnsRecordType[]

  /** Record types that returned results */
  resolvedTypes: DnsRecordType[]

  /** DNS records grouped by type */
  records: DnsRecordMap
}

/**
 * DNS query response metadata
 */
export interface DnsMeta {
  /** Query timestamp (ISO 8601 format) */
  timestamp: string

  /** Whether the result was served from cache */
  cached: boolean

  /** Cache timestamp if cached (ISO 8601 format) */
  cachedAt?: string | null

  /** Query processing time in milliseconds */
  processing?: number | null
}

/**
 * Complete DNS API response
 * Top-level structure returned by backend
 */
export interface DnsResponse {
  /** Success indicator */
  success: boolean

  /** DNS query data */
  data: DnsData

  /** Query metadata */
  meta: DnsMeta
}

/**
 * WHOIS data from backend API
 * Contains all domain registration information
 */
export interface WhoisData {
  /** Whether the domain is available for registration */
  available: boolean

  /** The queried domain name */
  domain: string

  /** Domain registrar company name */
  registrar: string | null

  /** Domain creation date (ISO 8601 format) */
  creationDate: string | null

  /** Domain expiry date (ISO 8601 format) */
  expiryDate: string | null

  /** Last update date (ISO 8601 format) */
  updatedDate: string | null

  /** Domain status flags (e.g., clientDeleteProhibited) */
  status: string[]

  /** Authoritative name servers for the domain */
  nameServers: string[]

  /** HTTP status code from WHOIS provider */
  statusCode: number

  /** Human-readable status message */
  statusMessage: string

  /** WHOIS data source provider name */
  sourceProvider: string
}

/**
 * Metadata about the WHOIS query
 * Includes caching and performance information
 */
export interface WhoisMeta {
  /** Query timestamp (ISO 8601 format) */
  timestamp: string

  /** Whether the result was served from cache */
  cached: boolean

  /** Cache timestamp if cached (ISO 8601 format) */
  cachedAt?: string | null

  /** Query processing time in milliseconds */
  processing?: number | null
}

/**
 * Complete WHOIS API response
 * Top-level structure returned by backend
 */
export interface WhoisResponse {
  /** Success indicator (backend always returns true for HTTP 200 responses) */
  success: boolean

  /** WHOIS domain data */
  data: WhoisData

  /** Query metadata */
  meta: WhoisMeta
}
