// Build error if a client component imports this, so a secret can't reach the
// browser bundle by accident.
import 'server-only'
import { z } from 'zod'

/** Server-only values. Add secrets here, never to ./public.ts. */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // How the Next SERVER reaches the API. Usually the same as
  // NEXT_PUBLIC_API_URL; differs in Docker, where the browser uses
  // localhost:3001 but the web container must use http://api:3001.
  API_INTERNAL_URL: z
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

// `parse`, not `safeParse`: a bad environment should crash the server at boot.
export const serverEnv = serverEnvSchema.parse(process.env)
