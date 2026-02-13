/**
 * DNS Error Display Component
 * Maps DNS error codes to user-friendly alert messages with retry actions
 *
 * Features:
 * - Error code to user-friendly message mapping
 * - Severity-based styling (info, warning, error)
 * - Optional retry button
 * - Accessible with ARIA labels
 */

'use client'

import { useMemo } from 'react'
import { AlertTriangle, Globe, ShieldAlert } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DnsQueryErrorCode } from '@/features/dns/types'
import { cn } from '@/lib/utils'

interface DnsErrorProps {
  /** DNS-specific error code */
  errorCode?: DnsQueryErrorCode

  /** Optional custom error message (overrides default) */
  message?: string

  /** Retry callback (shows retry button when provided) */
  onRetry?: () => void

  /** Custom retry button label */
  retryLabel?: string

  /** Additional Tailwind classes */
  className?: string
}

/** Error severity levels for styling */
type ErrorSeverity = 'info' | 'warning' | 'error'

/** Error metadata for each DNS error code */
interface ErrorMetadata {
  title: string
  description: string
  severity: ErrorSeverity
}

/**
 * Mapping of DNS error codes to user-friendly copy
 * Each entry includes title, description, and severity for UI rendering
 */
const ERROR_COPY: Record<DnsQueryErrorCode | 'DEFAULT', ErrorMetadata> = {
  INVALID_DOMAIN: {
    title: 'Invalid domain',
    description: 'The domain does not meet DNS formatting requirements. Please check the domain and try again.',
    severity: 'warning',
  },
  INVALID_TYPE: {
    title: 'Unsupported record type',
    description: 'Please select at least one valid DNS record type (A, AAAA, CNAME, MX, NS, TXT, SOA, PTR).',
    severity: 'warning',
  },
  DNS_LOOKUP_FAILED: {
    title: 'DNS lookup failed',
    description: 'Something went wrong while contacting the DNS resolver. Please try again in a moment.',
    severity: 'error',
  },
  NXDOMAIN: {
    title: 'Domain not found',
    description: 'The requested domain does not exist in DNS. Check the domain spelling and try again.',
    severity: 'info',
  },
  SERVFAIL: {
    title: 'Server failure',
    description: 'The authoritative name server failed to respond. This may be temporary—try again shortly.',
    severity: 'warning',
  },
  REFUSED: {
    title: 'Query refused',
    description: 'The DNS server refused the query. This may be due to rate limits or access restrictions.',
    severity: 'warning',
  },
  REQUEST_FAILED: {
    title: 'Network request failed',
    description: 'Unable to reach the DNS service. Check your internet connection and try again.',
    severity: 'error',
  },
  REQUEST_TIMEOUT: {
    title: 'Request timed out',
    description: 'The DNS resolver did not respond in time. Try again or check your network connection.',
    severity: 'warning',
  },
  NETWORK_ERROR: {
    title: 'Network error',
    description: 'Unable to reach the DNS service from this device. Check your network settings.',
    severity: 'error',
  },
  DEFAULT: {
    title: 'DNS lookup error',
    description: 'We were unable to complete the DNS query. Please try again.',
    severity: 'info',
  },
}

/**
 * DNS Error Display Component
 * Renders user-friendly error alerts for DNS query failures
 */
export function DnsError({
  errorCode,
  message,
  onRetry,
  retryLabel = 'Retry query',
  className,
}: DnsErrorProps) {
  // Resolve error metadata based on error code
  const meta = useMemo((): ErrorMetadata => {
    if (errorCode && ERROR_COPY[errorCode]) {
      return ERROR_COPY[errorCode]
    }
    return ERROR_COPY.DEFAULT
  }, [errorCode])

  // Don't render if no error code or message
  if (!errorCode && !message) {
    return null
  }

  const severity = meta.severity
  const variant = severity === 'error' ? 'destructive' : 'default'
  const description = message ?? meta.description

  // Icon selection based on severity
  const Icon = severity === 'error' ? ShieldAlert : severity === 'warning' ? AlertTriangle : Globe

  return (
    <Alert variant={variant} className={cn('w-full border-border/70', className)} role="alert">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-3">
          <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <AlertTitle className="flex flex-wrap items-center gap-2 text-base">
              {meta.title}
              {errorCode && (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {errorCode}
                </Badge>
              )}
            </AlertTitle>
            <AlertDescription className="mt-1.5 text-sm text-muted-foreground">
              {description}
            </AlertDescription>
          </div>
        </div>
        {onRetry && (
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            className="shrink-0"
            aria-label={retryLabel}
          >
            {retryLabel}
          </Button>
        )}
      </div>
    </Alert>
  )
}
