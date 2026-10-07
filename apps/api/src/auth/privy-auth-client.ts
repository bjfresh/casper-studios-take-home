import { InvalidAuthTokenError, PrivyClient } from '@privy-io/node'
import type { Env } from '../env'
import { type AuthClient, withProfileCache } from './auth-client'

// The only literal the SDK gives us to tell "expired" from "invalid": it maps
// jose's JWTExpired to an InvalidAuthTokenError with this message. Pinned by
// auth/__tests__/privy-auth-client.test.ts, which signs real tokens, so an SDK
// change to the wording fails a test instead of silently degrading every
// expiry to "invalid".
const PRIVY_EXPIRED_MESSAGE = 'Authentication token expired'

type PrivyUser = Awaited<ReturnType<ReturnType<PrivyClient['users']>['_get']>>

/** First email Privy knows, in priority: email login, then Google, then Apple. */
function emailOf(user: PrivyUser): string | null {
  for (const account of user.linked_accounts) {
    if (account.type === 'email') return account.address
  }
  for (const account of user.linked_accounts) {
    if (account.type === 'google_oauth') return account.email
    // Apple may hand out a private-relay address, and only returns the
    // user's name on the FIRST authorization. We don't store names; if that
    // changes, persist it on first sign-in because later logins omit it.
    if (account.type === 'apple_oauth' && account.email) return account.email
  }
  return null
}

export function createPrivyAuthClient({
  appId,
  appSecret,
  verificationKey,
}: {
  appId: string
  appSecret: string
  verificationKey?: string
}): AuthClient {
  const privy = new PrivyClient({ appId, appSecret, jwtVerificationKey: verificationKey })

  return {
    async verifyToken(token) {
      try {
        // Verifies the ES256 signature, issuer, audience and expiry locally —
        // no network call on the hot path once the key is known.
        const { user_id } = await privy.utils().auth().verifyAccessToken(token)
        return { ok: true, privyUserId: user_id }
      } catch (error) {
        if (error instanceof InvalidAuthTokenError) {
          return {
            ok: false,
            reason: error.message === PRIVY_EXPIRED_MESSAGE ? 'expired_token' : 'invalid_token',
          }
        }
        // Anything else (e.g. fetching the JWKS failed) is our dependency
        // failing, not the caller's token being bad.
        throw error
      }
    },
    async getProfile(privyUserId) {
      const user = await privy.users()._get(privyUserId)
      return { email: emailOf(user) }
    },
  }
}

/**
 * The configured AuthClient, or null when Privy credentials are absent. Null is
 * not a permissive mode: requireAuth rejects every request when it gets null.
 * The API fails CLOSED.
 */
export function createAuthClientFromEnv(env: Env): AuthClient | null {
  if (!env.PRIVY_APP_ID || !env.PRIVY_APP_SECRET) return null
  return withProfileCache(
    createPrivyAuthClient({
      appId: env.PRIVY_APP_ID,
      appSecret: env.PRIVY_APP_SECRET,
      verificationKey: env.PRIVY_VERIFICATION_KEY,
    }),
  )
}
