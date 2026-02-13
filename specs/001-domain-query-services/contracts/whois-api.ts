/**
 * WHOIS API Contract
 * Defines the interface between frontend and Next.js API Routes for WHOIS queries
 */

import { type WhoisResponse } from '@/lib/types/api'

/**
 * GET /api/v1/whois/[domain]
 * Query WHOIS information for a domain
 */
export namespace WhoisAPI {
  /** Request parameters */
  export interface RequestParams {
    /** Domain name to query (path parameter) */
    domain: string;
  }

  /** Success response */
  export interface SuccessResponse {
    success: true;
    data: WhoisResponse['data'];
    meta: {
      /** Response timestamp (ISO 8601) */
      timestamp: string;
      /** Whether result was served from backend cache */
      cached: boolean;
      /** Backend processing time in milliseconds */
      processing: number;
    };
  }

  /** Error response */
  export interface ErrorResponse {
    success: false;
    error: {
      /** Error code (e.g., 'INVALID_DOMAIN', 'NOT_FOUND', 'RATE_LIMITED') */
      code: string;
      /** Human-readable error message */
      message: string;
      /** Additional error details (optional) */
      details?: unknown;
    };
    meta: {
      /** Response timestamp (ISO 8601) */
      timestamp: string;
    };
  }

  /** Combined response type */
  export type Response = SuccessResponse | ErrorResponse;

  /** HTTP status codes */
  export const StatusCodes = {
    /** Success */
    OK: 200,
    /** Invalid domain format */
    BAD_REQUEST: 400,
    /** Authentication required (should not happen in normal flow) */
    UNAUTHORIZED: 401,
    /** Domain not found */
    NOT_FOUND: 404,
    /** Rate limit exceeded */
    RATE_LIMITED: 429,
    /** Backend service error */
    INTERNAL_ERROR: 500,
    /** Backend service unavailable */
    SERVICE_UNAVAILABLE: 503,
  } as const;

  /** Error codes */
  export const ErrorCodes = {
    /** Invalid domain format */
    INVALID_DOMAIN: 'INVALID_DOMAIN',
    /** Domain not found or not registered */
    NOT_FOUND: 'NOT_FOUND',
    /** Rate limit exceeded */
    RATE_LIMITED: 'RATE_LIMITED',
    /** Backend query failed */
    QUERY_ERROR: 'QUERY_ERROR',
    /** Token fetch failed */
    TOKEN_ERROR: 'TOKEN_ERROR',
    /** Internal server error */
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  } as const;
}

/**
 * Example usage:
 *
 * ```typescript
 * // In service layer (lib/services/whois-service.ts)
 * async function queryWhois(domain: string): Promise<WhoisAPI.SuccessResponse['data']> {
 *   const response = await fetch(`/api/v1/whois/${encodeURIComponent(domain)}`);
 *
 *   if (!response.ok) {
 *     const error: WhoisAPI.ErrorResponse = await response.json();
 *     throw new ApiError(response.status, error.error.code, error.error.message);
 *   }
 *
 *   const data: WhoisAPI.SuccessResponse = await response.json();
 *   return data.data;
 * }
 * ```
 */
