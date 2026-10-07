import { pingDb } from '@repo/db'
import type { HealthStatus } from '../contracts/health'
import { AppError } from '../utils/app-error'

/** Readiness: every dependency the API needs to serve traffic must answer. */
export async function checkReadiness(): Promise<HealthStatus> {
  try {
    await pingDb()
  } catch (cause) {
    throw new AppError('DEPENDENCY_UNAVAILABLE', 'Database unavailable', { cause })
  }
  return { status: 'ok', checks: { database: 'up' } }
}
