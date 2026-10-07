import { oc } from '@orpc/contract'
import { z } from 'zod'
import {
  lessonContentSchema,
  lessonSlugInputSchema,
  lessonsListInputSchema,
} from '../curriculum/lessons'

/**
 * Procedures served WITHOUT authentication (apps/api mounts them at
 * /public-rpc, a separate handler, on purpose). Only reference data belongs
 * here, never anything about a user. Anything user-specific goes in
 * `contract` (rpc/contract.ts), which is authenticated by structure.
 */
export const publicContract = {
  lessons: {
    /** Every lesson for an instrument, ordered by sortOrder, with its items and diagrams. */
    list: oc.input(lessonsListInputSchema).output(z.array(lessonContentSchema)),
    /** One lesson by its stable slug. NOT_FOUND for an unknown slug. */
    get: oc.input(lessonSlugInputSchema).output(lessonContentSchema),
  },
}

export type PublicContract = typeof publicContract
