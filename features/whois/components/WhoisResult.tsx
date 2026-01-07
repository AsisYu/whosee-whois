/**
 * WHOIS Result Component
 * Displays WHOIS query results with formatting and state handling
 */

'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'

import type { WhoisResponse } from '@/features/whois/types'
import { cn } from '@/lib/utils/cn'

interface WhoisResultProps {
  /** WHOIS query result data */
  result?: WhoisResponse

  /** Whether query is in progress */
  isLoading?: boolean

  /** Error from query execution */
  error?: unknown

  /** Whether user has performed a search */
  hasSearched?: boolean
}

/**
 * WHOIS result display component
 * Handles loading, error, empty, and success states
 */
export function WhoisResult({ result, isLoading, error, hasSearched = false }: WhoisResultProps) {
  const t = useTranslations('whois')
  const locale = useLocale()

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>{t('result.loading')}</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    // Extract error code if available (from API responses or Error objects with custom properties)
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null

    // Use localized error message based on error code, or fallback to generic
    const errorMessage = errorCode && t.has(`result.error.${errorCode}`)
      ? t(`result.error.${errorCode}`)
      : t('result.error.generic')

    return (
      <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/10 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-medium text-destructive">
              {t('result.error.title')}
            </h3>
            <p className="text-sm text-destructive/90">{errorMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  // Empty state (no search performed yet)
  if (!hasSearched || !result) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-border bg-card p-12 text-center shadow-sm">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-sm text-muted-foreground">{t('result.empty')}</p>
      </div>
    )
  }

  // Success state - display WHOIS data
  const { data, meta } = result

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
      {/* Header with domain and availability status */}
      <div className="border-b border-border pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{data.domain}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.available ? t('result.available') : t('result.registered')}
            </p>
          </div>
          {meta.cached && (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              {t('result.cached')}
            </span>
          )}
        </div>
      </div>

      {/* WHOIS data fields */}
      <div className="space-y-3">
        {/* Registrar */}
        {data.registrar && (
          <DataField label={t('result.fields.registrar')} value={data.registrar} />
        )}

        {/* Creation Date */}
        {data.creationDate && (
          <DataField
            label={t('result.fields.creationDate')}
            value={formatDate(data.creationDate, locale)}
          />
        )}

        {/* Expiry Date */}
        {data.expiryDate && (
          <DataField
            label={t('result.fields.expiryDate')}
            value={formatDate(data.expiryDate, locale)}
            highlight={isExpiringSoon(data.expiryDate)}
          />
        )}

        {/* Updated Date */}
        {data.updatedDate && (
          <DataField
            label={t('result.fields.updatedDate')}
            value={formatDate(data.updatedDate, locale)}
          />
        )}

        {/* Status */}
        {data.status && data.status.length > 0 && (
          <div className="space-y-1.5">
            <dt className="text-sm font-medium text-foreground">
              {t('result.fields.status')}
            </dt>
            <dd className="flex flex-wrap gap-2">
              {data.status.map((status, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {status}
                </span>
              ))}
            </dd>
          </div>
        )}

        {/* Name Servers */}
        {data.nameServers && data.nameServers.length > 0 && (
          <div className="space-y-1.5">
            <dt className="text-sm font-medium text-foreground">
              {t('result.fields.nameServers')}
            </dt>
            <dd className="space-y-1">
              {data.nameServers.map((ns, index) => (
                <div
                  key={index}
                  className="text-sm text-muted-foreground font-mono"
                >
                  {ns}
                </div>
              ))}
            </dd>
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            {t('result.meta.source')}: {data.sourceProvider}
          </span>
          <span>
            {t('result.meta.timestamp')}: {formatDate(meta.timestamp, locale, true)}
          </span>
          {meta.processing !== null && meta.processing !== undefined && (
            <span>
              {t('result.meta.processing')}: {meta.processing}ms
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Reusable data field component
 */
interface DataFieldProps {
  label: string
  value: string
  highlight?: boolean
}

function DataField({ label, value, highlight = false }: DataFieldProps) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-foreground">{label}</dt>
      <dd
        className={cn(
          'text-sm text-muted-foreground',
          highlight && 'font-medium text-amber-600 dark:text-amber-400'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/**
 * Format date string to locale-aware format
 */
function formatDate(dateString: string, locale: string, includeTime = false): string {
  try {
    const date = new Date(dateString)

    if (includeTime) {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date)
    }

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    return dateString
  }
}

/**
 * Check if expiry date is within 30 days
 */
function isExpiringSoon(expiryDate: string): boolean {
  try {
    const expiry = new Date(expiryDate)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return expiry <= thirtyDaysFromNow
  } catch {
    return false
  }
}
