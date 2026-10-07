import type { ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../context/app-env'
import { AppError } from '../utils/app-error'
import { fail } from '../utils/response'

export const errorHandler: ErrorHandler<AppEnv> = (error, c) => {
  const requestId = c.get('requestId')

  if (error instanceof AppError) {
    return c.json(
      fail({
        code: error.code,
        message: error.message,
        issues: error.issues,
        reason: error.reason,
        requestId,
      }),
      error.status,
    )
  }

  // Hono's own middleware (e.g. bodyLimit) throws HTTPException; keep its
  // status but still answer in the envelope.
  if (error instanceof HTTPException && error.status < 500) {
    return c.json(
      fail({ code: 'VALIDATION_FAILED', message: error.message, requestId }),
      error.status,
    )
  }

  // Unexpected: log the detail, return nothing internal to the caller.
  console.error(`[${requestId}] Unhandled error`, error)
  return c.json(fail({ code: 'INTERNAL', message: 'Internal server error', requestId }), 500)
}

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(
    fail({ code: 'NOT_FOUND', message: 'Route not found', requestId: c.get('requestId') }),
    404,
  )
