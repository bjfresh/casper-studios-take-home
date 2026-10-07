import type { AuthClient, IdentityProfile } from '../auth/auth-client'

/**
 * Token grammar for tests: `valid-<name>` (→ did:privy:<name>), `expired`, or
 * anything else (invalid). Shaped like real bearer tokens — no `:` — so they
 * pass header parsing the same way a JWT does. Profiles come from `profiles`; a user without one makes the
 * profile lookup fail, which exercises the degrade path.
 */
export function createFakeAuthClient(
  profiles: Record<string, IdentityProfile> = {},
): AuthClient & { profileCalls: string[] } {
  const profileCalls: string[] = []
  return {
    profileCalls,
    async verifyToken(token) {
      if (token.startsWith('valid-')) {
        return { ok: true, privyUserId: `did:privy:${token.slice('valid-'.length)}` }
      }
      if (token === 'expired') return { ok: false, reason: 'expired_token' }
      return { ok: false, reason: 'invalid_token' }
    },
    async getProfile(privyUserId) {
      profileCalls.push(privyUserId)
      const profile = profiles[privyUserId]
      if (!profile) throw new Error(`profile service unavailable for ${privyUserId}`)
      return profile
    },
  }
}
