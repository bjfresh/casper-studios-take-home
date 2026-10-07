import type { z } from 'zod'
import type { ValidationIssue } from './api-envelope'

/**
 * Converts Zod issues into the application's own issue shape. Call this at the
 * boundary so `ZodError` never leaks into UI code or API responses.
 */
export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }))
}

/** One-line summary for logs: `email: Invalid email; name: Too small`. */
export function formatValidationIssues(issues: readonly ValidationIssue[]): string {
  return issues.map(({ path, message }) => (path ? `${path}: ${message}` : message)).join('; ')
}
