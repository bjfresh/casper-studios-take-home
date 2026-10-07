import type { ApiError, ApiFailure, ApiSuccess } from '@repo/shared'

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data }
}

export function fail(error: ApiError): ApiFailure {
  return { ok: false, error }
}
