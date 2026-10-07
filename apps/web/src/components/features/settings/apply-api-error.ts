import type { PlayerProfile } from '@repo/shared'
import type { UseFormSetError } from 'react-hook-form'
import { toApiError } from '@/services/api-errors'

const FIELDS = new Set<string>(['displayName', 'instrument', 'handedness'])

function isField(path: string): path is keyof PlayerProfile {
  return FIELDS.has(path)
}

/** Puts a failed save's field issues on their fields, and anything else on the form. */
export function applyApiError(error: unknown, setError: UseFormSetError<PlayerProfile>) {
  const apiError = toApiError(error)
  const fieldIssues = (apiError.issues ?? []).filter((issue) => isField(issue.path))
  for (const issue of fieldIssues) {
    if (isField(issue.path)) setError(issue.path, { message: issue.message })
  }
  if (fieldIssues.length === 0) {
    setError('root.server', { message: apiError.message })
  }
}
