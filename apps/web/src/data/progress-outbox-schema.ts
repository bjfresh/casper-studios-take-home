import { finishLessonInputSchema, recordItemInputSchema } from '@repo/shared'
import { z } from 'zod'

const base = {
  /** Unique per play, so a synced play is removed exactly once. */
  id: z.string().min(1),
  /** The account it was played under: never synced into anyone else's. */
  userId: z.string().min(1),
  /** When it was played (epoch ms). */
  at: z.number().int().nonnegative(),
  /** For showing the play on the lesson grid before it syncs. */
  groupSlug: z.string().min(1),
}

/**
 * One play by a signed-in player, stored on this device until the API has it.
 * The `input` is exactly what the API procedure takes, so syncing sends it
 * unchanged.
 */
export const progressOutboxEventSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('item'), input: recordItemInputSchema }),
  z.object({ ...base, type: z.literal('finish'), input: finishLessonInputSchema }),
])

export const progressOutboxSchema = z.array(progressOutboxEventSchema)

export type ProgressOutboxEvent = z.infer<typeof progressOutboxEventSchema>
export type ProgressOutbox = z.infer<typeof progressOutboxSchema>
