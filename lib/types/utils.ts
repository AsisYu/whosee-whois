/**
 * Type Utilities
 * Type guards and utility functions for type checking
 */

import type { DomainQuery } from './common'

/**
 * Type guard: Check if query result is successful
 */
export function isSuccessfulQuery<T extends DomainQuery>(
  query: T
): query is T & { status: 'success'; responseTime: number } {
  return query.status === 'success'
}

/**
 * Type guard: Check if query result has error
 */
export function isFailedQuery<T extends DomainQuery>(
  query: T
): query is T & { status: 'failed'; error: { code: string; message: string } } {
  return query.status === 'failed'
}

/**
 * Extract data type from query result
 */
export type QueryData<T extends DomainQuery> = T extends { data: infer D } ? D : never

/**
 * Utility: Generate cache key for TanStack Query
 */
export function getQueryKey(type: DomainQuery['type'], target: string): string[] {
  return [type, target.toLowerCase().trim()]
}
