/**
 * WHOIS Types
 * Type definitions matching backend API response structure
 * Based on docs/ALL_JSON.md specification
 */

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
 *
 * Note: Backend returns { success: true, data: {...}, meta: {...} }
 * despite documentation (docs/ALL_JSON.md) showing { data: {...}, meta: {...} }
 */
export interface WhoisResponse {
  /** Success indicator (backend always returns true for HTTP 200 responses) */
  success: boolean

  /** WHOIS domain data */
  data: WhoisData

  /** Query metadata */
  meta: WhoisMeta
}
