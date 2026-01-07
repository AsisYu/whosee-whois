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
