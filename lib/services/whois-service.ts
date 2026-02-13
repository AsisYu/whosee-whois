/**
 * WHOIS Service
 * Client-side service for querying WHOIS data
 * Calls Next.js API Route (not backend directly)
 */

import type { WhoisResponse } from '@/lib/types/api'

/** Base path for WHOIS API routes */
const WHOIS_API_BASE_PATH = '/api/v1/whois'

/**
 * WHOIS Service Class
 * Handles client-side WHOIS queries via Next.js API Routes
 */
class WhoisService {
  private readonly basePath = WHOIS_API_BASE_PATH

  /**
   * Query WHOIS information for a domain
   *
   * @param domain - The domain name to query
   * @param signal - Optional AbortSignal to cancel the request
   * @returns Promise resolving to WHOIS response data
   * @throws Error if request fails or response is invalid
   *
   * @example
   * ```typescript
   * const result = await whoisService.query('example.com')
   * console.log(result.data.registrar)
   * ```
   */
  async query(domain: string, signal?: AbortSignal): Promise<WhoisResponse> {
    const normalizedDomain = domain.trim().toLowerCase()

    if (!normalizedDomain) {
      throw new Error('Domain value is required')
    }

    let response: Response

    try {
      response = await fetch(`${this.basePath}/${encodeURIComponent(normalizedDomain)}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal, // Pass AbortSignal to allow cancellation
      })
    } catch (error) {
      throw this.createFetchError(error)
    }

    return this.parseResponse(response)
  }

  /**
   * Create a user-friendly error from fetch failure
   */
  private createFetchError(error: unknown): Error {
    const err = error instanceof Error
      ? new Error(`Network error: ${error.message}`, { cause: error }) as Error & { code?: string }
      : new Error('Failed to execute WHOIS request') as Error & { code?: string }

    err.code = 'REQUEST_FAILED'
    return err
  }

  /**
   * Parse and validate HTTP response
   * Handles both success and error responses
   */
  private async parseResponse(response: Response): Promise<WhoisResponse> {
    const rawBody = await response.text()
    let payload: unknown

    try {
      payload = rawBody ? JSON.parse(rawBody) : undefined
    } catch {
      payload = rawBody
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String((payload as { message?: unknown }).message ?? 'Failed to query WHOIS data')
          : 'Failed to query WHOIS data'

      const errorCode =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String((payload as { error?: unknown }).error ?? 'WHOIS_LOOKUP_FAILED')
          : 'WHOIS_LOOKUP_FAILED'

      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('[WhoisService] API Error:', {
          status: response.status,
          code: errorCode,
          message,
          url: response.url,
        })
      }

      const error = new Error(message) as Error & { status?: number; code?: string }
      error.status = response.status
      error.code = errorCode
      throw error
    }

    if (!this.isWhoisResponse(payload)) {
      // Log invalid response structure
      if (process.env.NODE_ENV === 'development') {
        console.error('[WhoisService] Invalid response structure:', payload)
      }
      throw new Error('Malformed WHOIS response payload')
    }

    return payload
  }

  /**
   * Type guard to validate WhoisResponse structure
   * Validates all required fields to ensure UI dependencies are met
   */
  private isWhoisResponse(payload: unknown): payload is WhoisResponse {
    if (!payload || typeof payload !== 'object') {
      return false
    }

    const candidate = payload as Partial<WhoisResponse>

    // Validate success field (required by backend)
    if (typeof candidate.success !== 'boolean') {
      return false
    }

    // Validate data object
    if (!candidate.data || typeof candidate.data !== 'object') {
      return false
    }

    const data = candidate.data as Partial<WhoisResponse['data']>

    // Validate required data fields
    if (
      typeof data.available !== 'boolean' ||
      typeof data.domain !== 'string' ||
      typeof data.statusCode !== 'number' ||
      typeof data.statusMessage !== 'string' ||
      typeof data.sourceProvider !== 'string' ||
      !Array.isArray(data.status) ||
      !Array.isArray(data.nameServers)
    ) {
      return false
    }

    // Validate nullable string fields
    const nullableStringFields = ['registrar', 'creationDate', 'expiryDate', 'updatedDate']
    for (const field of nullableStringFields) {
      const value = data[field as keyof typeof data]
      if (value !== null && typeof value !== 'string') {
        return false
      }
    }

    // Validate meta object
    if (!candidate.meta || typeof candidate.meta !== 'object') {
      return false
    }

    const meta = candidate.meta as Partial<WhoisResponse['meta']>

    // Validate required meta fields
    if (typeof meta.timestamp !== 'string' || typeof meta.cached !== 'boolean') {
      return false
    }

    // Validate optional meta fields
    if (meta.cachedAt !== null && meta.cachedAt !== undefined && typeof meta.cachedAt !== 'string') {
      return false
    }

    if (meta.processing !== null && meta.processing !== undefined && typeof meta.processing !== 'number') {
      return false
    }

    return true
  }
}

/**
 * Singleton instance of WhoisService
 * Import and use this instance in components/hooks
 */
export const whoisService = new WhoisService()
