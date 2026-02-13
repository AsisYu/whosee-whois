/**
 * DNS Results Display Component
 * Renders DNS query results with tabbed navigation and copy-to-clipboard functionality
 *
 * Features:
 * - Tabbed view organized by DNS record type
 * - Formatted display of all DNS record fields
 * - Copy-to-clipboard for record values
 * - Loading skeleton states
 * - Empty state handling
 * - Response metadata (timestamp, cached flag, processing time)
 * - Specialized rendering for MX and SOA records
 */

'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ClipboardCopy, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DnsResultsViewModel } from '@/features/dns/types'
import {
  type DnsRecord,
  type DnsRecordType,
  type DnsResponse,
  type DnsMxRecord,
  type DnsSoaRecord,
} from '@/lib/types/api'
import { cn } from '@/lib/utils'

interface DnsResultsProps {
  /** DNS response data to display */
  response?: DnsResponse | null

  /** Loading state for skeleton display */
  isLoading?: boolean

  /** Default active tab (record type) */
  defaultType?: DnsRecordType

  /** Callback when active tab changes */
  onTypeChange?: (type: DnsRecordType) => void

  /** Custom empty state title */
  emptyStateTitle?: string

  /** Custom empty state description */
  emptyStateDescription?: string

  /** Additional Tailwind classes */
  className?: string
}

const DEFAULT_EMPTY_TITLE = 'No DNS results yet'
const DEFAULT_EMPTY_DESCRIPTION = 'Submit a domain above to query authoritative DNS servers.'

/**
 * Build view model for DNS results display
 * Manages record types, active tab state, and tab change handling
 */
export function useDnsResultsViewModel(props: DnsResultsProps = {}): DnsResultsViewModel {
  const { response, isLoading = false, defaultType, onTypeChange } = props

  // Extract record types from response (resolved types take precedence)
  const recordTypes = useMemo(() => {
    if (response?.data?.resolvedTypes?.length) {
      return response.data.resolvedTypes
    }
    if (response?.data?.requestedTypes?.length) {
      return response.data.requestedTypes
    }
    return []
  }, [response])

  const [activeType, setActiveType] = useState<DnsRecordType | null>(defaultType ?? null)

  // Update active type when record types change
  useEffect(() => {
    if (!recordTypes.length) {
      setActiveType(null)
      return
    }

    setActiveType((current) => {
      // Keep current if still valid
      if (current && recordTypes.includes(current)) {
        return current
      }
      // Use default if available
      if (defaultType && recordTypes.includes(defaultType)) {
        return defaultType
      }
      // Fall back to first type
      return recordTypes[0]
    })
  }, [defaultType, recordTypes])

  const handleTypeChange = useCallback(
    (next: DnsRecordType) => {
      setActiveType(next)
      onTypeChange?.(next)
    },
    [onTypeChange]
  )

  return {
    response,
    isLoading,
    recordTypes,
    activeType,
    onTypeChange: handleTypeChange,
  }
}

/**
 * DNS Results Component
 * Presentational component that renders DNS records with tabs and metadata
 */
export function DnsResults({
  className,
  emptyStateTitle = DEFAULT_EMPTY_TITLE,
  emptyStateDescription = DEFAULT_EMPTY_DESCRIPTION,
  ...options
}: DnsResultsProps) {
  const viewModel = useDnsResultsViewModel(options)
  const { response, isLoading, recordTypes, activeType } = viewModel

  // Copy-to-clipboard state
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Announcement for screen readers
  const [copyAnnouncement, setCopyAnnouncement] = useState<string>('')

  // Clear copied state when tab or response changes
  useEffect(() => {
    setCopiedKey(null)
    setCopyAnnouncement('')
  }, [activeType, response])

  // Handle copy-to-clipboard
  const handleCopy = useCallback(async (value: string, key: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setCopyAnnouncement('DNS record value copied to clipboard')
      window.setTimeout(() => {
        setCopiedKey(null)
        setCopyAnnouncement('')
      }, 1500)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[DnsResults] Unable to copy DNS record', error)
      }
    }
  }, [])

  // Format timestamp as relative time
  const timestampLabel = response
    ? formatDistanceToNow(new Date(response.meta.timestamp), { addSuffix: true })
    : null

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('w-full', className)} aria-busy="true">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!response) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>{emptyStateTitle}</CardTitle>
          <CardDescription>{emptyStateDescription}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const domain = response.data.domain
  const tabValue = activeType ?? recordTypes[0] ?? null

  return (
    <Card className={cn('w-full', className)}>
      {/* Screen reader announcement for copy actions */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {copyAnnouncement}
      </div>

      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-xl">DNS Results</CardTitle>
          {response.meta.cached && (
            <Badge variant="secondary" className="text-[10px]">
              Cached
            </Badge>
          )}
        </div>
        <CardDescription className="font-mono">
          {domain} • {recordTypes.length > 0 ? `${recordTypes.length} record types` : 'No records found'}
        </CardDescription>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {timestampLabel && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              Updated {timestampLabel}
            </span>
          )}
          {typeof response.meta.processing === 'number' && (
            <Badge variant="outline" className="text-[10px]">
              {response.meta.processing}ms
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {recordTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30 p-8 text-center">
            <p className="text-sm font-medium text-foreground">No DNS records found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The domain exists but has no DNS records configured.
            </p>
          </div>
        ) : (
          <Tabs
            value={tabValue ?? recordTypes[0]}
            onValueChange={(value) => viewModel.onTypeChange?.(value as DnsRecordType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-flow-col overflow-x-auto">
              {recordTypes.map((type) => (
                <TabsTrigger key={type} value={type} className="min-w-[80px] font-mono">
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>

            {recordTypes.map((type) => {
              const records = response.data.records[type] ?? []
              return (
                <TabsContent key={type} value={type} className="mt-4">
                  {records.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No {type} records found for {domain}.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3" role="list">
                      {records.map((record, index) => {
                        const recordKey = `${record.type}-${record.name}-${index}`
                        const isCopied = copiedKey === recordKey
                        return (
                          <li
                            key={recordKey}
                            className="rounded-lg border border-border/70 bg-card/60 p-4 transition-colors hover:bg-card/80"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex flex-1 flex-col gap-2">
                                {/* Record Header */}
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <Badge variant="outline" className="font-mono">
                                    {record.type}
                                  </Badge>
                                  <span className="break-all font-mono font-semibold text-foreground">
                                    {record.name}
                                  </span>
                                </div>

                                {/* Record Value */}
                                <p className="break-words font-mono text-sm text-muted-foreground">
                                  {record.value}
                                </p>

                                {/* Record Metadata */}
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="font-mono text-[10px]">
                                    TTL {record.ttl}s
                                  </Badge>
                                  {renderRecordDetails(record)}
                                </div>
                              </div>

                              {/* Copy Button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(record.value, recordKey)}
                                aria-label={`Copy ${record.type} record value`}
                                className="shrink-0"
                              >
                                {isCopied ? (
                                  <Check className="size-4 text-green-600" aria-hidden="true" />
                                ) : (
                                  <ClipboardCopy className="size-4" aria-hidden="true" />
                                )}
                              </Button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Render type-specific record details
 * Extracts and displays additional fields for MX and SOA records
 */
function renderRecordDetails(record: DnsRecord): React.ReactNode {
  if (record.type === 'MX') {
    const mx = record as DnsMxRecord
    return (
      <span className="font-mono">
        Priority: <span className="font-semibold">{mx.priority}</span>
      </span>
    )
  }

  if (record.type === 'SOA') {
    const soa = record as DnsSoaRecord
    return (
      <Fragment>
        <span className="font-mono">
          Serial: <span className="font-semibold">{soa.serial}</span>
        </span>
        <span className="truncate font-mono" title={soa.adminEmail}>
          Admin: <span className="font-semibold">{soa.adminEmail}</span>
        </span>
      </Fragment>
    )
  }

  return null
}
