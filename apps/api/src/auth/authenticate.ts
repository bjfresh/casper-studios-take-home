import type { AuthFailureReason } from '@repo/shared'
import type { AuthClient } from './auth-client'

export type AuthResult =
  | { status: 'authenticated'; privyUserId: string; email: string | null }
  | { status: 'failed'; reason: AuthFailureReason }

/**
 * `Authorization: Bearer <token>` → the token, or null for anything else.
 * Never throws: a garbage header is a 401, not a 500.
 */
export function extractBearerToken(header: string | undefined | null): string | null {
  if (!header) return null
  const match = /^Bearer[ ]+([A-Za-z0-9\-._~+/]+=*)$/i.exec(header.trim())
  return match?.[1] ?? null
}

/**
 * Turns an Authorization header into a verified identity. Authentication
 * only: whether this caller may touch a given resource is decided separately,
 * server-side, in the service that owns it.
 */
export async function authenticate(
  client: AuthClient | null,
  authorizationHeader: string | undefined,
): Promise<AuthResult> {
  // Fail closed: no credentials on the server means nobody is authenticated.
  if (!client) return { status: 'failed', reason: 'not_configured' }
  if (!authorizationHeader) return { status: 'failed', reason: 'missing_token' }

  const token = extractBearerToken(authorizationHeader)
  if (!token) return { status: 'failed', reason: 'invalid_token' }

  const verification = await client.verifyToken(token)
  if (!verification.ok) return { status: 'failed', reason: verification.reason }

  const { privyUserId } = verification
  try {
    const { email } = await client.getProfile(privyUserId)
    return { status: 'authenticated', privyUserId, email }
  } catch (error) {
    // The token is valid; a slow or failing profile endpoint isn't the
    // caller's fault. Degrade to a minimal identity instead of rejecting.
    // Logging the verified subject is fine — never the token.
    console.warn(`[auth] profile lookup failed for ${privyUserId}; continuing without it`, error)
    return { status: 'authenticated', privyUserId, email: null }
  }
}
