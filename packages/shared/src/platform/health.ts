import { z } from 'zod'

export const healthStatusSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: z.record(z.string(), z.enum(['up', 'down'])),
})

export type HealthStatus = z.infer<typeof healthStatusSchema>
