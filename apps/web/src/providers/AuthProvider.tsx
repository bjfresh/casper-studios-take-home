'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import type { ReactNode } from 'react'
import { PRIVY_LOGIN_METHODS } from '@/constants/auth'
import { publicEnv } from '@/env/public'

/** False when no Privy app id is set; useAuth() then reports auth as unavailable. */
export const isAuthConfigured = Boolean(publicEnv.NEXT_PUBLIC_PRIVY_APP_ID)

/**
 * Privy SDK configuration, mounted once at the root. Privy owns credentials,
 * OTP codes, OAuth handshakes and session restoration; nothing in this app
 * reimplements any of them.
 *
 * Without an app id it renders children with NO Privy context. That is a
 * development affordance so a fresh clone boots, NOT an authorization mode:
 * nothing is unlocked. The API fails closed on its own when it has no
 * credentials, so every protected call still rejects.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const appId = publicEnv.NEXT_PUBLIC_PRIVY_APP_ID
  if (!appId) return <>{children}</>

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: [...PRIVY_LOGIN_METHODS],
        // No on-chain features: never create embedded wallets, on any chain.
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
          solana: { createOnLogin: 'off' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
