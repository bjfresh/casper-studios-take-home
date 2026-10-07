import { z } from 'zod'
import { AUTH_FAILURE_REASONS } from '../auth/auth'
import type { Prettify } from './type-utilities'

/**
 * Error codes the API may return. A const object plus derived union rather than
 * a TS enum (see biome.json `noEnum`). HTTP status mapping lives in the API —
 * clients branch on `code`, never on status.
 */
export const API_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  // A dependency (database, third party) is down: 503, not 404.
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

export const validationIssueSchema = z.object({
  // Dotted field path ('' for the root), so a form can map it straight onto
  // a field name with setError.
  path: z.string(),
  message: z.string(),
})

export type ValidationIssue = z.infer<typeof validationIssueSchema>

export const apiErrorSchema = z.object({
  code: z.enum(API_ERROR_CODES),
  message: z.string(),
  issues: z.array(validationIssueSchema).optional(),
  /** Set on UNAUTHENTICATED (and on the 503 when auth isn't configured). */
  reason: z.enum(AUTH_FAILURE_REASONS).optional(),
  requestId: z.string().optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

export const apiFailureSchema = z.object({ ok: z.literal(false), error: apiErrorSchema })

export type ApiFailure = z.infer<typeof apiFailureSchema>

/** `{ ok: true, data } | { ok: false, error }` — the only response shape the API returns. */
export function apiResponseSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion('ok', [z.object({ ok: z.literal(true), data }), apiFailureSchema])
}

export type ApiSuccess<T> = { ok: true; data: T }

export type ApiResponse<T> = Prettify<ApiSuccess<T>> | ApiFailure

/**
 * oRPC carries `code` and `message` itself; everything else in ApiError rides
 * in the error's `data`. Same vocabulary as the REST envelope, so the client
 * normalizes both into one ApiError.
 */
export const rpcErrorDataSchema = apiErrorSchema.omit({ code: true, message: true }).partial()

export type RpcErrorData = z.infer<typeof rpcErrorDataSchema>
