import type { AuthenticatedUser } from '@repo/shared'
import type { Context, MiddlewareHandler } from 'hono'
import type { AuthClient } from '../auth/auth-client'
import { authenticate } from '../auth/authenticate'
import type { AppEnv } from '../context/app-env'
import { upsertUserFromIdentity } from '../services/user-service'
import { AppError } from '../utils/app-error'

const FAILURE_MESSAGES = {
  missing_token: 'Sign in required',
  invalid_token: 'Invalid access token',
  // Distinct from "invalid": this one tells the user what to do.
  expired_token: 'Your session has expired. Sign in again.',
} as const

async function resolveUser(privyUserId: string, email: string | null): Promise<AuthenticatedUser> {
  try {
    return await upsertUserFromIdentity({ privyUserId, email })
  } catch (cause) {
    throw new AppError('DEPENDENCY_UNAVAILABLE', 'User store unavailable', { cause })
  }
}

/**
 * Rejects with a typed 401 before the handler runs. Mount it on a route GROUP
 * (`app.use('/rpc/*', requireAuth(...))`), not per handler, so protection is
 * structural: a route added to the group is protected without anyone
 * remembering to.
 *
 * The local user upsert happens HERE, on every authenticated request, rather
 * than lazily at the first operation that needs a row. Lazy creation leaves
 * users who sign in but never trigger that operation with no row, so anything
 * that joins from users, counts sign-ups or emails users silently misses them.
 * The cost is one indexed upsert per authenticated request.
 *
 * With no AuthClient (Privy not configured) it rejects everything with 503:
 * fail closed, and "the server isn't set up" rather than "sign in", since
 * signing in can't fix it.
 */
export function requireAuth(client: AuthClient | null): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const result = await authenticate(client, c.req.header('authorization'))

    if (result.status === 'failed') {
      if (result.reason === 'not_configured') {
        throw new AppError('DEPENDENCY_UNAVAILABLE', 'Authentication is not configured', {
          reason: result.reason,
        })
      }
      throw new AppError('UNAUTHENTICATED', FAILURE_MESSAGES[result.reason], {
        reason: result.reason,
      })
    }

    c.set('authUser', await resolveUser(result.privyUserId, result.email))
    await next()
  }
}

/**
 * Populates the user when a valid token is present; never rejects. For
 * endpoints that vary by auth state but stay publicly reachable.
 */
export function optionalAuth(client: AuthClient | null): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const result = await authenticate(client, c.req.header('authorization'))
    if (result.status === 'authenticated') {
      c.set('authUser', await resolveUser(result.privyUserId, result.email))
    }
    await next()
  }
}

/**
 * The signed-in user inside a requireAuth route. Throws if requireAuth didn't
 * run: that's a programming error (the route was mounted outside a protected
 * group), and it must fail loudly rather than hand a handler `undefined`.
 */
export function getAuthUser(c: Context<AppEnv>): AuthenticatedUser {
  const user = c.get('authUser')
  if (!user) {
    throw new Error(
      `getAuthUser() called on ${c.req.method} ${c.req.path}, which is not behind requireAuth. ` +
        'Mount the route in a protected group, or use getOptionalAuthUser() with optionalAuth.',
    )
  }
  return user
}

/** For optionalAuth routes: the user, or undefined for anonymous callers. */
export function getOptionalAuthUser(c: Context<AppEnv>): AuthenticatedUser | undefined {
  return c.get('authUser')
}
