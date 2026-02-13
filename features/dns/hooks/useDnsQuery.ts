/**
 * DNS Query Hook
 * ViewModel layer wrapper around DNS service with TanStack Query integration
 * Provides retry logic, caching, and error handling for DNS queries
 */

'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import type { DnsQueryErrorCode, UseDnsQueryOptions } from '@/features/dns/types'
import { dnsService, DnsServiceError } from '@/lib/services/dns-service'
import { DNS_RECORD_TYPES, type DnsResponse } from '@/lib/types/api'
import { normalizeDnsRecordTypes } from '@/lib/utils/validation'

/** Cache configuration: 5 minutes stale, 10 minutes garbage collection */
const STALE_TIME_MS = 5 * 60 * 1000
const CACHE_TIME_MS = 10 * 60 * 1000

/** Retry configuration */
const MAX_RETRY_ATTEMPTS = 3

/** Error codes that warrant retry (transient failures) */
const RETRYABLE_CODES = new Set<DnsServiceError['code']>([
  'REQUEST_TIMEOUT', // Query timed out
  'REQUEST_FAILED', // Network/fetch error
  'SERVFAIL', // DNS server failure (may be temporary)
  'NETWORK_ERROR', // Browser-level network issues
])

/** HTTP status codes that warrant retry */
const RETRYABLE_STATUS_CODES = new Set([
  429, // Rate limited (will back off)
  500, // Internal server error
  502, // Bad gateway
  503, // Service unavailable
  504, // Gateway timeout
])

/** Default type key when querying all types */
const DEFAULT_TYPE_KEY = DNS_RECORD_TYPES.join(',')

/**
 * Extended query result with DNS-specific error code
 * Makes error handling easier for UI components
 */
type UseDnsQueryResult = UseQueryResult<DnsResponse, DnsServiceError> & {
  /** Extracted error code for UI branching (undefined if no error) */
  errorCode?: DnsQueryErrorCode
}

/**
 * Build deterministic query key for TanStack Query cache
 * Format: ['dns', locale, domain, typeKey]
 *
 * @param locale - Current user locale
 * @param domain - Normalized domain name
 * @param typeKey - Comma-separated record types
 * @returns Query key tuple
 */
function buildDnsQueryKey(locale: string, domain: string, typeKey: string) {
  return ['dns', locale, domain, typeKey] as const
}

/**
 * Determine if DNS error should trigger a retry
 * Only retries transient network/server failures, not client errors
 *
 * @param error - Error thrown by DNS service
 * @returns true if error is retryable
 */
function shouldRetryDnsError(error: unknown): boolean {
  if (!(error instanceof DnsServiceError)) {
    return false
  }

  // Retry based on error code
  if (RETRYABLE_CODES.has(error.code)) {
    return true
  }

  // Retry based on HTTP status (5xx, 429)
  if (error.status && RETRYABLE_STATUS_CODES.has(error.status)) {
    return true
  }

  return false
}

/**
 * useDnsQuery Hook
 * Manages DNS record queries with caching, retry logic, and error handling
 *
 * Features:
 * - Automatic domain and type normalization
 * - 5-minute cache with deterministic query keys
 * - Retry logic for transient failures (timeout, 5xx errors)
 * - No retry for permanent failures (NXDOMAIN, INVALID_DOMAIN, etc.)
 * - Request cancellation support (AbortSignal)
 * - Locale-aware caching
 *
 * @param options - Query configuration
 * @param options.domain - Domain to query (will be normalized)
 * @param options.types - Record types to query (defaults to all types)
 * @param options.enabled - Enable/disable query (default: false for manual trigger)
 * @returns Query result with data, loading state, error, and errorCode
 *
 * @example
 * ```tsx
 * function DnsQueryComponent() {
 *   const [domain, setDomain] = useState('')
 *   const { data, errorCode, isFetching, refetch } = useDnsQuery({
 *     domain,
 *     types: ['A', 'MX', 'TXT'],
 *     enabled: false,
 *   })
 *
 *   const handleSubmit = () => {
 *     refetch()
 *   }
 *
 *   if (errorCode === 'NXDOMAIN') {
 *     return <div>Domain not found</div>
 *   }
 *
 *   return <DnsResults data={data} loading={isFetching} />
 * }
 * ```
 */
export function useDnsQuery({
  domain,
  types, // Default handled in normalization (avoids unnecessary array allocation)
  enabled = false, // Manual trigger by default (like WHOIS)
}: UseDnsQueryOptions): UseDnsQueryResult {
  const locale = useLocale()

  // Normalize domain: trim and lowercase for consistent cache keys
  const normalizedDomain = useMemo(() => domain.trim().toLowerCase(), [domain])

  // Normalize types: deterministic ordering for cache stability
  // normalizeDnsRecordTypes handles undefined by defaulting to all types
  const normalizedTypes = useMemo(() => {
    const result = normalizeDnsRecordTypes(types)
    return result.types
  }, [types])

  // Build type key: comma-separated for human readability in DevTools
  const typeKey = useMemo(() => {
    return normalizedTypes.length > 0 ? normalizedTypes.join(',') : DEFAULT_TYPE_KEY
  }, [normalizedTypes])

  // Build query key: include locale to prevent cross-locale cache pollution
  const queryKey = useMemo(
    () => buildDnsQueryKey(locale, normalizedDomain, typeKey),
    [locale, normalizedDomain, typeKey]
  )

  // Only enable query if explicitly enabled AND domain is non-empty
  const isQueryEnabled = enabled && Boolean(normalizedDomain)

  // Execute TanStack Query with all configuration
  const queryResult = useQuery<DnsResponse, DnsServiceError>({
    queryKey,

    // Query function: calls DNS service with AbortSignal for cancellation
    queryFn: ({ signal }) => dnsService.query(normalizedDomain, normalizedTypes, signal),

    // Only run when explicitly enabled (manual trigger pattern)
    enabled: isQueryEnabled,

    // Cache configuration
    staleTime: STALE_TIME_MS, // 5 minutes
    gcTime: CACHE_TIME_MS, // 10 minutes (renamed from cacheTime in v5)

    // Retry logic: only for transient failures
    retry: (failureCount, error) => shouldRetryDnsError(error) && failureCount < MAX_RETRY_ATTEMPTS,

    // Exponential backoff: 1s, 2s, 4s (matches WHOIS behavior)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
  })

  // Extract error code for UI convenience
  const errorCode: DnsQueryErrorCode | undefined =
    queryResult.error instanceof DnsServiceError ? queryResult.error.code : undefined

  // Return enhanced result with error code
  return {
    ...queryResult,
    errorCode,
  }
}
