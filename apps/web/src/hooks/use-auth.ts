import { usePrivy } from '@privy-io/react-auth'
import { useCallback, useMemo } from 'react'
import { isAuthConfigured } from '@/providers/AuthProvider'

export type Auth = {
  /** False until Privy has restored (or ruled out) an existing session. Gate signed-out UI on it. */
  isReady: boolean
  isAuthenticated: boolean
  /** The Privy DID: the stable identity. The API maps it to a local user id. */
  userId: string | null
  email: string | null
  /** Opens Privy's sign-in flow. Prefer opening the SIGN_IN modal (SignInModal). */
  login: () => void
  logout: () => Promise<void>
  /**
   * A fresh access token, or null when signed out. Call it at request time
   * only, and never store, log or display the result. Prefer useApi(), which
   * calls it for you.
   */
  getToken: () => Promise<string | null>
  /** False when no Privy app id is set: auth-dependent UI explains or hides the action. */
  isConfigured: boolean
}

/**
 * The app's ONLY auth surface. Components never import @privy-io/react-auth
 * (biome.jsonc enforces this): keeping the vendor behind this file is what
 * makes it replaceable and keeps auth behaviour consistent.
 *
 * usePrivy() is called unconditionally. Without a PrivyProvider (unconfigured)
 * it returns inert defaults — `ready: false` and functions that throw — so
 * every value below is guarded by `isConfigured`.
 */
export function useAuth(): Auth {
  const privy = usePrivy()
  // A build-time constant (it comes from NEXT_PUBLIC_PRIVY_APP_ID), so it is
  // read directly below and never needs to be a hook dependency.
  const isConfigured = isAuthConfigured

  // Unconfigured is "ready": there's no session to restore, and reporting
  // not-ready would leave gates showing a spinner forever.
  const isReady = isConfigured ? privy.ready : true
  const isAuthenticated = isConfigured && privy.ready && privy.authenticated
  const user = isAuthenticated ? privy.user : null
  const userId = user?.id ?? null
  const email = user?.email?.address ?? user?.google?.email ?? user?.apple?.email ?? null

  const { getAccessToken, login: privyLogin, logout: privyLogout } = privy

  const getToken = useCallback(async () => {
    if (!isAuthConfigured) return null
    try {
      return await getAccessToken()
    } catch {
      // Neutral value instead of a vendor error, which can carry sensitive
      // detail and has no business reaching UI or logs.
      return null
    }
  }, [getAccessToken])

  const login = useCallback(() => {
    if (!isAuthConfigured) return
    try {
      privyLogin()
    } catch {
      // Same: never surface a raw vendor error.
    }
  }, [privyLogin])

  const logout = useCallback(async () => {
    if (!isAuthConfigured) return
    try {
      await privyLogout()
    } catch {
      // Same: never surface a raw vendor error.
    }
  }, [privyLogout])

  return useMemo(
    () => ({ isReady, isAuthenticated, userId, email, login, logout, getToken, isConfigured }),
    [isReady, isAuthenticated, userId, email, login, logout, getToken],
  )
}
