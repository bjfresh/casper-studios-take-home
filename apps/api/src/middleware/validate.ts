import { toValidationIssues } from '@repo/shared'
import type { ValidationTargets } from 'hono'
import { validator } from 'hono/validator'
import type { z } from 'zod'
import { AppError } from '../utils/app-error'

/**
 * Validates one request part against a schema and exposes the parsed value via
 * `c.req.valid(target)`. Failures become a VALIDATION_FAILED AppError with
 * field-level issues, so `ZodError` never reaches the response.
 *
 * Validate once here; handlers and services trust the inferred type.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return validator(target, async (value): Promise<z.output<Schema>> => {
    const result = await schema.safeParseAsync(value)
    if (!result.success) {
      throw new AppError('VALIDATION_FAILED', `Invalid request ${target}`, {
        issues: toValidationIssues(result.error),
      })
    }
    return result.data
  })
}
