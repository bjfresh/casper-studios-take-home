import { StandardRPCJsonSerializer, StandardRPCSerializer } from '@orpc/client/standard'
import { ORPCError, ValidationError } from '@orpc/server'
import type { ApiErrorCode, RpcErrorData } from '@repo/shared'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError, STATUS_BY_CODE } from '../utils/app-error'

export type RpcError = ORPCError<ApiErrorCode, RpcErrorData>

function rpcError(
  code: ApiErrorCode,
  message: string,
  data: RpcErrorData,
  cause?: unknown,
): RpcError {
  return new ORPCError(code, { status: STATUS_BY_CODE[code], message, data, cause })
}

/**
 * Every RPC failure leaves the server as an ORPCError whose `code` is one of
 * OUR ApiErrorCodes and whose `data` matches rpcErrorDataSchema. Clients get one
 * vocabulary whether the failure came from the auth gate, input validation or
 * a service — the same one the REST envelope uses.
 */
export function toRpcError(error: unknown, requestId: string | undefined): RpcError {
  if (error instanceof AppError) {
    return rpcError(error.code, error.message, {
      issues: error.issues,
      reason: error.reason,
      requestId,
    })
  }

  // oRPC validates input against the contract before the handler runs and
  // reports it as BAD_REQUEST with a ValidationError cause.
  if (
    error instanceof ORPCError &&
    error.code === 'BAD_REQUEST' &&
    error.cause instanceof ValidationError
  ) {
    const issues = error.cause.issues.map((issue) => ({
      path: (issue.path ?? [])
        .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
        .join('.'),
      message: issue.message,
    }))
    return rpcError('VALIDATION_FAILED', 'Invalid request input', { issues, requestId })
  }

  // Anything else — including an OUTPUT validation failure, which means the
  // server broke its own contract — is a 500. Log the detail; return none.
  console.error(`[${requestId}] Unhandled RPC error`, error)
  return rpcError('INTERNAL', 'Internal server error', { requestId }, error)
}

const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer())

/**
 * For failures that happen in Hono before oRPC runs (the requireAuth gate).
 * They must be encoded in oRPC's wire format: the oRPC client discards any
 * other error body, so the client would lose the code and reason.
 */
export function rpcErrorResponse(c: Context, error: RpcError): Response {
  return c.json(serializer.serialize(error.toJSON()), error.status as ContentfulStatusCode)
}
