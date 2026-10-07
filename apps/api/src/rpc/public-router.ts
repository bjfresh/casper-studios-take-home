import { implement } from '@orpc/server'
import { publicContract } from '@repo/shared'
import { getLesson, listLessons } from '../services/lesson-service'

export type PublicRpcContext = { requestId: string }

/**
 * Procedures served WITHOUT authentication. Only reference data: this builder
 * has no user in its context, so a handler here can't reach user data even by
 * mistake.
 */
const pub = implement(publicContract).$context<PublicRpcContext>()

export const publicRouter = pub.router({
  lessons: {
    list: pub.lessons.list.handler(({ input }) => listLessons(input.instrument)),
    get: pub.lessons.get.handler(({ input }) => getLesson(input.slug)),
  },
})

export type PublicRouter = typeof publicRouter
