/**
 * HTTP Client
 * Type-safe HTTP request wrapper with interceptors and error handling
 */

import { ApiError, type ApiSuccess, type BackendErrorResponse } from '@/lib/types/api'

/** Default request timeout (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30_000

/** Supported HTTP methods */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * HTTP Request Options
 */
export interface HttpRequestOptions<TBody = unknown> {
  /** Target URL */
  url: string

  /** HTTP method (default: GET) */
  method?: HttpMethod

  /** Additional HTTP headers */
  headers?: HeadersInit

  /** Query parameters (will be URL-encoded) */
  query?: Record<string, string | number | boolean | undefined>

  /** Request body (will be JSON-serialized if object) */
  body?: TBody

  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number

  /** AbortSignal for manual cancellation */
  signal?: AbortSignal

  /** JWT token for Authorization header */
  authToken?: string
}

/** Request interceptor function type */
type RequestInterceptor = (context: { url: string; init: RequestInit }) => void | Promise<void>

/** Response interceptor function type */
type ResponseInterceptor = (context: { response: Response }) => void | Promise<void>

/** Registered request interceptors */
const requestInterceptors = new Set<RequestInterceptor>()

/** Registered response interceptors */
const responseInterceptors = new Set<ResponseInterceptor>()

/**
 * Register a request interceptor
 * Interceptors can modify request context before sending
 *
 * @param interceptor Function to run before each request
 * @returns Cleanup function to unregister interceptor
 *
 * @example
 * ```typescript
 * const cleanup = registerRequestInterceptor(({ url, init }) => {
 *   console.log('Requesting:', url)
 * })
 * // Later: cleanup()
 * ```
 */
export function registerRequestInterceptor(interceptor: RequestInterceptor): () => void {
  requestInterceptors.add(interceptor)
  return () => requestInterceptors.delete(interceptor)
}

/**
 * Register a response interceptor
 * Interceptors can inspect responses after receiving
 *
 * @param interceptor Function to run after each response
 * @returns Cleanup function to unregister interceptor
 */
export function registerResponseInterceptor(interceptor: ResponseInterceptor): () => void {
  responseInterceptors.add(interceptor)
  return () => responseInterceptors.delete(interceptor)
}

/**
 * Execute HTTP request with type safety and error handling
 *
 * @template TResponse Expected response data type
 * @template TBody Request body type
 * @param options Request configuration
 * @returns Promise resolving to ApiSuccess with typed data
 * @throws {ApiError} On request failure, timeout, or non-OK response
 *
 * @example
 * ```typescript
 * const result = await httpRequest<UserData>({
 *   url: '/api/users/123',
 *   method: 'GET',
 *   authToken: token,
 * })
 * console.log(result.data.name) // TypeScript knows data shape
 * ```
 */
export async function httpRequest<TResponse, TBody = unknown>(
  options: HttpRequestOptions<TBody>
): Promise<ApiSuccess<TResponse>> {
  const method = options.method ?? 'GET'
  const url = buildUrl(options.url, options.query)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  // Link external AbortSignal if provided
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  // Build headers
  const headers = new Headers(options.headers ?? {})

  if (options.authToken) {
    headers.set('Authorization', `Bearer ${options.authToken}`)
  }

  // Prepare request body
  const body = prepareBody(options.body, headers)

  const init: RequestInit = {
    method,
    headers,
    body,
    signal: controller.signal,
    cache: 'no-store', // Prevent caching (critical for token-based auth)
  }

  // Run request interceptors
  await runRequestInterceptors(url, init)
  logRequest(method, url)

  try {
    const response = await fetch(url, init)

    // Run response interceptors (use cloned response to preserve body)
    await runResponseInterceptors(response.clone())
    logResponse(method, url, response.status)

    // Handle error responses
    if (!response.ok) {
      throw await buildApiError(response)
    }

    // Parse successful response
    const data = await parseResponse<TResponse>(response)

    return {
      data,
      status: response.status,
    }
  } catch (error) {
    // Handle timeout/abort
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError({
        status: 504,
        code: 'REQUEST_TIMEOUT',
        message: `Request timed out for ${method} ${options.url}`,
        cause: error,
      })
    }

    // Re-throw ApiError
    if (error instanceof ApiError) {
      throw error
    }

    // Wrap unknown errors
    throw new ApiError({
      status: 500,
      code: 'REQUEST_FAILED',
      message: error instanceof Error ? error.message : 'Unknown request failure',
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Build URL with query parameters
 * Properly encodes and appends query string
 */
function buildUrl(baseUrl: string, query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) {
    return baseUrl
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue
    }
    params.append(key, String(value))
  }

  const queryString = params.toString()
  if (!queryString) {
    return baseUrl
  }

  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}${queryString}`
}

/**
 * Prepare request body for transmission
 * Automatically JSON-serializes objects
 */
function prepareBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined
  }

  // Pass through native body types
  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream
  ) {
    return body as BodyInit
  }

  // JSON-serialize objects
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return JSON.stringify(body)
}

/**
 * Parse response body based on content type
 */
async function parseResponse<TResponse>(response: Response): Promise<TResponse> {
  // Handle No Content
  if (response.status === 204) {
    return undefined as TResponse
  }

  const contentType = response.headers.get('content-type') ?? ''

  // Parse JSON
  if (contentType.includes('application/json')) {
    return (await response.json()) as TResponse
  }

  // Return text for other types
  const text = await response.text()
  return text as unknown as TResponse
}

/**
 * Build ApiError from failed response
 * Attempts to extract structured error information
 */
async function buildApiError(response: Response): Promise<ApiError> {
  let backendError: BackendErrorResponse | undefined

  try {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      backendError = (await response.json()) as BackendErrorResponse
    } else {
      const text = await response.text()
      backendError = {
        error: 'REQUEST_FAILED',
        message: text || response.statusText,
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return new ApiError({
    status: response.status,
    code: backendError?.error ?? 'REQUEST_FAILED',
    message: backendError?.message ?? (response.statusText || 'Request failed'),
    details: backendError,
  })
}

/**
 * Run all registered request interceptors
 */
async function runRequestInterceptors(url: string, init: RequestInit): Promise<void> {
  for (const interceptor of requestInterceptors) {
    await interceptor({ url, init })
  }
}

/**
 * Run all registered response interceptors
 */
async function runResponseInterceptors(response: Response): Promise<void> {
  for (const interceptor of responseInterceptors) {
    await interceptor({ response })
  }
}

/**
 * Log request in development mode
 */
function logRequest(method: string, url: string): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.info(`[HTTP] ${method} ${url}`)
}

/**
 * Log response in development mode
 */
function logResponse(method: string, url: string, status: number): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const statusColor = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢'
  console.info(`[HTTP] ${statusColor} ${method} ${url} → ${status}`)
}
