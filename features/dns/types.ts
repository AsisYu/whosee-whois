/**
 * DNS Feature Types
 * Feature-specific types for DNS query hooks and components
 * Keeps Feature-First boundaries clear by colocating hook types with the feature
 */

import type { DnsErrorCode, DnsRecordType, DnsResponse } from '@/lib/types/api'

/**
 * Extended DNS error codes including service-level errors
 * NETWORK_ERROR is added by DnsServiceError for fetch-level failures
 */
export type DnsQueryErrorCode = DnsErrorCode | 'NETWORK_ERROR'

/**
 * Options for useDnsQuery hook
 * Provides type-safe configuration for DNS queries with sensible defaults
 */
export interface UseDnsQueryOptions {
  /** Domain name to query (user input, will be normalized) */
  domain: string

  /** DNS record types to query (defaults to all types if not specified) */
  types?: DnsRecordType[]

  /** Enable/disable the query (defaults to false for manual triggering) */
  enabled?: boolean
}

/**
 * Status of a DNS query in history
 * Simplified to success/error for UI display
 */
export type DnsHistoryStatus = 'success' | 'error'

/**
 * DNS query history entry stored in localStorage
 * Metadata-only to keep storage usage minimal and respect user privacy
 */
export interface DnsHistoryEntry {
  /** Unique identifier: {domain}-{typeKey}-{timestamp} */
  id: string

  /** Normalized domain name (lowercase, trimmed) */
  domain: string

  /** Array of queried record types */
  types: DnsRecordType[]

  /** Comma-separated types string for deduplication and display */
  typeKey: string

  /** ISO timestamp when query was executed */
  timestamp: string

  /** Query result status */
  status: DnsHistoryStatus

  /** Error code if status is 'error' */
  errorCode?: DnsQueryErrorCode
}

/**
 * Payload for adding a query to DNS history
 * Simplified input format for the addQuery function
 */
export interface DnsHistoryAddPayload {
  /** Domain that was queried */
  domain: string

  /** Record types that were queried (defaults to all if not specified) */
  types?: DnsRecordType[]

  /** Whether the query succeeded or failed */
  status: DnsHistoryStatus

  /** Error code if query failed */
  errorCode?: DnsQueryErrorCode
}

/**
 * UI View Model for DNS Query Form
 * Encapsulates domain state, record selections, and submission logic
 */
export interface DnsQueryFormViewModel {
  /** Current domain input value */
  domain: string

  /** DNS record types currently selected */
  selectedTypes: DnsRecordType[]

  /** Types available for selection (ordered) */
  availableTypes: DnsRecordType[]

  /** Validation message shown under the input (null when valid) */
  validationMessage: string | null

  /** Indicates when a query is being submitted */
  isSubmitting: boolean

  /** Whether the form can be submitted */
  canSubmit: boolean

  /** Last error code emitted by the query */
  errorCode?: DnsQueryErrorCode

  /** Change handler for domain input */
  onDomainChange: (value: string) => void

  /** Toggle handler for DNS record type selection */
  onRecordTypeToggle: (type: DnsRecordType) => void

  /** Select all available record types */
  onSelectAll: () => void

  /** Submit handler invoked by the form */
  onSubmit: () => Promise<void> | void
}

/**
 * View Model for DNS Results Display
 * Provides DNS response data and tab navigation state
 */
export interface DnsResultsViewModel {
  /** Latest DNS response */
  response?: DnsResponse | null

  /** Whether the results are loading */
  isLoading: boolean

  /** Record types to display as tabs */
  recordTypes: DnsRecordType[]

  /** Currently active record type */
  activeType?: DnsRecordType | null

  /** Handler for changing the active record type */
  onTypeChange?: (type: DnsRecordType) => void
}

/**
 * View Model for DNS History Panel
 * Manages history entries and interactions
 */
export interface DnsHistoryViewModel {
  /** Ordered list of history entries (newest first) */
  entries: DnsHistoryEntry[]

  /** Convenience flag for empty state rendering */
  isEmpty: boolean

  /** Select entry callback (reruns query) */
  onSelect: (entry: DnsHistoryEntry) => void

  /** Clear history handler */
  onClear: () => void
}

