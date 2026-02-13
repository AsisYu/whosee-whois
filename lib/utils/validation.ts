/**
 * Validation Utilities
 * Shared validation functions for client and server
 */

import {
  DNS_RECORD_TYPES,
  type DnsRecord,
  type DnsRecordMap,
  type DnsRecordType,
  type DnsResponse,
  type DnsMxRecord,
  type DnsSoaRecord,
} from '@/lib/types/api'

/** Pre-computed Set for fast DNS record type lookups */
const DNS_RECORD_TYPE_SET = new Set<DnsRecordType>(DNS_RECORD_TYPES as readonly DnsRecordType[])

/**
 * Validate domain name format
 * Checks each label individually for proper formatting
 *
 * @param domain - The domain name to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidDomain('example.com') // true
 * isValidDomain('example .com') // false (contains whitespace)
 * isValidDomain('-example.com') // false (label starts with hyphen)
 * isValidDomain('example') // false (no TLD)
 * ```
 */
export function isValidDomain(domain: string): boolean {
  // Reject empty or whitespace-containing strings
  if (!domain || /\s/.test(domain)) {
    return false
  }

  // Basic structure: must have at least one dot
  if (!domain.includes('.')) {
    return false
  }

  // Split into labels and validate each
  const labels = domain.split('.')

  // Must have at least 2 labels (e.g., example.com)
  if (labels.length < 2) {
    return false
  }

  // Validate each label
  for (const label of labels) {
    // Label must be 1-63 characters
    if (label.length === 0 || label.length > 63) {
      return false
    }

    // Label cannot start or end with hyphen
    if (label.startsWith('-') || label.endsWith('-')) {
      return false
    }

    // Label must only contain alphanumeric and hyphens
    if (!/^[a-z0-9-]+$/i.test(label)) {
      return false
    }
  }

  return true
}

/**
 * Normalize and validate domain input
 * Provides consistent domain validation across WHOIS and DNS services
 *
 * @param rawDomain - Raw domain input from user
 * @returns Normalized domain (trimmed, lowercased)
 * @throws Error if domain is empty or invalid format
 *
 * @example
 * ```typescript
 * assertValidDomainInput('  Example.COM  ') // 'example.com'
 * assertValidDomainInput('') // throws Error('Domain value is required')
 * assertValidDomainInput('invalid domain') // throws Error('Domain format is invalid')
 * ```
 */
export function assertValidDomainInput(rawDomain: string): string {
  const normalized = rawDomain.trim().toLowerCase()

  if (!normalized) {
    throw new Error('Domain value is required')
  }

  if (!isValidDomain(normalized)) {
    throw new Error('Domain format is invalid')
  }

  return normalized
}

/**
 * Runtime type guard for DNS record type strings
 * Uses pre-computed Set for O(1) lookup performance
 *
 * @param value - Value to check
 * @returns true if value is a valid DnsRecordType
 */
export function isDnsRecordType(value: unknown): value is DnsRecordType {
  return typeof value === 'string' && DNS_RECORD_TYPE_SET.has(value as DnsRecordType)
}

/**
 * Canonicalize DNS record types with deterministic ordering
 * Ensures consistent TanStack Query cache keys across requests
 *
 * @param input - Array of record type strings (may contain invalid types)
 * @returns Object containing validated types, invalid types, and all-types flag
 *
 * @example
 * ```typescript
 * normalizeDnsRecordTypes(['a', 'MX', 'invalid'])
 * // { types: ['A', 'MX'], invalid: ['INVALID'], isAllTypes: false }
 *
 * normalizeDnsRecordTypes([])
 * // { types: ['A', 'AAAA', ...], invalid: [], isAllTypes: true }
 * ```
 */
export function normalizeDnsRecordTypes(
  input?: readonly (string | DnsRecordType)[]
): { types: DnsRecordType[]; invalid: string[]; isAllTypes: boolean } {
  // Default to all types if no input provided
  const rawValues = input && input.length ? input : DNS_RECORD_TYPES

  // Normalize: trim, uppercase, filter empty strings
  const normalized = rawValues
    .map((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
    .filter((value): value is string => Boolean(value))

  // Separate valid and invalid types
  const invalid = normalized.filter((value) => !isDnsRecordType(value))

  // Build Set of valid types (automatic deduplication)
  const requestedSet = new Set<DnsRecordType>()
  for (const value of normalized) {
    if (isDnsRecordType(value)) {
      requestedSet.add(value)
    }
  }

  // Maintain deterministic order from DNS_RECORD_TYPES constant
  const types = DNS_RECORD_TYPES.filter((type) => requestedSet.has(type))

  return {
    types,
    invalid,
    isAllTypes: types.length === DNS_RECORD_TYPES.length,
  }
}

/**
 * Comprehensive type guard for DNS response payloads
 * Validates response structure, record types, and individual record fields
 * Prevents malformed backend data from reaching hooks/components
 *
 * @param payload - Unknown payload to validate
 * @returns true if payload matches DnsResponse structure
 */
export function isDnsResponsePayload(payload: unknown): payload is DnsResponse {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Partial<DnsResponse>

  // Validate success field (required by API contract)
  if (typeof candidate.success !== 'boolean') {
    return false
  }

  // Validate data object exists
  if (!candidate.data || typeof candidate.data !== 'object') {
    return false
  }

  const data = candidate.data as Partial<DnsResponse['data']>

  // Validate required data fields with proper type guards
  if (
    typeof data.domain !== 'string' ||
    !isDnsRecordTypeArray(data.requestedTypes) ||
    !isDnsRecordTypeArray(data.resolvedTypes) ||
    !isDnsRecordMap(data.records)
  ) {
    return false
  }

  // Validate meta object
  if (!candidate.meta || typeof candidate.meta !== 'object') {
    return false
  }

  const meta = candidate.meta as Partial<DnsResponse['meta']>

  // Validate required meta fields
  if (typeof meta.timestamp !== 'string' || typeof meta.cached !== 'boolean') {
    return false
  }

  // Validate optional meta fields (when present)
  if (meta.cachedAt !== null && meta.cachedAt !== undefined && typeof meta.cachedAt !== 'string') {
    return false
  }

  if (meta.processing !== null && meta.processing !== undefined && typeof meta.processing !== 'number') {
    return false
  }

  return true
}

/**
 * Type guard for arrays of DNS record types
 * Ensures all array elements are valid DnsRecordType values
 */
function isDnsRecordTypeArray(value: unknown): value is DnsRecordType[] {
  return Array.isArray(value) && value.every((item) => isDnsRecordType(item))
}

/**
 * Type guard for DNS record maps
 * Validates that all keys are valid record types and all values are record arrays
 */
function isDnsRecordMap(candidate: unknown): candidate is DnsRecordMap {
  if (!candidate || typeof candidate !== 'object') {
    return false
  }

  // Validate each key-value pair
  for (const [type, records] of Object.entries(candidate as Record<string, unknown>)) {
    // Key must be a valid DNS record type
    if (!isDnsRecordType(type)) {
      return false
    }

    // Value must be an array of valid DNS records
    if (!Array.isArray(records) || records.some((record) => !isDnsRecord(record))) {
      return false
    }
  }

  return true
}

/**
 * Type guard for individual DNS records
 * Validates base fields and type-specific fields (MX priority, SOA metadata)
 */
function isDnsRecord(record: unknown): record is DnsRecord {
  if (!record || typeof record !== 'object') {
    return false
  }

  const base = record as Partial<DnsRecord>

  // Validate base fields required for all record types
  if (
    !isDnsRecordType(base.type) ||
    typeof base.name !== 'string' ||
    typeof base.value !== 'string' ||
    typeof base.ttl !== 'number' ||
    Number.isNaN(base.ttl)
  ) {
    return false
  }

  // Type-specific validation for MX records (require priority field)
  if (base.type === 'MX') {
    const mx = record as Partial<DnsMxRecord>
    return typeof mx.priority === 'number' && !Number.isNaN(mx.priority)
  }

  // Type-specific validation for SOA records (require all SOA metadata fields)
  if (base.type === 'SOA') {
    const soa = record as Partial<DnsSoaRecord>
    return (
      typeof soa.serial === 'number' &&
      typeof soa.refresh === 'number' &&
      typeof soa.retry === 'number' &&
      typeof soa.expire === 'number' &&
      typeof soa.minimum === 'number' &&
      typeof soa.primaryNs === 'string' &&
      typeof soa.adminEmail === 'string' &&
      !Number.isNaN(soa.serial) &&
      !Number.isNaN(soa.refresh) &&
      !Number.isNaN(soa.retry) &&
      !Number.isNaN(soa.expire) &&
      !Number.isNaN(soa.minimum)
    )
  }

  // Other record types (A, AAAA, CNAME, NS, TXT, PTR) only require base fields
  return true
}
