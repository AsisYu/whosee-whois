'use client'

import * as React from 'react'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from '@tanstack/react-query'

/**
 * Create QueryClient instance with optimized defaults
 * - Retry: 1 attempt for queries, 0 for mutations
 * - Stale time: 30 seconds
 * - Garbage collection: 5 minutes
 * - Error logging in development
 */
const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[Query Error]', query?.queryKey, error)
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[Mutation Error]', mutation?.options?.mutationKey, error)
        }
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000, // 30 seconds
        gcTime: 300_000, // 5 minutes (formerly cacheTime)
        refetchOnWindowFocus: false, // Prevent refetch on window focus
      },
      mutations: {
        retry: 0, // No retry for mutations by default
      },
    },
  })

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(createQueryClient)

  return <TanStackQueryClientProvider client={queryClient}>{children}</TanStackQueryClientProvider>
}
