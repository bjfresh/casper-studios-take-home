import {
  type ApiResponse,
  apiResponseSchema,
  formatValidationIssues,
  toValidationIssues,
} from '@repo/shared'
import type { z } from 'zod'
import { publicEnv } from '@/env/public'

/**
 * Calls the API and validates the response envelope AND its data. Our own API
 * is still a boundary: client and server deploy separately and can skew.
 * Never throws — failures come back as `{ ok: false, error }`.
 */
export async function apiRequest<Schema extends z.ZodType>(
  path: string,
  dataSchema: Schema,
  init?: RequestInit,
): Promise<ApiResponse<z.output<Schema>>> {
  let response: Response
  try {
    response = await fetch(new URL(path, publicEnv.NEXT_PUBLIC_API_URL), {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
      credentials: 'include',
    })
  } catch {
    return {
      ok: false,
      error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Could not reach the server' },
    }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }

  const result = apiResponseSchema(dataSchema).safeParse(body)
  if (!result.success) {
    console.error(
      `[api] Unexpected response from ${path} (${response.status}):`,
      formatValidationIssues(toValidationIssues(result.error)),
    )
    return { ok: false, error: { code: 'INTERNAL', message: 'Unexpected response from server' } }
  }
  return result.data as ApiResponse<z.output<Schema>>
}
