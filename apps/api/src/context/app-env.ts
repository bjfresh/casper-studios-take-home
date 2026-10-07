import type { AuthenticatedUser } from '@repo/shared'
import type { RequestIdVariables } from 'hono/request-id'

/** Typed Hono context. Routes read these via `c.get(...)`; services never see the context. */
export type AppEnv = {
  Variables: RequestIdVariables & {
    /**
     * The local user. Set by requireAuth (always) or optionalAuth (when a valid
     * token was sent). Read it with getAuthUser(c) / getOptionalAuthUser(c).
     */
    authUser?: AuthenticatedUser
  }
}
