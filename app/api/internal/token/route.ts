/**
 * Internal Token API Route
 * Server-side endpoint to acquire backend JWT tokens
 *
 * POST /api/internal/token
 * Returns: { token: string }
 */

import { NextResponse } from 'next/server'

import { acquireToken } from '@/lib/auth/token-manager.server'
import { ApiError } from '@/lib/types/api'

/** Force Node.js runtime (required for token manager caching) */
export const runtime = 'nodejs'

/**
 * POST handler - Acquire a backend JWT token
 *
 * @returns 200 with { token } on success
 * @returns 500 with error details on failure
 */
export async function POST() {
  try {
    const token = await acquireToken()

    return NextResponse.json(
      { token },
      {
        status: 200,
        headers: {
          // Prevent caching tokens
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (error) {
    console.error('[TokenRoute] Failed to acquire token:', error)

    // Extract error details
    const status = error instanceof ApiError ? error.status : 500
    const code = error instanceof ApiError ? error.code : 'TOKEN_ACQUISITION_FAILED'
    const message = error instanceof Error ? error.message : 'Failed to acquire backend token'

    return NextResponse.json(
      {
        error: code,
        message,
        timestamp: new Date().toISOString(),
      },
      { status }
    )
  }
}

/**
 * GET handler - Return 405 Method Not Allowed
 * Token acquisition requires POST method
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use POST to request a backend token',
    },
    {
      status: 405,
      headers: {
        Allow: 'POST',
      },
    }
  )
}

/**
 * Other methods - Return 405 Method Not Allowed
 */
export async function PUT() {
  return GET()
}

export async function PATCH() {
  return GET()
}

export async function DELETE() {
  return GET()
}
