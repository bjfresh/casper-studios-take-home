import { implement } from '@orpc/server'
import { type AuthenticatedUser, contract } from '@repo/shared'
import { getAccount } from '../services/account-service'
import {
  getReviewCandidates,
  listCurriculum,
  recordGroupPractice,
} from '../services/curriculum-service'
import {
  finishLesson,
  getLessonProgress,
  importGuestProgress,
  recordItemResult,
} from '../services/lesson-service'
import { saveSettings, updateSettings } from '../services/settings-service'

export type RpcContext = {
  /** Always present: the whole RPC handler is mounted behind requireAuth. */
  user: AuthenticatedUser
  requestId: string
}

/**
 * The only procedure builder. Procedures are the RPC equivalent of routes/:
 * thin — pull from context and input, call a service, return. Authorization
 * (may this user touch this resource?) belongs in the service, every time;
 * a valid token only says who the caller is.
 */
const rpc = implement(contract).$context<RpcContext>()

export const router = rpc.router({
  account: {
    me: rpc.account.me.handler(({ context }) => getAccount(context.user.id)),
  },
  settings: {
    save: rpc.settings.save.handler(({ context, input }) => saveSettings(context.user.id, input)),
    update: rpc.settings.update.handler(({ context, input }) =>
      updateSettings(context.user.id, input),
    ),
  },
  curriculum: {
    list: rpc.curriculum.list.handler(({ context, input }) =>
      listCurriculum(context.user.id, input.instrument),
    ),
    recordPractice: rpc.curriculum.recordPractice.handler(({ context, input }) =>
      recordGroupPractice(context.user.id, input),
    ),
    reviewCandidates: rpc.curriculum.reviewCandidates.handler(({ context, input }) =>
      getReviewCandidates(context.user.id, { instrument: input.instrument }),
    ),
  },
  lessons: {
    progress: rpc.lessons.progress.handler(({ context, input }) =>
      getLessonProgress(context.user.id, input.instrument),
    ),
    recordItem: rpc.lessons.recordItem.handler(async ({ context, input }) => {
      await recordItemResult(context.user.id, input)
      return { ok: true as const }
    }),
    finish: rpc.lessons.finish.handler(({ context, input }) =>
      finishLesson(context.user.id, input.groupId),
    ),
    importGuestProgress: rpc.lessons.importGuestProgress.handler(({ context, input }) =>
      importGuestProgress(context.user.id, input),
    ),
  },
})

export type Router = typeof router
