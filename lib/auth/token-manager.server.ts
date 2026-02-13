/**
 * Backend JWT Token Manager (Server-side only)
 *
 * Implements queue-based single-flight pattern to handle JWT token acquisition.
 * Backend tokens are single-use with 30s expiry, so this manager:
 * - Maintains a FIFO queue of token requests
 * - Fetches one token at a time sequentially
 * - Each waiter receives a unique token
 * - Automatically retries on failure (max 2 attempts)
 *
 * ⚠️ WARNING: This module must NEVER be imported in client-side code!
 */

import { getBackendApiKey, getBackendUrl, isDevelopment } from '@/lib/config/env.server'
import { ApiError, type BackendErrorResponse, type TokenResponse } from '@/lib/types/api'

/** Backend token endpoint path */
const TOKEN_ENDPOINT_PATH = '/api/auth/token'

/** Token fetch timeout (10 seconds) */
const TOKEN_FETCH_TIMEOUT_MS = 10_000

/** Maximum token fetch attempts (including retry) */
const MAX_TOKEN_ATTEMPTS = 2

/**
 * Waiter in the token request queue
 */
type Waiter = {
  resolve: (value: string) => void
  reject: (reason: Error) => void
}

/**
 * Token Manager Class
 * Implements queue-based single-flight token acquisition
 */
class TokenManager {
  /** FIFO queue of waiting token requests */
  private waitQueue: Waiter[] = []

  /** Whether queue processing is currently active */
  private processing = false

  /**
   * Acquire a backend JWT token
   * Enqueues the request and ensures queue processing starts
   *
   * @returns Promise that resolves with a unique JWT token
   * @throws {ApiError} If token acquisition fails after retries
   */
  acquireToken(): Promise<string> {
    // In development mode, clean up stale state to prevent hot-reload issues
    if (isDevelopment() && !this.processing && this.waitQueue.length > 100) {
      if (isDevelopment()) {
        console.warn('[TokenManager] Cleaning up stale queue state (hot reload recovery)')
      }
      this.waitQueue = []
    }

    return new Promise((resolve, reject) => {
      this.waitQueue.push({ resolve, reject })
      this.ensureProcessing()
    })
  }

  /**
   * Clean up internal state (for development mode hot reload)
   * Rejects all pending waiters and resets state
   */
  private cleanup(): void {
    const error = new Error('TokenManager state reset due to hot reload')
    while (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()
      waiter?.reject(error)
    }
    this.processing = false
  }

  /**
   * Ensure queue processing is active
   * Only starts processing if not already running
   */
  private ensureProcessing(): void {
    if (this.processing) {
      return
    }

    this.processing = true
    void this.processQueue()
  }

  /**
   * Process the wait queue sequentially
   * Each waiter receives a unique token via FIFO order
   * Handles race condition where new waiters arrive after loop ends
   */
  private async processQueue(): Promise<void> {
    try {
      while (this.waitQueue.length > 0) {
        // Get next waiter from queue
        const waiter = this.waitQueue.shift()
        if (!waiter) continue

        try {
          // Fetch a unique token for this waiter
          const token = await this.fetchWithRetry()
          waiter.resolve(token)
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Failed to acquire backend token')
          waiter.reject(err)
        }
      }
    } finally {
      // Critical: Set processing=false before checking for new work
      // to avoid race condition where waiters arrive after loop ends
      this.processing = false

      // If new waiters arrived while we were finishing, restart processing
      if (this.waitQueue.length > 0) {
        this.ensureProcessing()
      }
    }
  }

  /**
   * Fetch token with automatic retry logic
   * Attempts up to MAX_TOKEN_ATTEMPTS times
   *
   * @returns JWT token string
   * @throws Last error if all attempts fail
   */
  private async fetchWithRetry(): Promise<string> {
    let attempts = 0
    let lastError: unknown

    while (attempts < MAX_TOKEN_ATTEMPTS) {
      try {
        return await this.requestBackendToken()
      } catch (error) {
        lastError = error
        attempts += 1

        if (isDevelopment()) {
          console.warn(
            `[TokenManager] Token fetch attempt ${attempts}/${MAX_TOKEN_ATTEMPTS} failed:`,
            error instanceof Error ? error.message : error
          )
        }

        if (attempts >= MAX_TOKEN_ATTEMPTS) {
          break
        }

        // Small delay before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempts * 100))
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Unable to fetch backend token')
  }

  /**
   * Request token from backend /api/auth/token endpoint
   *
   * @returns JWT token string
   * @throws {ApiError} On fetch failure, timeout, or invalid response
   */
  private async requestBackendToken(): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS)

    try {
      const url = `${getBackendUrl()}${TOKEN_ENDPOINT_PATH}`

      if (isDevelopment()) {
        console.info(`[TokenManager] Requesting token from: ${url}`)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        signal: controller.signal,
        cache: 'no-store', // Critical: Prevent caching token responses
      })

      if (!response.ok) {
        throw await this.parseError(response)
      }

      const payload = (await response.json()) as TokenResponse

      if (!payload?.token) {
        throw new ApiError({
          status: 502,
          code: 'TOKEN_EMPTY',
          message: 'Received empty token payload from backend',
          details: payload,
        })
      }

      if (isDevelopment()) {
        console.info('[TokenManager] Token acquired successfully')
      }

      return payload.token
    } catch (error) {
      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError({
          status: 504,
          code: 'TOKEN_TIMEOUT',
          message: 'Token request timed out',
          cause: error,
        })
      }

      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Build HTTP headers for token request
   * Includes API key if configured and anti-cache headers
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }

    const apiKey = getBackendApiKey()
    if (apiKey) {
      headers['X-API-Key'] = apiKey
    }

    return headers
  }

  /**
   * Parse error response from backend
   * Attempts to extract structured error information
   *
   * @param response Failed HTTP response
   * @returns ApiError with details from backend
   */
  private async parseError(response: Response): Promise<ApiError> {
    let backendError: BackendErrorResponse | undefined

    try {
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        backendError = (await response.json()) as BackendErrorResponse
      } else {
        const text = await response.text()
        backendError = {
          error: 'TOKEN_FETCH_FAILED',
          message: text || response.statusText,
        }
      }
    } catch {
      // Ignore parsing errors and use defaults
    }

    return new ApiError({
      status: response.status,
      code: backendError?.error ?? 'TOKEN_FETCH_FAILED',
      message: backendError?.message ?? 'Failed to fetch backend token',
      details: backendError,
    })
  }
}

/**
 * Global TokenManager instance
 * Persists across hot reloads and serverless reuses
 */
declare global {
  // Using var in global declarations is required for Next.js module persistence
  // eslint-disable-next-line no-var
  var __TOKEN_MANAGER__: TokenManager | undefined
  // eslint-disable-next-line no-var
  var __TOKEN_MANAGER_INIT_TIME__: number | undefined
}

// In development mode, check if the singleton is too old (hot reload recovery)
const MANAGER_MAX_AGE_MS = 60_000 // 1 minute
const now = Date.now()
const existingManager = globalThis.__TOKEN_MANAGER__
const initTime = globalThis.__TOKEN_MANAGER_INIT_TIME__ ?? 0

let tokenManager: TokenManager

if (isDevelopment() && existingManager && now - initTime > MANAGER_MAX_AGE_MS) {
  // Stale manager detected in dev mode, create a fresh one
  console.info('[TokenManager] Replacing stale manager instance (hot reload recovery)')
  tokenManager = new TokenManager()
  globalThis.__TOKEN_MANAGER__ = tokenManager
  globalThis.__TOKEN_MANAGER_INIT_TIME__ = now
} else if (!existingManager) {
  // First initialization
  tokenManager = new TokenManager()
  globalThis.__TOKEN_MANAGER__ = tokenManager
  globalThis.__TOKEN_MANAGER_INIT_TIME__ = now
} else {
  // Reuse existing manager
  tokenManager = existingManager
}

/**
 * Public API: Acquire a backend JWT token
 *
 * @returns Promise resolving to a unique JWT token string
 * @throws {ApiError} If token acquisition fails
 *
 * @example
 * ```typescript
 * const token = await acquireToken()
 * // Use token in Authorization header
 * ```
 */
export function acquireToken(): Promise<string> {
  return tokenManager.acquireToken()
}
