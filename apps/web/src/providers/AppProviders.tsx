'use client'

import type { ReactNode } from 'react'
import { ApiProvider } from './ApiProvider'
import { AuthProvider } from './AuthProvider'
import { ModalProvider } from './ModalProvider'
import { QueryProvider } from './QueryProvider'

/**
 * The single root provider; the root layout mounts it once. Order matters:
 * ApiProvider needs auth (for tokens) and the query client (to clear it when
 * the user changes).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <QueryProvider>
        <ApiProvider>
          <ModalProvider>{children}</ModalProvider>
        </ApiProvider>
      </QueryProvider>
    </AuthProvider>
  )
}
