/**
 * DNS Service
 * Client-side service for querying DNS records
 * Calls Next.js API Route (not backend directly)
 */

import {
  DNS_RECORD_TYPES,
  type DnsErrorCode,
  type DnsRecordType,
  type DnsResponse,
} from '@/lib/types/api'
import {
  assertValidDomainInput,
  isDnsResponsePayload,
  normalizeDnsRecordTypes,
} from '@/lib/utils/validation'

/** Base path for DNS API routes */
const DNS_API_BASE_PATH = '/api/v1/dns'

/** Extended error codes including service-specific errors */
type DnsServiceErrorCode = DnsErrorCode | 'NETWORK_ERROR'

/**
 * DNS Service Error
 * Normalized error class for consistent error handling across DNS service
 * Enables hooks/components to implement type-safe error handling
 */
export class DnsServiceError extends Error {
  public readonly code: DnsServiceErrorCode
  public readonly status?: number

  constructor(code: DnsServiceErrorCode, message: string, options?: { status?: number; cause?: unknown }) {
    super(message)
    this.name = 'DnsServiceError'
    this.code = code
    this.status = options?.status

    // Attach cause if provided (for error chaining)
    if (options?.cause) {
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DnsServiceError)
    }
  }

  /**
   * Type guard for DnsServiceError instances
   */
  static isDnsServiceError(error: unknown): error is DnsServiceError {
    return error instanceof DnsServiceError
  }
}

/**
 * DNS Service Class
 * Handles client-side DNS queries via Next.js API Routes
 * Enforces validation at the client boundary before network requests
 */
class DnsService {
  private readonly basePath = DNS_API_BASE_PATH

  /**
   * Query DNS records for a domain
   *
   * @param domain - The domain name to query (will be validated and normalized)
   * @param types - DNS record types to query (defaults to all types, will be validated)
   * @param signal - Optional AbortSignal to cancel the request
   * @returns Promise resolving to DNS response data
   * @throws DnsServiceError if validation fails or request errors
   *
   * @example
   * ```typescript
   * // Query specific record types
   * const result = await dnsService.query('example.com', ['A', 'MX'])
   *
   * // Query all record types
   * const allRecords = await dnsService.query('example.com')
   *
   * // Handle errors
   * try {
   *   const result = await dnsService.query('invalid domain')
   * } catch (error) {
   *   if (DnsServiceError.isDnsServiceError(error)) {
   *     console.log(error.code) // 'INVALID_DOMAIN'
   *   }
   * }
   * ```
   */
  async query(
    domain: string,
    types: DnsRecordType[] = [...DNS_RECORD_TYPES],
    signal?: AbortSignal
  ): Promise<DnsResponse> {
    // Validate and normalize domain input (throws on invalid)
    const normalizedDomain = this.normalizeDomain(domain)

    // Validate and normalize record types (throws on invalid)
    const { normalizedTypes, isAllTypes } = this.normalizeTypes(types)

    // Build query URL with normalized parameters
    const url = this.buildQueryUrl(normalizedDomain, normalizedTypes, isAllTypes)

    // Execute fetch request with error handling
    let response: Response

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store', // TanStack Query handles caching
        signal, // Allow request cancellation
      })
    } catch (error) {
      throw this.createFetchError(error)
    }

    // Parse and validate response
    return this.parseResponse(response)
  }

  /**
   * Normalize and validate domain input
   * Throws DnsServiceError for invalid domains
   */
  private normalizeDomain(domain: string): string {
    try {
      return assertValidDomainInput(domain)
    } catch (error) {
      throw new DnsServiceError(
        'INVALID_DOMAIN',
        error instanceof Error ? error.message : 'Domain format is invalid',
        { status: 400, cause: error }
      )
    }
  }

  /**
   * Normalize and validate DNS record types
   * Throws DnsServiceError for invalid or empty types
   */
  private normalizeTypes(types: DnsRecordType[]): { normalizedTypes: DnsRecordType[]; isAllTypes: boolean } {
    const { types: normalized, invalid, isAllTypes } = normalizeDnsRecordTypes(types)

    // Reject if any invalid types were provided
    if (invalid.length) {
      throw new DnsServiceError('INVALID_TYPE', `Unsupported DNS record type(s): ${invalid.join(', ')}`, {
        status: 400,
      })
    }

    // Reject if no valid types remain after normalization
    if (!normalized.length) {
      throw new DnsServiceError('INVALID_TYPE', 'At least one DNS record type must be requested', {
        status: 400,
      })
    }

    return { normalizedTypes: normalized, isAllTypes }
  }

  /**
   * Build query URL with proper encoding and parameters
   */
  private buildQueryUrl(domain: string, types: DnsRecordType[], isAllTypes: boolean): string {
    const params = new URLSearchParams()

    // Only add type parameter if not querying all types (optimization)
    if (!isAllTypes) {
      params.set('type', types.join(','))
    }

    const queryString = params.toString()
    return `${this.basePath}/${encodeURIComponent(domain)}${queryString ? `?${queryString}` : ''}`
  }

  /**
   * Create normalized error from fetch failure
   * Handles AbortError (timeout) and network errors separately
   */
  private createFetchError(error: unknown): DnsServiceError {
    // Handle request cancellation / timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return new DnsServiceError('REQUEST_TIMEOUT', 'DNS request was aborted or timed out', {
        status: 499, // Client closed request
        cause: error,
      })
    }

    // Handle network errors (offline, DNS failure, etc.)
    if (error instanceof Error) {
      return new DnsServiceError('NETWORK_ERROR', `Network error: ${error.message}`, {
        cause: error,
      })
    }

    // Fallback for unknown error types
    return new DnsServiceError('NETWORK_ERROR', 'Failed to execute DNS request')
  }

  /**
   * Parse and validate HTTP response
   * Handles both success and error responses with normalization
   */
  private async parseResponse(response: Response): Promise<DnsResponse> {
    const rawBody = await response.text()
    let payload: unknown

    // Safely parse JSON response
    try {
      payload = rawBody ? JSON.parse(rawBody) : undefined
    } catch {
      payload = rawBody
    }

    // Handle error responses (non-2xx status)
    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String((payload as { message?: unknown }).message ?? 'Failed to query DNS records')
          : 'Failed to query DNS records'

      const rawCode =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String((payload as { error?: unknown }).error ?? 'DNS_LOOKUP_FAILED')
          : 'DNS_LOOKUP_FAILED'

      // Normalize error code to known DNS error codes
      const errorCode = this.normalizeErrorCode(rawCode)

      // Log error in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('[DnsService] API Error:', {
          status: response.status,
          code: errorCode,
          rawCode,
          message,
          url: response.url,
        })
      }

      throw new DnsServiceError(errorCode, message, {
        status: response.status,
      })
    }

    // Validate response structure before returning to caller
    if (!isDnsResponsePayload(payload)) {
      // Log invalid response in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[DnsService] Invalid response structure:', payload)
      }

      throw new DnsServiceError('DNS_LOOKUP_FAILED', 'Malformed DNS response payload', {
        status: 502, // Bad Gateway (invalid backend response)
      })
    }

    return payload
  }

  /**
   * Normalize backend error codes to consistent DnsErrorCode values
   * Maps various backend error formats to a finite set of known error codes
   */
  private normalizeErrorCode(rawCode: string | undefined): DnsServiceErrorCode {
    const code = rawCode?.toUpperCase()

    switch (code) {
      // DNS-specific errors
      case 'NXDOMAIN':
      case 'SERVFAIL':
      case 'REFUSED':
        return code

      // General DNS errors
      case 'DNS_LOOKUP_FAILED':
        return 'DNS_LOOKUP_FAILED'

      // Timeout errors
      case 'REQUEST_TIMEOUT':
      case 'TIMEOUT':
        return 'REQUEST_TIMEOUT'

      // Validation errors
      case 'INVALID_DOMAIN':
        return 'INVALID_DOMAIN'
      case 'INVALID_TYPE':
        return 'INVALID_TYPE'

      // Network errors
      case 'NETWORK_ERROR':
      case 'REQUEST_FAILED':
        return 'REQUEST_FAILED'

      // Default to generic DNS lookup failure
      default:
        return 'DNS_LOOKUP_FAILED'
    }
  }
}

/**
 * Singleton instance of DnsService
 * Import and use this instance in components/hooks
 *
 * @example
 * ```typescript
 * import { dnsService } from '@/lib/services/dns-service'
 *
 * const result = await dnsService.query('example.com', ['A', 'MX'])
 * ```
 */
export const dnsService = new DnsService()
