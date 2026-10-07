import { ORPCError } from '@orpc/client'
import { API_ERROR_CODES, type ApiError, type ApiErrorCode, rpcErrorDataSchema } from '@repo/shared'

const KNOWN_CODES = new Set<string>(Object.values(API_ERROR_CODES))

function isApiErrorCode(code: string): code is ApiErrorCode {
  return KNOWN_CODES.has(code)
}

/**
 * Normalizes anything an RPC call can throw into the app's ApiError, so UI
 * code branches on one vocabulary. The `data` payload is validated, never
 * trusted; a failure we can't interpret becomes INTERNAL with a neutral
 * message rather than leaking whatever came back.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ORPCError) {
    const data = rpcErrorDataSchema.safeParse(error.data)
    const code =
      typeof error.code === 'string' && isApiErrorCode(error.code) ? error.code : 'INTERNAL'
    return {
      code,
      message: code === 'INTERNAL' ? 'Something went wrong' : error.message,
      ...(data.success ? data.data : {}),
    }
  }
  // fetch() rejects (TypeError) when the server is unreachable.
  if (error instanceof TypeError) {
    return { code: 'DEPENDENCY_UNAVAILABLE', message: 'Could not reach the server' }
  }
  return { code: 'INTERNAL', message: 'Something went wrong' }
}

/** Codes where retrying the same request can't help. */
const NON_RETRYABLE: ReadonlySet<ApiErrorCode> = new Set([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
])

export function isRetryable(error: unknown): boolean {
  return !NON_RETRYABLE.has(toApiError(error).code)
}
