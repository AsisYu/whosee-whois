/**
 * DNS API Route
 * Server-side proxy to backend DNS API
 *
 * GET /api/v1/dns/:domain?type=A,MX,...
 * - Validates domain and DNS record types
 * - Acquires JWT token via token manager
 * - Proxies request to backend API with response validation
 * - Normalizes errors before returning to client
 */

import { NextRequest, NextResponse } from 'next/server'

import { type DnsErrorCode, type DnsResponse, DNS_RECORD_TYPES, type DnsRecordType } from '@/lib/types/api'
import { httpRequest } from '@/lib/api/client'
import { acquireToken } from '@/lib/auth/token-manager.server'
import { getBackendUrl, getBackendApiKey } from '@/lib/config/env.server'
import { ApiError } from '@/lib/types/api'
import {
  assertValidDomainInput,
  isDnsResponsePayload,
  isDnsRecordType,
  normalizeDnsRecordTypes,
} from '@/lib/utils/validation'

/** Force Node.js runtime (required for token manager and server-side logic) */
export const runtime = 'nodejs'

/** Force dynamic rendering (no static optimization for API routes) */
export const dynamic = 'force-dynamic'

/**
 * Route parameters type
 */
type RouteParams = {
  params: {
    domain?: string
  }
}

/**
 * GET handler for DNS queries
 * Validates inputs, acquires token, proxies to backend, validates response
 *
 * @param request - Next.js request object (for query parameters)
 * @param params - Route parameters containing domain
 * @returns JSON response with DNS data or structured error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const rawDomain = params?.domain ?? ''
  let decodedDomain = ''

  // Decode URL-encoded domain parameter
  try {
    decodedDomain = decodeURIComponent(rawDomain)
  } catch {
    return NextResponse.json(
      {
        error: 'INVALID_DOMAIN',
        message: 'Domain parameter is invalid or malformed',
      },
      { status: 400 }
    )
  }

  // Validate and normalize domain using shared utility
  let domain: string
  try {
    domain = assertValidDomainInput(decodedDomain)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'INVALID_DOMAIN',
        message: error instanceof Error ? error.message : 'Domain format is invalid',
      },
      { status: 400 }
    )
  }

  // Parse and validate type parameter using shared utility
  const typeParam = request.nextUrl.searchParams.get('type')
  const rawTypes = typeParam
    ? typeParam
        .split(',')
        .map((type) => type.trim().toUpperCase())
        .filter(Boolean)
    : []

  const { types: normalizedTypes, invalid, isAllTypes } = normalizeDnsRecordTypes(rawTypes)

  // Reject request if invalid types or no valid types remain
  if (!normalizedTypes.length || invalid.length) {
    return NextResponse.json(
      {
        error: 'INVALID_TYPE',
        message: invalid.length
          ? `Unsupported DNS record type(s): ${invalid.join(', ')}`
          : 'At least one DNS record type must be requested',
      },
      { status: 400 }
    )
  }

  try {
    // Acquire JWT token from token manager (server-side only)
    const token = await acquireToken()

    // Get API key from environment (optional, depends on backend config)
    const apiKey = getBackendApiKey()

    // Build headers with JWT token and optional API key
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    // Add API key if configured in environment
    if (apiKey) {
      headers['X-API-KEY'] = apiKey
    }

    // Build backend URL with query parameters
    const backendUrl = new URL(`${getBackendUrl()}/api/v1/dns/${encodeURIComponent(domain)}`)

    // Only add type parameter if not querying all types (backend optimization)
    if (!isAllTypes) {
      backendUrl.searchParams.set('type', normalizedTypes.join(','))
    }

    // Call backend DNS API via HTTP client
    // Standard timeout (15s) appropriate for DNS queries
    const response = await httpRequest<any>({
      url: backendUrl.toString(),
      method: 'GET',
      headers,
      authToken: token,
      timeoutMs: 15_000, // 15 seconds timeout
    })

    // Transform backend response to frontend format
    const backendData = response.data

    // Log raw response in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[DNS API] Backend response:', JSON.stringify(backendData, null, 2))
    }

    // Check if response has the expected structure
    if (!backendData || typeof backendData !== 'object') {
      console.error('[DNS API] Invalid backend response: not an object')
      return NextResponse.json(
        {
          error: 'DNS_LOOKUP_FAILED',
          message: 'Backend returned invalid DNS data',
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      )
    }

    // Extract data from backend response (handle both wrapped and unwrapped formats)
    const dataSection = backendData.data || backendData
    const metaSection = backendData.meta || {}

    // Validate domain exists
    if (!dataSection.domain || typeof dataSection.domain !== 'string') {
      console.error('[DNS API] Missing domain in response')
      return NextResponse.json(
        {
          error: 'DNS_LOOKUP_FAILED',
          message: 'Backend response missing domain information',
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      )
    }

    // Validate records exist
    if (!dataSection.records || typeof dataSection.records !== 'object') {
      console.error('[DNS API] Missing or invalid records in response')
      return NextResponse.json(
        {
          error: 'DNS_LOOKUP_FAILED',
          message: 'Backend response missing DNS records',
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      )
    }

    // Extract resolved types from actual records
    const resolvedTypes = Object.keys(dataSection.records).filter(
      (type) => isDnsRecordType(type) && Array.isArray(dataSection.records[type]) && dataSection.records[type].length > 0
    ) as DnsRecordType[]

    // Build frontend-compatible response
    const frontendResponse: DnsResponse = {
      success: true,
      data: {
        domain: dataSection.domain,
        requestedTypes: normalizedTypes,
        resolvedTypes,
        records: dataSection.records,
      },
      meta: {
        cached: Boolean(dataSection.is_cached || dataSection.isCached),
        cachedAt: dataSection.cache_time || dataSection.cacheTime || null,
        processing: metaSection.processing || metaSection.processingTimeMs || 0,
        timestamp: metaSection.timestamp || new Date().toISOString(),
      },
    }

    // Validate transformed response
    if (!isDnsResponsePayload(frontendResponse)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[DNS API] Transformed response failed validation:', frontendResponse)
      }

      return NextResponse.json(
        {
          error: 'DNS_LOOKUP_FAILED',
          message: 'Failed to transform backend DNS response',
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      )
    }

    // Return transformed response to client
    return NextResponse.json(frontendResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store', // Prevent API route caching (frontend TanStack Query handles this)
      },
    })
  } catch (error) {
    // Convert all errors to ApiError and normalize for consistent client handling
    const apiError = error instanceof ApiError ? error : ApiError.fromError(error)
    const normalized = normalizeDnsApiError(apiError)

    return NextResponse.json(
      {
        error: normalized.code,
        message: normalized.message,
        timestamp: new Date().toISOString(),
      },
      {
        status: normalized.status,
      }
    )
  }
}

/**
 * Normalize API errors to consistent DNS error codes
 * Maps backend error codes to frontend-friendly DnsErrorCode values
 * Ensures hooks/components receive predictable error shapes
 *
 * @param error - ApiError from backend or HTTP client
 * @returns Normalized error with code, message, and status
 */
function normalizeDnsApiError(error: ApiError): { code: DnsErrorCode; message: string; status: number } {
  const code = (error.code ?? '').toUpperCase()

  switch (code) {
    // DNS-specific errors from authoritative servers
    case 'NXDOMAIN':
      return {
        code: 'NXDOMAIN',
        message: 'Domain not found in DNS',
        status: error.status ?? 404,
      }

    case 'SERVFAIL':
      return {
        code: 'SERVFAIL',
        message: 'Authoritative DNS server failed to answer query',
        status: error.status ?? 502,
      }

    case 'REFUSED':
      return {
        code: 'REFUSED',
        message: 'DNS server refused the query',
        status: error.status ?? 502,
      }

    // Timeout errors (from backend or HTTP client)
    case 'REQUEST_TIMEOUT':
    case 'TIMEOUT':
      return {
        code: 'REQUEST_TIMEOUT',
        message: 'DNS lookup timed out',
        status: error.status ?? 504,
      }

    // Validation errors (should be caught earlier, but handle defensively)
    case 'INVALID_DOMAIN':
      return {
        code: 'INVALID_DOMAIN',
        message: error.message,
        status: error.status ?? 400,
      }

    case 'INVALID_TYPE':
      return {
        code: 'INVALID_TYPE',
        message: error.message,
        status: error.status ?? 400,
      }

    // Network/request errors
    case 'REQUEST_FAILED':
    case 'NETWORK_ERROR':
      return {
        code: 'REQUEST_FAILED',
        message: 'Failed to reach DNS backend service',
        status: error.status ?? 503,
      }

    // Default handler for unknown errors
    default:
      // Detect timeout by status code if error code is not set
      if (error.status === 504) {
        return {
          code: 'REQUEST_TIMEOUT',
          message: 'DNS lookup timed out',
          status: 504,
        }
      }

      // Generic DNS lookup failure for all other cases
      return {
        code: 'DNS_LOOKUP_FAILED',
        message: error.message ?? 'Failed to fetch DNS records',
        status: error.status ?? 502,
      }
  }
}
