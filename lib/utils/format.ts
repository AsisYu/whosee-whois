/**
 * Formatting Utilities
 * Helper functions for formatting dates, sizes, and other display values
 */

import { format, formatDistance, parseISO } from 'date-fns'

/**
 * Format ISO date string to human-readable format
 * @param isoString - ISO 8601 date string or null
 * @returns Formatted date string or 'N/A'
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) return 'N/A'

  try {
    const date = parseISO(isoString)
    return format(date, 'MMM d, yyyy')
  } catch {
    return 'Invalid date'
  }
}

/**
 * Format ISO date string to human-readable format with time
 * @param isoString - ISO 8601 date string or null
 * @returns Formatted date and time string or 'N/A'
 */
export function formatDateTime(isoString: string | null): string {
  if (!isoString) return 'N/A'

  try {
    const date = parseISO(isoString)
    return format(date, 'MMM d, yyyy HH:mm:ss')
  } catch {
    return 'Invalid date'
  }
}

/**
 * Format ISO date string to relative time (e.g., "2 hours ago")
 * @param isoString - ISO 8601 date string
 * @returns Relative time string
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const date = parseISO(isoString)
    return formatDistance(date, new Date(), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

/**
 * Format response time in milliseconds to human-readable string
 * @param ms - Response time in milliseconds
 * @returns Formatted response time (e.g., "123ms" or "1.23s")
 */
export function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Format file size in bytes to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 KB", "2.3 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`

  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`

  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(2)} MB`

  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}

/**
 * Format domain name (lowercase, trim whitespace)
 * @param domain - Domain name input
 * @returns Normalized domain name
 */
export function formatDomain(domain: string): string {
  return domain.toLowerCase().trim()
}

/**
 * Format uptime in seconds to human-readable string
 * @param seconds - Uptime in seconds
 * @returns Formatted uptime (e.g., "2d 3h 45m")
 */
export function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

/**
 * Truncate long text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * Format percentage value
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string (e.g., "95.5%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}
