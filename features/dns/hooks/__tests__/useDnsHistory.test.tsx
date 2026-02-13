/**
 * Unit Tests for useDnsHistory Hook
 * Tests localStorage persistence, SSR safety, deduplication, and history management
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { DnsHistoryEntry, DnsQueryErrorCode } from '@/features/dns/types'

const STORAGE_KEY = 'dns-query-history'

type LocalStorageMock = ReturnType<typeof createLocalStorageMock>

/**
 * Create mock localStorage implementation with inspection capabilities
 */
function createLocalStorageMock() {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    snapshot: () => store,
  }
}

/**
 * Dynamically load useDnsHistory
 */
const loadUseDnsHistory = async () => {
  const { useDnsHistory } = await import('@/features/dns/hooks/useDnsHistory')
  return useDnsHistory
}

describe('useDnsHistory', () => {
  let storage: LocalStorageMock

  beforeEach(() => {
    // Don't use vi.resetModules() - it causes React state issues
    storage = createLocalStorageMock()

    // Ensure window exists in test environment
    if (typeof globalThis.window === 'undefined') {
      // Create minimal window object for tests
      globalThis.window = {} as Window & typeof globalThis
    }

    // Set up localStorage mock
    Object.defineProperty(globalThis.window, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    })
  })

  describe('SSR Safety', () => {
    test('does not crash when localStorage is unavailable', async () => {
      // Remove localStorage to simulate restricted environment
      const originalLocalStorage = globalThis.window.localStorage
      // @ts-expect-error - Simulate environment without localStorage
      delete globalThis.window.localStorage

      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      // Hook should work with empty history
      expect(result.current.history).toEqual([])

      await act(async () => {
        result.current.addQuery({ domain: 'test.com', status: 'success' })
      })

      // Restore localStorage
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      })
    })

    test('handles localStorage read errors gracefully', async () => {
      // Mock localStorage.getItem to throw
      storage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })

      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      // Should return empty history without crashing
      await waitFor(() => expect(result.current.history).toEqual([]))
    })
  })

  describe('localStorage Read', () => {
    test('hydrates history from valid localStorage data', async () => {
      const validEntry: DnsHistoryEntry = {
        id: 'example-A-123',
        domain: 'example.com',
        types: ['A'],
        typeKey: 'A',
        timestamp: new Date().toISOString(),
        status: 'success',
      }
      globalThis.window.localStorage.setItem(STORAGE_KEY, JSON.stringify([validEntry]))

      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await waitFor(() => expect(result.current.history).toHaveLength(1))
      expect(result.current.history[0]).toMatchObject({
        id: validEntry.id,
        domain: 'example.com',
        typeKey: 'A',
      })
    })

    test('filters out invalid entries during hydration', async () => {
      const validEntry: DnsHistoryEntry = {
        id: 'valid-1',
        domain: 'example.com',
        types: ['A'],
        typeKey: 'A',
        timestamp: new Date().toISOString(),
        status: 'success',
      }
      const invalidEntry = { foo: 'bar', domain: 'missing-required-fields' }

      globalThis.window.localStorage.setItem(STORAGE_KEY, JSON.stringify([validEntry, invalidEntry]))

      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await waitFor(() => expect(result.current.history).toHaveLength(1))
      expect(result.current.history[0].id).toBe('valid-1')
    })

    test('handles malformed localStorage data gracefully', async () => {
      globalThis.window.localStorage.setItem(STORAGE_KEY, 'not-valid-json')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Set NODE_ENV via vi.stubEnv
      vi.stubEnv('NODE_ENV', 'development')

      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await waitFor(() => expect(result.current.history).toHaveLength(0))
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
      vi.unstubAllEnvs()
    })

    test('returns empty array when localStorage is empty', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await waitFor(() => expect(result.current.history).toEqual([]))
    })

    test('returns empty array when localStorage contains non-array data', async () => {
      globalThis.window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }))

      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await waitFor(() => expect(result.current.history).toEqual([]))
    })
  })

  describe('localStorage Write', () => {
    test('persists new entries to localStorage', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: 'Example.com  ', types: ['TXT'], status: 'success' })
      })

      await waitFor(() => expect(result.current.history).toHaveLength(1))
      expect(globalThis.window.localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"domain":"example.com"')
      )
    })

    test('handles localStorage write errors without crashing', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      storage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        expect(() =>
          result.current.addQuery({ domain: 'example.com', status: 'success' })
        ).not.toThrow()
      })

      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
      vi.unstubAllEnvs()
    })

    test('handles missing localStorage gracefully during write', async () => {
      // Remove localStorage after hook initialization
      const originalLocalStorage = globalThis.window.localStorage
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      // Remove localStorage
      // @ts-expect-error - Simulate environment without localStorage
      delete globalThis.window.localStorage

      // Should not crash when trying to write
      await act(async () => {
        expect(() =>
          result.current.addQuery({ domain: 'example.com', status: 'success' })
        ).not.toThrow()
      })

      // Restore localStorage
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      })
    })
  })

  describe('Sequential Deduplication', () => {
    test('skips duplicate entries with same domain, types, status, and errorCode', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      const payload = {
        domain: 'example.com',
        types: ['A'] as ['A'],
        status: 'error' as const,
        errorCode: 'SERVFAIL' as DnsQueryErrorCode,
      }

      await act(async () => {
        result.current.addQuery(payload)
      })
      await waitFor(() => expect(result.current.history).toHaveLength(1))

      await act(async () => {
        result.current.addQuery(payload)
      })
      await waitFor(() => expect(result.current.history).toHaveLength(1))
    })

    test('allows entries with different errorCode (distinguishes failure types)', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      const basePayload = {
        domain: 'example.com',
        types: ['A'] as ['A'],
        status: 'error' as const,
      }

      await act(async () => {
        result.current.addQuery({ ...basePayload, errorCode: 'SERVFAIL' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(1))

      await act(async () => {
        result.current.addQuery({ ...basePayload, errorCode: 'NETWORK_ERROR' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(2))

      expect(result.current.history[0].errorCode).toBe('NETWORK_ERROR')
      expect(result.current.history[1].errorCode).toBe('SERVFAIL')
    })

    test('allows entries with different status', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', types: ['A'] as ['A'], status: 'error' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(1))

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', types: ['A'] as ['A'], status: 'success' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(2))
    })

    test('allows entries with different domain', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', status: 'success' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(1))

      await act(async () => {
        result.current.addQuery({ domain: 'another.com', status: 'success' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(2))
    })

    test('allows entries with different types', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', types: ['A'] as ['A'], status: 'success' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(1))

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', types: ['MX'] as ['MX'], status: 'success' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(2))
    })
  })

  describe('History Management', () => {
    test('truncates history to 10 most recent entries', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      // Add 12 entries
      for (let i = 0; i < 12; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
          result.current.addQuery({ domain: `example${i}.com`, status: 'success' })
        })
      }

      await waitFor(() => expect(result.current.history).toHaveLength(10))

      // Most recent should be first (example11.com)
      expect(result.current.history[0].domain).toBe('example11.com')
      // Oldest kept should be example2.com (example0 and example1 dropped)
      expect(result.current.history[9].domain).toBe('example2.com')
    })

    test('prepends new entries (newest first)', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: 'first.com', status: 'success' })
      })
      await act(async () => {
        result.current.addQuery({ domain: 'second.com', status: 'success' })
      })

      await waitFor(() => expect(result.current.history).toHaveLength(2))
      expect(result.current.history[0].domain).toBe('second.com')
      expect(result.current.history[1].domain).toBe('first.com')
    })

    test('normalizes domain (trim + lowercase) in history entries', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: '  ExAmPle.COM  ', status: 'success' })
      })

      await waitFor(() => expect(result.current.history).toHaveLength(1))
      expect(result.current.history[0].domain).toBe('example.com')
    })

    test('normalizes types in history entries', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({
          domain: 'example.com',
          types: ['MX', 'A', 'TXT'] as ['MX', 'A', 'TXT'],
          status: 'success',
        })
      })

      await waitFor(() => expect(result.current.history).toHaveLength(1))
      // Should be deterministically ordered
      expect(result.current.history[0].types).toEqual(['A', 'MX', 'TXT'])
      expect(result.current.history[0].typeKey).toBe('A,MX,TXT')
    })

    test('rejects empty domain entries', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: '', status: 'success' })
      })
      await act(async () => {
        result.current.addQuery({ domain: '   ', status: 'success' })
      })

      // Should remain empty
      await waitFor(() => expect(result.current.history).toHaveLength(0))
    })

    test('generates unique ID for each entry', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', types: ['A'] as ['A'], status: 'success' })
      })

      // Wait a bit to ensure timestamp changes
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', types: ['A'] as ['A'], status: 'error' })
      })

      await waitFor(() => expect(result.current.history).toHaveLength(2))
      expect(result.current.history[0].id).not.toBe(result.current.history[1].id)
    })

    test('includes timestamp in ISO format', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', status: 'success' })
      })

      await waitFor(() => expect(result.current.history).toHaveLength(1))
      const timestamp = result.current.history[0].timestamp
      expect(() => new Date(timestamp)).not.toThrow()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('clearHistory', () => {
    test('removes all entries from state and localStorage', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.addQuery({ domain: 'example.com', status: 'success' })
      })
      await waitFor(() => expect(result.current.history).toHaveLength(1))

      await act(async () => {
        result.current.clearHistory()
      })

      expect(result.current.history).toHaveLength(0)
      expect(globalThis.window.localStorage.setItem).toHaveBeenLastCalledWith(STORAGE_KEY, '[]')
    })

    test('clearHistory is idempotent', async () => {
      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      await act(async () => {
        result.current.clearHistory()
      })
      await act(async () => {
        result.current.clearHistory()
      })

      expect(result.current.history).toHaveLength(0)
    })
  })

  describe('Type Validation', () => {
    test('validates entry structure with isDnsHistoryEntry', async () => {
      const validEntry: DnsHistoryEntry = {
        id: 'test-1',
        domain: 'example.com',
        types: ['A'],
        typeKey: 'A',
        timestamp: new Date().toISOString(),
        status: 'success',
      }

      const invalidEntries = [
        { id: 'missing-domain' },
        { domain: 'example.com' }, // missing other fields
        { id: 123, domain: 'example.com' }, // wrong type for id
        { ...validEntry, status: 'invalid-status' }, // invalid status
      ]

      globalThis.window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([validEntry, ...invalidEntries])
      )

      const useDnsHistory = await loadUseDnsHistory()
      const { result } = renderHook(() => useDnsHistory())

      // Only valid entry should be loaded
      await waitFor(() => expect(result.current.history).toHaveLength(1))
      expect(result.current.history[0].id).toBe('test-1')
    })
  })
})
