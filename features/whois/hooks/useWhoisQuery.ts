/**
 * WHOIS Query Hook
 * TanStack Query hook for managing WHOIS data fetching
 */

'use client'

import { useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import type { WhoisResponse } from '@/features/whois/types'
import { whoisService } from '@/lib/services/whois-service'

/**
 * Hook for querying WHOIS information
 *
 * @param domain - The domain name to query
 * @returns TanStack Query result with WHOIS data
 *
 * @example
 * ```tsx
 * function WhoisPage() {
 *   const [domain, setDomain] = useState('')
 *   const { data, error, isFetching, refetch } = useWhoisQuery(domain)
 *
 *   const handleSubmit = () => {
 *     refetch()
 *   }
 *
 *   return <WhoisResult data={data} error={error} loading={isFetching} />
 * }
 * ```
 */
export function useWhoisQuery(domain: string) {
  const locale = useLocale()
  const normalizedDomain = domain.trim().toLowerCase()

  return useQuery<WhoisResponse, Error>({
    // Include locale in query key to prevent cross-locale cache pollution
    queryKey: ['whois', locale, normalizedDomain],

    // Query function calls WHOIS service
    // Pass AbortSignal to allow cancellation of stale requests
    queryFn: ({ signal }) => whoisService.query(normalizedDomain, signal),

    // Manual trigger only (form submission controls refetch)
    enabled: false,

    // Retry logic: retry on timeout and server errors
    // Retries up to 3 times for temporary failures
    retry: (failureCount, error) => {
      // Cast error to access custom properties
      const err = error as Error & { code?: string; status?: number }

      // Retry conditions:
      // 1. REQUEST_TIMEOUT - Backend took too long
      // 2. 502/503/504 - Backend temporarily unavailable
      // 3. 429 - Rate limited (will retry with backoff)
      const isRetryable =
        err.code === 'REQUEST_TIMEOUT' ||
        err.status === 502 ||
        err.status === 503 ||
        err.status === 504 ||
        err.status === 429

      // Retry up to 3 times for retryable errors
      return isRetryable && failureCount < 3
    },

    // Exponential backoff: 1s, 2s, 4s
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),

    // Consider data stale after 5 minutes
    staleTime: 5 * 60 * 1000,

    // Keep data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
  })
}
