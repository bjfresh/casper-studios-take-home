import { z } from 'zod'

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined))

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // API_PORT is the name in the root .env (shared with web's WEB_PORT); PORT is
  // what container platforms inject. Either works.
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  // Optional so a fresh clone boots without a Privy project. Absent means auth
  // is NOT configured, and every protected route fails closed (503) — see
  // createAuthClientFromEnv. Empty strings from .env count as absent.
  PRIVY_APP_ID: optionalString,
  PRIVY_APP_SECRET: optionalString,
  // Optional: the app's verification key (Privy dashboard). With it, token
  // verification never touches the network; without it, the SDK fetches the
  // app's JWKS once and caches it.
  PRIVY_VERIFICATION_KEY: optionalString,
})

export type Env = z.infer<typeof envSchema>

/**
 * Parsed at startup with `parse`: a bad environment is a deploy error and the
 * process should crash immediately, not serve requests half-configured.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source)
}
