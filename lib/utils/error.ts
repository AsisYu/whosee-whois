/**
 * Error Utilities
 * Custom error classes and error handling utilities
 */

/**
 * Validation Error
 * Thrown when input validation fails
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError)
    }
  }

  static isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError
  }
}

/**
 * Domain Not Found Error
 * Thrown when a domain is not found or not registered
 */
export class DomainNotFoundError extends Error {
  constructor(domain: string) {
    super(`Domain not found or not registered: ${domain}`)
    this.name = 'DomainNotFoundError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainNotFoundError)
    }
  }

  static isDomainNotFoundError(error: unknown): error is DomainNotFoundError {
    return error instanceof DomainNotFoundError
  }
}

/**
 * Network Error
 * Thrown when network request fails
 */
export class NetworkError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'NetworkError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError)
    }
  }

  static isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError
  }
}

/**
 * Token Error
 * Thrown when token generation or management fails
 */
export class TokenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TokenError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TokenError)
    }
  }

  static isTokenError(error: unknown): error is TokenError {
    return error instanceof TokenError
  }
}

/**
 * Check if error is retryable (network errors, 5xx server errors)
 * @param error - Error to check
 * @returns True if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (NetworkError.isNetworkError(error)) {
    return true
  }

  // Check if it's an API error with 5xx status code
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    return status >= 500 && status < 600
  }

  return false
}

/**
 * Get user-friendly error message
 * @param error - Error object
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (ValidationError.isValidationError(error)) {
    return error.message
  }

  if (DomainNotFoundError.isDomainNotFoundError(error)) {
    return 'Domain not found or not registered. Please check the domain name and try again.'
  }

  if (NetworkError.isNetworkError(error)) {
    return 'Network error. Please check your internet connection and try again.'
  }

  if (TokenError.isTokenError(error)) {
    return 'Authentication error. Please try again in a moment.'
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status

    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.'
      case 401:
        return 'Authentication required. Please refresh the page.'
      case 404:
        return 'Resource not found.'
      case 429:
        return 'Too many requests. Please wait a moment and try again.'
      case 503:
        return 'Service temporarily unavailable. Please try again later.'
      default:
        if (status >= 500) {
          return 'Server error. Please try again later.'
        }
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Log error with context for debugging
 * @param error - Error to log
 * @param context - Additional context information
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error occurred:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
    })
  } else {
    // In production, you might want to send errors to a logging service
    console.error('Error:', error instanceof Error ? error.message : String(error))
  }
}
