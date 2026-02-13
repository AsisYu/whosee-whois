/**
 * DNS History Panel Component
 * Displays recent DNS queries stored in localStorage with rerun capability
 *
 * Features:
 * - Shows last 10 queries (newest first)
 * - Click to rerun previous queries
 * - Clear all history button
 * - Success/error status badges
 * - Relative timestamps
 */

'use client'

import { useCallback } from 'react'
import { Clock, RotateCcw, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDnsHistory } from '@/features/dns/hooks'
import type { DnsHistoryEntry, DnsHistoryViewModel } from '@/features/dns/types'
import { cn } from '@/lib/utils'

interface DnsHistoryProps {
  /** Callback when user clicks a history entry to rerun */
  onSelectEntry?: (entry: DnsHistoryEntry) => void

  /** Additional Tailwind classes */
  className?: string
}

/**
 * Build view model for DNS history panel
 * Wraps useDnsHistory hook and provides interaction handlers
 */
export function useDnsHistoryPanelViewModel(props: DnsHistoryProps = {}): DnsHistoryViewModel {
  const { onSelectEntry } = props
  const { history, clearHistory } = useDnsHistory()

  const handleSelect = useCallback(
    (entry: DnsHistoryEntry) => {
      onSelectEntry?.(entry)
    },
    [onSelectEntry]
  )

  return {
    entries: history,
    isEmpty: history.length === 0,
    onSelect: handleSelect,
    onClear: clearHistory,
  }
}

/**
 * DNS History Panel Component
 * Renders recent query history with rerun and clear actions
 */
export function DnsHistory({ className, onSelectEntry }: DnsHistoryProps) {
  const viewModel = useDnsHistoryPanelViewModel({ onSelectEntry })

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Recent DNS queries</CardTitle>
          <CardDescription>Stored locally in your browser for quick access.</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={viewModel.onClear}
          disabled={viewModel.isEmpty}
          aria-label="Clear DNS query history"
        >
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          Clear history
        </Button>
      </CardHeader>
      <CardContent>
        {viewModel.isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 p-8 text-center">
            <RotateCcw className="mb-3 size-8 text-muted-foreground/60" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">No query history yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run a DNS query to start building your history.
            </p>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {viewModel.entries.map((entry) => (
              <li key={entry.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="flex h-auto w-full flex-col items-start gap-2 rounded-lg border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-border hover:bg-accent/50"
                  onClick={() => viewModel.onSelect(entry)}
                  aria-label={`Rerun DNS query for ${entry.domain}`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex-1 truncate text-sm font-semibold text-foreground">
                      {entry.domain}
                    </span>
                    <Badge
                      variant={entry.status === 'success' ? 'secondary' : 'destructive'}
                      className="shrink-0 text-[10px] uppercase"
                    >
                      {entry.status}
                    </Badge>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span className="line-clamp-1">
                      {entry.types.length > 0
                        ? entry.types.join(', ')
                        : 'All record types'}
                    </span>
                  </div>

                  {entry.errorCode && (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {entry.errorCode}
                    </Badge>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
