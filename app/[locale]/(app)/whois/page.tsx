/**
 * WHOIS Query Page
 * Main page for domain WHOIS lookups
 */

'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { WhoisForm } from '@/features/whois/components/WhoisForm'
import { WhoisResult } from '@/features/whois/components/WhoisResult'
import { useWhoisQuery } from '@/features/whois/hooks'

/**
 * WHOIS page component
 * Manages query state and coordinates form/result interaction
 */
export default function WhoisPage() {
  const t = useTranslations('whois')
  const [inputValue, setInputValue] = React.useState('')
  const [submittedDomain, setSubmittedDomain] = React.useState('')
  const [submitCounter, setSubmitCounter] = React.useState(0)
  const [hasSearched, setHasSearched] = React.useState(false)

  // WHOIS query hook (manual trigger via refetch)
  // Uses submittedDomain so query key doesn't change while user types
  const { data, error, isFetching, refetch } = useWhoisQuery(submittedDomain)

  // Trigger query when submittedDomain changes or form is re-submitted (declarative effect)
  React.useEffect(() => {
    if (submittedDomain && hasSearched && submitCounter > 0) {
      refetch()
    }
  }, [submittedDomain, submitCounter, hasSearched, refetch])

  /**
   * Handle form submission
   * Updates submitted domain state and increments counter (effect will trigger query)
   */
  const handleSubmit = (domain: string) => {
    setSubmittedDomain(domain)
    setInputValue(domain)
    setHasSearched(true)
    setSubmitCounter((prev) => prev + 1)
  }

  /**
   * Handle domain input change
   * Only updates input value, doesn't affect query
   */
  const handleChange = (value: string) => {
    setInputValue(value)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('page.title')}</h1>
        <p className="text-muted-foreground">{t('page.description')}</p>
      </div>

      {/* Query Form */}
      <WhoisForm
        value={inputValue}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isLoading={isFetching}
      />

      {/* Query Results */}
      <WhoisResult
        result={data}
        isLoading={isFetching}
        error={error}
        hasSearched={hasSearched}
      />
    </div>
  )
}
