import { oc } from '@orpc/contract'
import { z } from 'zod'
import {
  chordGroupProgressSchema,
  curriculumGroupSchema,
  curriculumListInputSchema,
  recordPracticeInputSchema,
  reviewCandidateSchema,
} from '../curriculum/curriculum'
import {
  finishLessonInputSchema,
  lessonProgressSchema,
  lessonsListInputSchema,
  recordItemInputSchema,
} from '../curriculum/lessons'
import { guestProgressSchema, importGuestProgressResultSchema } from '../curriculum/progress-rules'
import {
  accountSchema,
  playerSettingsInputSchema,
  playerSettingsSchema,
  playerSettingsUpdateSchema,
} from '../settings/settings'

/**
 * The oRPC contract: the single definition of every RPC procedure's input and
 * output. The API implements it and the web client is typed (and its
 * responses validated) from it. Living here, not in apps/api, is what lets the
 * web app get end-to-end types without importing the API.
 *
 * Every procedure is served behind `requireAuth` (apps/api/src/rpc). A public
 * procedure needs a separate, deliberately unauthenticated handler — not a
 * flag here.
 */
export const contract = {
  account: {
    /** The signed-in user and their saved settings (null until saved). */
    me: oc.output(accountSchema),
  },
  settings: {
    /**
     * Saves complete settings, creating the row if needed. How front-loaded
     * onboarding (held in localStorage) reaches the database after sign-up.
     */
    save: oc.input(playerSettingsInputSchema).output(playerSettingsSchema),
    /** Saves part of existing settings (Settings auto-saves one field at a time). */
    update: oc.input(playerSettingsUpdateSchema).output(playerSettingsSchema),
  },
  curriculum: {
    /** Every group in curriculum order, with its chords/shapes and the caller's progress. */
    list: oc.input(curriculumListInputSchema).output(z.array(curriculumGroupSchema)),
    /** Records one practice session of a group (and, optionally, of specific chords in it). */
    recordPractice: oc.input(recordPracticeInputSchema).output(chordGroupProgressSchema),
    /** Completed groups due for review, most overdue first. */
    reviewCandidates: oc.input(curriculumListInputSchema).output(z.array(reviewCandidateSchema)),
  },
  lessons: {
    /** The caller's progress on every lesson for an instrument (lessons never played are omitted). */
    progress: oc.input(lessonsListInputSchema).output(z.array(lessonProgressSchema)),
    /** One Got it / Skip on one item of a lesson. */
    recordItem: oc.input(recordItemInputSchema).output(z.object({ ok: z.literal(true) })),
    /** The end of a lesson session. Returns the lesson's updated progress. */
    finish: oc.input(finishLessonInputSchema).output(lessonProgressSchema),
    /** Merges progress made as a guest (localStorage) into the account, once, after sign-up. */
    importGuestProgress: oc.input(guestProgressSchema).output(importGuestProgressResultSchema),
  },
}

export type Contract = typeof contract
