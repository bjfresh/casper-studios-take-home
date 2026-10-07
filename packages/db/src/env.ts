import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
})

/**
 * Validated on first call rather than at import, so importing `@repo/db/schema`
 * or a query helper (e.g. during typecheck or in a unit test) doesn't demand a
 * database. Callers that need it fail loudly via `parse`: a missing URL is a
 * setup error, not something to handle.
 */
export function getDatabaseUrl(): string {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    throw new Error(
      'DATABASE_URL is missing or invalid. Copy .env.example to .env and run scripts ' +
        'from the repo root (they load .env via dotenv-cli).',
      { cause: result.error },
    )
  }
  return result.data.DATABASE_URL
}
