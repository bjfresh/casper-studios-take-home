import type { ApiErrorCode, AuthFailureReason, ValidationIssue } from '@repo/shared'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** The one place error codes map to HTTP status. */
export const STATUS_BY_CODE = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  // Unavailable is not missing: tell the caller to retry, not that they mistyped.
  DEPENDENCY_UNAVAILABLE: 503,
} as const satisfies Record<ApiErrorCode, ContentfulStatusCode>

/**
 * An expected failure. Services throw it; the error-handler middleware turns it
 * into the envelope and status. Anything that isn't an AppError becomes a 500.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly issues: ValidationIssue[] | undefined
  readonly reason: AuthFailureReason | undefined

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { issues?: ValidationIssue[]; reason?: AuthFailureReason; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.issues = options.issues
    this.reason = options.reason
  }

  get status(): ContentfulStatusCode {
    return STATUS_BY_CODE[this.code]
  }
}
