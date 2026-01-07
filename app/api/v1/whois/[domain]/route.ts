/**
 * WHOIS API Route
 * Server-side proxy to backend WHOIS API
 *
 * GET /api/v1/whois/:domain
 * - Acquires JWT token via token manager
 * - Proxies request to backend API
 * - Returns WHOIS data to client
 */

import { NextRequest, NextResponse } from 'next/server'

import type { WhoisResponse } from '@/features/whois/types'
import { httpRequest } from '@/lib/api/client'
import { acquireToken } from '@/lib/auth/token-manager.server'
import { getBackendUrl, getBackendApiKey } from '@/lib/config/env.server'
import { ApiError } from '@/lib/types/api'
import { isValidDomain } from '@/lib/utils/validation'

/** Force Node.js runtime (required for token manager) */
export const runtime = 'nodejs'

/** Force dynamic rendering (no static optimization) */
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
 * GET handler for WHOIS queries
 *
 * @param _request - Next.js request object (unused)
 * @param params - Route parameters containing domain
 * @returns JSON response with WHOIS data or error
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

  // Normalize and validate domain
  const domain = decodedDomain.trim().toLowerCase()

  if (!domain) {
    return NextResponse.json(
      {
        error: 'INVALID_DOMAIN',
        message: 'Domain parameter is required',
      },
      { status: 400 }
    )
  }

  // Validate domain format
  if (!isValidDomain(domain)) {
    return NextResponse.json(
      {
        error: 'INVALID_DOMAIN',
        message: 'Domain format is invalid',
      },
      { status: 400 }
    )
  }

  try {
    // Acquire JWT token from token manager (Phase 2)
    const token = await acquireToken()

    // Get API key from environment (optional)
    const apiKey = getBackendApiKey()

    // Build headers with both JWT token and API key
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    // Add API key if configured
    if (apiKey) {
      headers['X-API-KEY'] = apiKey
    }

    // Call backend WHOIS API via HTTP client
    // Extended timeout (60s) to handle slow WHOIS providers
    const response = await httpRequest<WhoisResponse>({
      url: `${getBackendUrl()}/api/v1/whois/${encodeURIComponent(domain)}`,
      method: 'GET',
      headers,
      authToken: token,
      timeoutMs: 60_000, // 60 seconds to handle slow backend queries
    })

    // Return backend response data to client
    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store', // Prevent caching (backend handles this)
      },
    })
  } catch (error) {
    // Convert error to ApiError and return structured response
    const apiError = error instanceof ApiError ? error : ApiError.fromError(error)

    return NextResponse.json(
      {
        error: apiError.code ?? 'WHOIS_LOOKUP_FAILED',
        message: apiError.message ?? 'Failed to fetch WHOIS data',
        timestamp: new Date().toISOString(),
      },
      {
        status: apiError.status ?? 500,
      }
    )
  }
}
