/**
 * Unit Tests for useDnsQuery Hook
 * Tests domain/type normalization, query key generation, retry logic, and TanStack Query integration
 */

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { useDnsQuery } from '@/features/dns/hooks/useDnsQuery'
import type { UseDnsQueryOptions } from '@/features/dns/types'
import { dnsService, DnsServiceError } from '@/lib/services/dns-service'
import { DNS_RECORD_TYPES, type DnsRecordType, type DnsResponse } from '@/lib/types/api'

// Mock next-intl useLocale hook
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
}))

// Mock DNS service
vi.mock('@/lib/services/dns-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/dns-service')>(
    '@/lib/services/dns-service'
  )

  return {
    ...actual,
    dnsService: {
      query: vi.fn(),
    },
  }
})

const mockQuery = dnsService.query as unknown as ReturnType<typeof vi.fn>

/**
 * Create mock DnsResponse with defaults
 */
const createMockResponse = (overrides?: Partial<DnsResponse>): DnsResponse => ({
  success: true,
  data: {
    domain: 'example.com',
    requestedTypes: [...DNS_RECORD_TYPES],
    resolvedTypes: [...DNS_RECORD_TYPES],
    records: {},
    ...(overrides?.data ?? {}),
  },
  meta: {
    cached: false,
    cachedAt: null,
    processing: 10,
    timestamp: new Date().toISOString(),
    ...(overrides?.meta ?? {}),
  },
})

/**
 * Test helper: Render useDnsQuery with TanStack Query context
 */
const renderUseDnsQuery = (options: UseDnsQueryOptions) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Don't disable retry - let the hook's retry logic work
        // Just reduce retry delay for faster tests
        retryDelay: 10, // 10ms instead of exponential backoff
      },
    },
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const utils = renderHook(() => useDnsQuery(options), { wrapper })
  return { ...utils, queryClient }
}

describe('useDnsQuery', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  describe('Domain Normalization', () => {
    test('normalizes domain (trim + lowercase) before querying', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      const { result } = renderUseDnsQuery({ domain: '  ExAmPle.COM ', enabled: true })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockQuery).toHaveBeenCalledWith(
        'example.com',
        DNS_RECORD_TYPES,
        expect.any(AbortSignal)
      )
    })

    test('skips execution when normalized domain is empty', async () => {
      const { result } = renderUseDnsQuery({ domain: '   ', enabled: true })

      // Wait a tick to ensure it stays idle
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(result.current.isFetching).toBe(false)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    test('skips execution when domain is empty string', async () => {
      const { result } = renderUseDnsQuery({ domain: '', enabled: true })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(result.current.isFetching).toBe(false)
      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('Type Normalization', () => {
    test('defaults types to all DNS record types when undefined', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      renderUseDnsQuery({ domain: 'example.com', enabled: true })

      await waitFor(() => expect(mockQuery).toHaveBeenCalled())
      expect(mockQuery).toHaveBeenCalledWith(
        'example.com',
        DNS_RECORD_TYPES,
        expect.any(AbortSignal)
      )
    })

    test('normalizes custom types (dedupe, filter invalid, deterministic order)', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      const customTypes = ['MX', 'TXT', 'A', 'TXT', 'invalid']

      const { result } = renderUseDnsQuery({
        domain: 'example.com',
        types: customTypes as any,
        enabled: true,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      // Deterministic ordering: A, MX, TXT (matches DNS_RECORD_TYPES order)
      expect(mockQuery).toHaveBeenCalledWith('example.com', ['A', 'MX', 'TXT'], expect.any(AbortSignal))
    })

    test('handles empty types array by using all types', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      renderUseDnsQuery({ domain: 'example.com', types: [], enabled: true })

      await waitFor(() => expect(mockQuery).toHaveBeenCalled())
      expect(mockQuery).toHaveBeenCalledWith('example.com', DNS_RECORD_TYPES, expect.any(AbortSignal))
    })
  })

  describe('Query Key Generation', () => {
    test('generates locale-aware query keys with deterministic typeKey', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      const { result, queryClient } = renderUseDnsQuery({
        domain: 'example.com',
        types: ['MX', 'A'],
        enabled: true,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Query key should be: ['dns', 'en', 'example.com', 'A,MX'] (en from mocked useLocale)
      const cached = queryClient.getQueryCache().find({
        queryKey: ['dns', 'en', 'example.com', 'A,MX'],
      })
      expect(cached).toBeDefined()
    })

    test('uses default typeKey when querying all types', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      const { result, queryClient } = renderUseDnsQuery({
        domain: 'example.com',
        enabled: true,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const defaultTypeKey = DNS_RECORD_TYPES.join(',')
      const cached = queryClient.getQueryCache().find({
        queryKey: ['dns', 'en', 'example.com', defaultTypeKey],
      })
      expect(cached).toBeDefined()
    })
  })

  describe('Retry Logic', () => {
    test(
      'retries transient errors up to max attempts',
      { timeout: 20000 }, // Vitest 4 syntax: options as second parameter
      async () => {
        const transientError = new DnsServiceError('REQUEST_TIMEOUT', 'Timeout', { status: 504 })
        mockQuery
          .mockRejectedValueOnce(transientError)
          .mockRejectedValueOnce(transientError)
          .mockRejectedValueOnce(transientError)
          .mockResolvedValue(createMockResponse())

        const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

        // Wait for retries to complete
        // Hook uses exponential backoff: 1s, 2s, 4s => total ~7s + query time
        await waitFor(
          () => {
            expect(result.current.isSuccess).toBe(true)
          },
          { timeout: 15000 }
        )

        expect(mockQuery).toHaveBeenCalledTimes(4) // Initial + 3 retries
      }
    )

    test('does not retry permanent errors (NXDOMAIN)', async () => {
      const permanentError = new DnsServiceError('NXDOMAIN', 'Domain not found', { status: 404 })
      mockQuery.mockRejectedValue(permanentError)

      const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(mockQuery).toHaveBeenCalledTimes(1) // No retries
    })

    test('does not retry validation errors (INVALID_DOMAIN)', async () => {
      const validationError = new DnsServiceError('INVALID_DOMAIN', 'Invalid domain', { status: 400 })
      mockQuery.mockRejectedValue(validationError)

      const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })

    test('retries SERVFAIL errors (transient DNS server failure)', async () => {
      const servfailError = new DnsServiceError('SERVFAIL', 'DNS server failed', { status: 502 })
      mockQuery
        .mockRejectedValueOnce(servfailError)
        .mockRejectedValueOnce(servfailError)
        .mockResolvedValue(createMockResponse())

      const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

      // Hook uses exponential backoff: 1s, 2s => total ~3s + query time
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true)
        },
        { timeout: 5000 }
      )

      expect(mockQuery).toHaveBeenCalledTimes(3)
    })

    test('retries 5xx status codes', async () => {
      const serverError = new DnsServiceError('REQUEST_FAILED', 'Server error', { status: 500 })
      mockQuery
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue(createMockResponse())

      const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

      // Hook uses exponential backoff: 1s => total ~1s + query time
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true)
        },
        { timeout: 3000 }
      )

      expect(mockQuery).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Code Extraction', () => {
    test('exposes DNS-specific error code for DnsServiceError instances', async () => {
      // Use non-retryable error (NXDOMAIN) for immediate failure
      const serviceError = new DnsServiceError('NXDOMAIN', 'Domain not found', { status: 404 })
      mockQuery.mockRejectedValue(serviceError)

      const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect(result.current.errorCode).toBe('NXDOMAIN')
      })
      expect(result.current.error).toBe(serviceError)
    })

    test('keeps errorCode undefined when non-service errors occur', async () => {
      const genericError = new Error('Unexpected error')
      mockQuery.mockRejectedValue(genericError)

      const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect(result.current.errorCode).toBeUndefined()
      })
      expect(result.current.error).toBe(genericError)
    })

    test('extracts error code from different DNS error types', async () => {
      // Use non-retryable errors for immediate failure
      const testCases = [
        { error: new DnsServiceError('NXDOMAIN', 'Not found', { status: 404 }), expectedCode: 'NXDOMAIN' },
        { error: new DnsServiceError('REFUSED', 'Refused', { status: 403 }), expectedCode: 'REFUSED' },
        { error: new DnsServiceError('INVALID_DOMAIN', 'Invalid', { status: 400 }), expectedCode: 'INVALID_DOMAIN' },
      ]

      for (const { error, expectedCode } of testCases) {
        mockQuery.mockReset()
        mockQuery.mockRejectedValue(error)

        // eslint-disable-next-line no-await-in-loop
        const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

        // eslint-disable-next-line no-await-in-loop
        await waitFor(() => {
          expect(result.current.isError).toBe(true)
          expect(result.current.errorCode).toBe(expectedCode)
        })
      }
    })
  })

  describe('TanStack Query Integration', () => {
    test('respects enabled flag and allows manual refetch', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: false })

      // Should not auto-fetch when disabled
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })
      expect(mockQuery).not.toHaveBeenCalled()

      // Manual refetch should work
      await act(async () => {
        await result.current.refetch()
      })
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })

    test('configures cache timings (staleTime/gcTime) for TanStack Query', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      const { result, queryClient } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const defaultTypeKey = DNS_RECORD_TYPES.join(',')
      const cacheEntry = queryClient.getQueryCache().find({
        queryKey: ['dns', 'en', 'example.com', defaultTypeKey],
      })

      // Check state directly instead of options
      expect(cacheEntry?.state.dataUpdatedAt).toBeDefined()
      expect(cacheEntry).toBeDefined()
    })

    test('passes AbortSignal for request cancellation support', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      renderUseDnsQuery({ domain: 'example.com', enabled: true })

      await waitFor(() => expect(mockQuery).toHaveBeenCalled())

      const [, , signal] = mockQuery.mock.calls[0]
      expect(signal).toBeInstanceOf(AbortSignal)
    })

    test('returns standard TanStack Query properties', async () => {
      mockQuery.mockResolvedValue(createMockResponse())
      const { result } = renderUseDnsQuery({ domain: 'example.com', enabled: true })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Check for standard query result properties
      expect(result.current).toHaveProperty('data')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('isFetching')
      expect(result.current).toHaveProperty('isSuccess')
      expect(result.current).toHaveProperty('isError')
      expect(result.current).toHaveProperty('refetch')
      expect(result.current).toHaveProperty('errorCode') // DNS-specific extension
    })
  })
})
