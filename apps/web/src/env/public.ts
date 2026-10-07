import { z } from 'zod'

/** Client-visible values. Anything here ships in the browser bundle — no secrets. */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  // Optional so a fresh clone boots before anyone creates a Privy project. An
  // empty value from .env counts as absent. See providers/AuthProvider.tsx.
  NEXT_PUBLIC_PRIVY_APP_ID: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
})

// Next inlines NEXT_PUBLIC_* by literal text substitution at build time, so each
// variable must be referenced by its full name. Passing `process.env` itself, or
// reading `process.env[name]`, yields undefined in the browser.
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
})
