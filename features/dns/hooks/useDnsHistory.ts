/**
 * DNS History Hook
 * Manages DNS query history in localStorage with SSR-safe implementation
 * Stores metadata only (no full response data) for privacy and storage efficiency
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import type { DnsHistoryAddPayload, DnsHistoryEntry } from '@/features/dns/types'
import { DNS_RECORD_TYPES } from '@/lib/types/api'
import { normalizeDnsRecordTypes } from '@/lib/utils/validation'

/** localStorage key for DNS history */
const STORAGE_KEY = 'dns-query-history'

/** Maximum number of history entries to keep */
const MAX_HISTORY_ENTRIES = 10

/** Valid DNS record types set for efficient validation */
const VALID_DNS_TYPE_SET = new Set(DNS_RECORD_TYPES)

/**
 * useDnsHistory Hook
 * Persists the last 10 DNS queries in localStorage with metadata only
 *
 * Features:
 * - SSR-safe (lazy hydration on client)
 * - Sequential deduplication (avoids repeated identical entries)
 * - Automatic truncation to 10 most recent entries
 * - Type-safe with runtime validation
 * - Privacy-friendly (no response data stored)
 *
 * @returns History management interface
 * @returns history - Array of query history entries (newest first)
 * @returns addQuery - Function to add a new query to history
 * @returns clearHistory - Function to clear all history
 *
 * @example
 * ```tsx
 * function DnsHistoryPanel() {
 *   const { history, addQuery, clearHistory } = useDnsHistory()
 *   const { refetch } = useDnsQuery({ domain, enabled: false })
 *
 *   const handleQuery = async () => {
 *     try {
 *       await refetch()
 *       addQuery({ domain, types, status: 'success' })
 *     } catch (error) {
 *       addQuery({
 *         domain,
 *         types,
 *         status: 'error',
 *         errorCode: error.code
 *       })
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={clearHistory}>Clear History</button>
 *       {history.map(entry => (
 *         <HistoryItem key={entry.id} entry={entry} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useDnsHistory() {
  const [history, setHistory] = useState<DnsHistoryEntry[]>([])

  // Lazy hydration on client: SSR-safe initialization
  useEffect(() => {
    setHistory(readHistoryFromStorage())
  }, [])

  // Centralized history updater: maintains state and localStorage sync
  const updateHistory = useCallback((updater: (prev: DnsHistoryEntry[]) => DnsHistoryEntry[]) => {
    setHistory((prev) => {
      const next = updater(prev)
      writeHistoryToStorage(next)
      return next
    })
  }, [])

  /**
   * Add a query to history
   * Normalizes domain and types, deduplicates sequential identical entries,
   * and maintains max history size
   *
   * @param payload - Query metadata to add
   */
  const addQuery = useCallback(
    (payload: DnsHistoryAddPayload) => {
      const domain = payload.domain.trim().toLowerCase()

      // Reject empty domains
      if (!domain) {
        return
      }

      // Normalize types using shared validator
      const types = normalizeDnsRecordTypes(payload.types).types
      const typeKey = types.join(',')

      updateHistory((prev) => {
        const latest = prev[0]

        // Skip sequential duplicates: same domain + types + status + errorCode
        // Distinguishes different failure types while reducing noise for identical retries
        if (
          latest &&
          latest.domain === domain &&
          latest.typeKey === typeKey &&
          latest.status === payload.status &&
          latest.errorCode === payload.errorCode
        ) {
          return prev
        }

        // Create new history entry with unique ID (timestamp + random to prevent collisions)
        const entry: DnsHistoryEntry = {
          id: `${domain}-${typeKey}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          domain,
          types,
          typeKey,
          timestamp: new Date().toISOString(),
          status: payload.status,
          errorCode: payload.errorCode,
        }

        // Prepend new entry and trim to max length
        return [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES)
      })
    },
    [updateHistory]
  )

  /**
   * Clear all query history
   * Removes data from both state and localStorage
   */
  const clearHistory = useCallback(() => {
    updateHistory(() => [])
  }, [updateHistory])

  return {
    history,
    addQuery,
    clearHistory,
  }
}

/**
 * Read history from localStorage with validation
 * SSR-safe: returns empty array on server
 * Validates each entry to ensure data integrity
 *
 * @returns Validated history entries
 */
function readHistoryFromStorage(): DnsHistoryEntry[] {
  // SSR safety: return empty array on server
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    // No history stored
    if (!raw) {
      return []
    }

    // Parse JSON
    const parsed = JSON.parse(raw)

    // Validate structure
    if (!Array.isArray(parsed)) {
      return []
    }

    // Filter out invalid entries
    return parsed.filter(isDnsHistoryEntry)
  } catch (error) {
    // Log parse errors in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[useDnsHistory] Failed to read history from localStorage:', error)
    }
    return []
  }
}

/**
 * Write history to localStorage
 * SSR-safe: no-op on server
 * Catches and logs write errors (e.g., quota exceeded)
 *
 * @param entries - History entries to persist
 */
function writeHistoryToStorage(entries: DnsHistoryEntry[]) {
  // SSR safety: no-op on server
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    // Log write errors in development (e.g., quota exceeded, disabled storage)
    if (process.env.NODE_ENV === 'development') {
      console.error('[useDnsHistory] Failed to persist DNS history to localStorage:', error)
    }
  }
}

/**
 * Type guard for DnsHistoryEntry
 * Validates that an object has all required fields with correct types
 * Also validates that types array contains only valid DnsRecordType values
 *
 * @param candidate - Object to validate
 * @returns true if object is a valid DnsHistoryEntry
 */
function isDnsHistoryEntry(candidate: unknown): candidate is DnsHistoryEntry {
  if (!candidate || typeof candidate !== 'object') {
    return false
  }

  const entry = candidate as Partial<DnsHistoryEntry>

  // Validate all required fields
  const hasValidStructure =
    typeof entry.id === 'string' &&
    typeof entry.domain === 'string' &&
    Array.isArray(entry.types) &&
    typeof entry.typeKey === 'string' &&
    typeof entry.timestamp === 'string' &&
    (entry.status === 'success' || entry.status === 'error')

  if (!hasValidStructure) {
    return false
  }

  // Validate that types array contains only valid DnsRecordType values
  return entry.types!.every((type) => VALID_DNS_TYPE_SET.has(type as any))
}
