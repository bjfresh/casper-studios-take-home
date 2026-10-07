import { z } from 'zod'
import type { Prettify } from '../platform/type-utilities'

/**
 * Platform-wide role. Deliberately separate from any per-resource role
 * (membership of an organization, say): conflating them makes it impossible to
 * be an admin of one thing and not another. Mirrors the `user_role` Postgres
 * enum in @repo/db; apps/api has a type test that keeps the two in step.
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

/**
 * Why a request is unauthenticated. Carried on UNAUTHENTICATED errors so the
 * client can act on it: "expired" means sign in again, which is actionable;
 * "invalid" is not.
 */
export const AUTH_FAILURE_REASONS = {
  MISSING_TOKEN: 'missing_token',
  INVALID_TOKEN: 'invalid_token',
  EXPIRED_TOKEN: 'expired_token',
  // The server has no auth credentials. It fails closed (503) rather than
  // letting anyone through.
  NOT_CONFIGURED: 'not_configured',
} as const

export type AuthFailureReason = (typeof AUTH_FAILURE_REASONS)[keyof typeof AUTH_FAILURE_REASONS]

/**
 * Who is signed in, as the API sees it: the LOCAL user record. `id` is our own
 * uuid; the Privy DID never appears here, so nothing past the auth layer can
 * come to depend on the vendor identity.
 */
export const authenticatedUserSchema = z.object({
  id: z.uuid(),
  // Not z.email(): this is a cached copy from the identity provider, and Apple
  // private-relay addresses are forwarding identifiers. A strict format check
  // must never be what fails a signed-in user's request.
  email: z.string().min(1).nullable(),
  role: z.enum(USER_ROLES),
})

export type AuthenticatedUser = Prettify<z.infer<typeof authenticatedUserSchema>>
