'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { isRetryable } from '@/services/api-errors'

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState, not a module-level client: one per browser session, and never
  // shared between requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Retrying a 401/403/404 can't succeed and delays the real UI.
            retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
          },
        },
      }),
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
