/**
 * DNS Query Page
 * Main page for DNS record lookups with query form, results display, and history
 *
 * Features:
 * - DNS query form with domain input and record type selection
 * - Tabbed results display for different DNS record types
 * - Query history panel for quick reruns
 * - Error handling with user-friendly messages
 * - Responsive layout with proper spacing
 */

'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  DnsQueryForm,
  DnsResults,
  DnsHistory,
  DnsError,
} from '@/features/dns/components'
import type { DnsQueryErrorCode, DnsHistoryEntry } from '@/features/dns/types'
import type { DnsResponse } from '@/lib/types/api'

/**
 * DNS Query Page Component
 * Coordinates form, results, history, and error display
 */
export default function DnsPage() {
  const t = useTranslations('dns')

  // Results state
  const [response, setResponse] = useState<DnsResponse | null>(null)
  const [errorCode, setErrorCode] = useState<DnsQueryErrorCode | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  // Form state for rerun from history
  const [defaultDomain, setDefaultDomain] = useState<string | undefined>()
  const [defaultTypes, setDefaultTypes] = useState<string[] | undefined>()

  /**
   * Handle query results from form submission
   * Updates results or error state based on outcome
   */
  const handleResult = useCallback(
    (payload: { response?: DnsResponse; errorCode?: DnsQueryErrorCode }) => {
      if (payload.response) {
        setResponse(payload.response)
        setErrorCode(undefined)
        setIsLoading(false)
      } else if (payload.errorCode) {
        setResponse(null)
        setErrorCode(payload.errorCode)
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Handle history entry selection (rerun query)
   * Updates form defaults which triggers a new query via form component
   */
  const handleSelectHistory = useCallback((entry: DnsHistoryEntry) => {
    setDefaultDomain(entry.domain)
    setDefaultTypes(entry.types)
    setIsLoading(true)
    setErrorCode(undefined)
    // Clear defaults after a tick to allow form to remount with new values
    setTimeout(() => {
      setDefaultDomain(undefined)
      setDefaultTypes(undefined)
    }, 0)
  }, [])

  /**
   * Handle retry from error display
   * Form component will handle the actual resubmission
   */
  const handleRetry = useCallback(() => {
    setErrorCode(undefined)
    setResponse(null)
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('page.title') || 'DNS Lookup'}
        </h1>
        <p className="text-muted-foreground">
          {t('page.description') ||
            'Query authoritative DNS servers for domain records including A, AAAA, CNAME, MX, NS, TXT, SOA, and PTR records.'}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        {/* Left Column: Form and Results */}
        <div className="space-y-6">
          {/* Query Form */}
          <DnsQueryForm
            defaultDomain={defaultDomain}
            defaultTypes={defaultTypes as any}
            onResult={handleResult}
          />

          {/* Error Display */}
          {errorCode && !isLoading && (
            <DnsError
              errorCode={errorCode}
              onRetry={handleRetry}
            />
          )}

          {/* Results Display */}
          {(response || isLoading) && !errorCode && (
            <DnsResults
              response={response}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Right Column: History Panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <DnsHistory onSelectEntry={handleSelectHistory} />
        </div>
      </div>
    </div>
  )
}
