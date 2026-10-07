'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { publicEnv } from '@/env/public'
import { useAuth } from '@/hooks/use-auth'
import { type Api, createApi } from '@/services/rpc-client'

const ApiContext = createContext<Api | null>(null)

/**
 * Owns the single oRPC client. Reached through useApi(); never construct
 * another client in a component.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken, userId, isReady } = useAuth()

  // The client is created once; it reads the latest getToken through a ref so
  // it never captures a stale one.
  const getTokenRef = useRef(getToken)
  useEffect(() => {
    getTokenRef.current = getToken
  })
  const [api] = useState(() =>
    createApi({ baseUrl: publicEnv.NEXT_PUBLIC_API_URL, getToken: () => getTokenRef.current() }),
  )

  // Drop every cached response when the identity changes (sign-out, or a
  // different user signing in), so one person's data is never shown to the next.
  const queryClient = useQueryClient()
  const lastUserId = useRef<string | null>(null)
  useEffect(() => {
    if (!isReady || lastUserId.current === userId) return
    if (lastUserId.current !== null) queryClient.clear()
    lastUserId.current = userId
  }, [isReady, userId, queryClient])

  return <ApiContext value={api}>{children}</ApiContext>
}

export function useApiContext(): Api {
  const api = useContext(ApiContext)
  if (!api) {
    throw new Error('useApi must be used inside <ApiProvider> (see providers/AppProviders.tsx).')
  }
  return api
}
