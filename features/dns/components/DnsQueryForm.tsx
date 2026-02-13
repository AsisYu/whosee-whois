/**
 * DNS Query Form Component
 * Interactive form for DNS lookups with domain input and record type selection
 *
 * Features:
 * - Domain input with validation
 * - Multiple record type selection with toggle buttons
 * - Real-time validation feedback
 * - Loading states during queries
 * - Integration with useDnsQuery and useDnsHistory hooks
 * - Accessibility with ARIA labels and keyboard navigation
 */

'use client'

import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDnsHistory, useDnsQuery } from '@/features/dns/hooks'
import type { DnsQueryFormViewModel, DnsQueryErrorCode } from '@/features/dns/types'
import { DNS_RECORD_TYPES, type DnsRecordType, type DnsResponse } from '@/lib/types/api'
import { cn } from '@/lib/utils'
import { assertValidDomainInput, normalizeDnsRecordTypes } from '@/lib/utils/validation'

interface DnsQueryFormProps {
  /** Domain displayed on initial render */
  defaultDomain?: string

  /** Record types to pre-select */
  defaultTypes?: DnsRecordType[]

  /** Callback invoked with query results */
  onResult?: (payload: { response?: DnsResponse; errorCode?: DnsQueryErrorCode }) => void

  /** Optional helper text under the form */
  helperText?: string

  /** Additional Tailwind classes */
  className?: string
}

const DEFAULT_HELPER_TEXT =
  'Query DNS records for any domain. Supports A, AAAA, CNAME, MX, NS, TXT, SOA, and PTR lookups.'

const DOMAIN_ERRORS = {
  required: 'Please enter a domain name to query.',
  invalid: 'Enter a valid domain name (e.g., example.com).',
}

/**
 * Build view model for the DNS query form
 * Handles domain state, validation, record type selection, and async submission
 */
export function useDnsQueryFormViewModel(
  props: Omit<DnsQueryFormProps, 'className' | 'helperText'> = {}
): DnsQueryFormViewModel {
  const { defaultDomain, defaultTypes, onResult } = props

  // Domain state with initial normalization
  const [domain, setDomain] = useState(() => defaultDomain?.trim().toLowerCase() ?? '')

  // Selected record types with initial normalization
  const [selectedTypes, setSelectedTypes] = useState<DnsRecordType[]>(() => {
    const normalized = normalizeDnsRecordTypes(defaultTypes).types
    return normalized.length > 0 ? normalized : [...DNS_RECORD_TYPES]
  })

  // Available types (all DNS record types in canonical order)
  const availableTypes = useMemo(() => [...DNS_RECORD_TYPES], [])

  // Validation message (null when valid)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  // Submission loading state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // DNS history hook for persistence
  const { addQuery } = useDnsHistory()

  // DNS query hook (manual trigger mode)
  const query = useDnsQuery({ domain, types: selectedTypes, enabled: false })

  /**
   * Handle domain input changes
   * Clears validation message when user starts typing
   */
  const handleDomainChange = useCallback(
    (value: string) => {
      if (validationMessage) {
        setValidationMessage(null)
      }
      setDomain(value)
    },
    [validationMessage]
  )

  /**
   * Toggle a DNS record type in the selection
   * Prevents removing the last type (at least one must be selected)
   */
  const handleRecordTypeToggle = useCallback((type: DnsRecordType) => {
    setSelectedTypes((prev) => {
      const hasType = prev.includes(type)

      if (hasType) {
        // Prevent removing the last type
        if (prev.length === 1) {
          return prev
        }
        return prev.filter((item) => item !== type)
      }

      // Add type and maintain canonical order
      const nextSet = new Set(prev)
      nextSet.add(type)
      return DNS_RECORD_TYPES.filter((recordType) => nextSet.has(recordType))
    })
  }, [])

  /**
   * Select all available record types
   */
  const handleSelectAll = useCallback(() => {
    setSelectedTypes([...DNS_RECORD_TYPES])
  }, [])

  /**
   * Handle form submission
   * Validates domain, triggers query, updates history, and notifies parent
   */
  const handleSubmit = useCallback(async () => {
    const normalized = domain.trim().toLowerCase()

    // Validation: empty domain
    if (!normalized) {
      setValidationMessage(DOMAIN_ERRORS.required)
      return
    }

    // Validation: invalid domain format
    try {
      assertValidDomainInput(normalized)
    } catch {
      setValidationMessage(DOMAIN_ERRORS.invalid)
      return
    }

    // Clear validation and normalize domain state
    setValidationMessage(null)
    if (normalized !== domain) {
      setDomain(normalized)
    }

    setIsSubmitting(true)
    try {
      const result = await query.refetch()
      const response = result.data
      const errorCode = (result.error?.code ?? query.errorCode) as DnsQueryErrorCode | undefined

      if (response) {
        // Success case
        addQuery({ domain: normalized, types: selectedTypes, status: 'success' })
        onResult?.({ response })
      } else {
        // Error case
        addQuery({ domain: normalized, types: selectedTypes, status: 'error', errorCode })
        onResult?.({ errorCode })
      }
    } catch (error) {
      // Fallback error handling
      const fallbackCode: DnsQueryErrorCode = 'NETWORK_ERROR'
      addQuery({ domain: normalized, types: selectedTypes, status: 'error', errorCode: fallbackCode })
      onResult?.({ errorCode: fallbackCode })

      if (process.env.NODE_ENV === 'development') {
        console.error('[DnsQueryForm] Query submission failed', error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [addQuery, domain, onResult, query, selectedTypes])

  const isBusy = isSubmitting || query.isFetching
  const canSubmit = Boolean(domain.trim()) && !isBusy

  return {
    domain,
    selectedTypes,
    availableTypes,
    validationMessage,
    isSubmitting: isBusy,
    canSubmit,
    errorCode: query.errorCode,
    onDomainChange: handleDomainChange,
    onRecordTypeToggle: handleRecordTypeToggle,
    onSelectAll: handleSelectAll,
    onSubmit: handleSubmit,
  }
}

/**
 * DNS Query Form Component
 * Presentational component that renders the form UI using the view model
 */
export function DnsQueryForm({
  className,
  helperText = DEFAULT_HELPER_TEXT,
  ...options
}: DnsQueryFormProps) {
  const viewModel = useDnsQueryFormViewModel(options)

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void viewModel.onSubmit()
    },
    [viewModel]
  )

  return (
    <Card className={cn('w-full border-border/80 bg-card/95 backdrop-blur', className)}>
      <CardHeader>
        <CardTitle className="text-xl">DNS Lookup</CardTitle>
        <CardDescription>
          Query authoritative DNS servers for domain records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Domain Input */}
          <div className="space-y-2">
            <label htmlFor="dns-domain" className="text-sm font-medium text-foreground">
              Domain name
            </label>
            <Input
              id="dns-domain"
              type="text"
              value={viewModel.domain}
              onChange={(event) => viewModel.onDomainChange(event.target.value)}
              placeholder="example.com"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="dns-domain-helper dns-domain-error"
              aria-invalid={Boolean(viewModel.validationMessage)}
              className="font-mono"
            />
            <p id="dns-domain-helper" className="text-xs text-muted-foreground">
              {helperText}
            </p>
            {viewModel.validationMessage && (
              <p
                id="dns-domain-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {viewModel.validationMessage}
              </p>
            )}
          </div>

          {/* Record Type Selection */}
          <fieldset className="space-y-3" aria-live="polite">
            <legend className="text-sm font-medium text-foreground">Record types</legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="DNS record types">
              {viewModel.availableTypes.map((type) => {
                const isActive = viewModel.selectedTypes.includes(type)
                return (
                  <Button
                    key={type}
                    type="button"
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    aria-pressed={isActive}
                    onClick={() => viewModel.onRecordTypeToggle(type)}
                    className="font-mono"
                  >
                    {type}
                  </Button>
                )
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={viewModel.onSelectAll}
                aria-label="Select all DNS record types"
              >
                Select all
              </Button>
            </div>

            {/* Selected Types Display */}
            {viewModel.selectedTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 text-xs" aria-label="Selected record types">
                <span className="text-muted-foreground">Selected:</span>
                {viewModel.selectedTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="font-mono uppercase">
                    {type}
                  </Badge>
                ))}
              </div>
            )}
          </fieldset>

          {/* Submit Button and Status */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={!viewModel.canSubmit}
              aria-live="polite"
            >
              {viewModel.isSubmitting && (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              )}
              {viewModel.isSubmitting ? 'Querying DNS...' : 'Query DNS'}
            </Button>
            {viewModel.errorCode && !viewModel.isSubmitting && (
              <Badge variant="outline" className="w-fit text-xs uppercase">
                Last error: {viewModel.errorCode}
              </Badge>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
