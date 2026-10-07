/**
 * The seam between the API and the identity vendor. Everything outside
 * privy-auth-client.ts depends on this interface, so tests inject a fake and
 * the suite runs without real credentials.
 */
export type TokenVerification =
  | { ok: true; privyUserId: string }
  | { ok: false; reason: 'invalid_token' | 'expired_token' }

export type IdentityProfile = {
  email: string | null
}

export type AuthClient = {
  /**
   * Cryptographic verification of an access token. Never trust a claim from a
   * token that hasn't been through this. Throws only when verification itself
   * couldn't run (e.g. the key couldn't be fetched); that's a 503, not a 401.
   */
  verifyToken: (token: string) => Promise<TokenVerification>
  /** Hits the vendor API. Wrap in `withProfileCache`. */
  getProfile: (privyUserId: string) => Promise<IdentityProfile>
}

/**
 * Memoizes profile lookups per user. Token verification is local, but a profile
 * lookup is a network call, and it would otherwise run on every authenticated
 * request. Only successes are cached, so a transient failure isn't stuck for a
 * minute.
 */
export function withProfileCache(
  client: AuthClient,
  { ttlMs = 60_000, maxEntries = 1_000, now = Date.now } = {},
): AuthClient {
  const cache = new Map<string, { profile: IdentityProfile; expiresAt: number }>()

  return {
    verifyToken: (token) => client.verifyToken(token),
    async getProfile(privyUserId) {
      const hit = cache.get(privyUserId)
      if (hit && hit.expiresAt > now()) return hit.profile

      const profile = await client.getProfile(privyUserId)
      cache.delete(privyUserId)
      // Bounded: Map preserves insertion order, so the first key is the oldest.
      if (cache.size >= maxEntries) {
        const oldest = cache.keys().next()
        if (!oldest.done) cache.delete(oldest.value)
      }
      cache.set(privyUserId, { profile, expiresAt: now() + ttlMs })
      return profile
    },
  }
}
