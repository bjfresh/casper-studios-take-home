import { createORPCClient, isDefinedError, ORPCError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { rpcErrorDataSchema } from '@repo/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app'
import type { AuthClient } from '../../auth/auth-client'
import { createFakeAuthClient } from '../../test/fake-auth-client'
import type { PublicRouter } from '../public-router'
import type { Router } from '../router'

// The user row is covered by the integration test; here it's a stub so these
// tests exercise the HTTP/RPC/auth wiring without a database.
const upsertUserFromIdentity = vi.hoisted(() => vi.fn())
vi.mock('../../services/user-service', () => ({ upsertUserFromIdentity }))
const getAccount = vi.hoisted(() => vi.fn())
vi.mock('../../services/account-service', () => ({ getAccount }))
const settingsService = vi.hoisted(() => ({ saveSettings: vi.fn(), updateSettings: vi.fn() }))
vi.mock('../../services/settings-service', () => settingsService)
const curriculumService = vi.hoisted(() => ({
  listCurriculum: vi.fn(),
  recordGroupPractice: vi.fn(),
  getReviewCandidates: vi.fn(),
}))
vi.mock('../../services/curriculum-service', () => curriculumService)

const USER = {
  id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e',
  email: 'alice@example.com',
  role: 'user',
}
const ACCOUNT = { ...USER, settings: null }
const SETTINGS = { displayName: 'Jaco', instrument: 'bass', handedness: 'right' } as const
const SAVED_SETTINGS = {
  ...SETTINGS,
  guitarType: null,
  bassStringCount: 4,
  tuning: ['E', 'A', 'D', 'G'],
  showNoteNames: true,
  showFingerNumbers: false,
  showIntervals: false,
  autoProgressSeconds: 0,
} as const

/** A real oRPC client talking to the in-memory app — the same path the browser uses. */
function clientFor(authClient: AuthClient | null, authorization?: string) {
  const app = createApp({ webOrigin: 'http://localhost:3000', authClient })
  const link = new RPCLink({
    url: 'http://api.test/rpc',
    headers: authorization ? { authorization } : {},
    fetch: async (request) => app.fetch(request),
  })
  return createORPCClient<RouterClient<Router>>(link)
}

async function errorOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => {
      throw new Error('expected the call to fail')
    },
    (e: unknown) => e,
  )
  if (!(error instanceof ORPCError)) throw error
  return { code: error.code, status: error.status, data: rpcErrorDataSchema.parse(error.data) }
}

const fake = createFakeAuthClient({ 'did:privy:alice': { email: 'alice@example.com' } })

beforeEach(() => {
  upsertUserFromIdentity.mockResolvedValue(USER)
  getAccount.mockResolvedValue(ACCOUNT)
})
afterEach(() => {
  vi.restoreAllMocks()
  upsertUserFromIdentity.mockReset()
  getAccount.mockReset()
  settingsService.saveSettings.mockReset()
  settingsService.updateSettings.mockReset()
  for (const fn of Object.values(curriculumService)) fn.mockReset()
})

describe('account.me over oRPC', () => {
  it('returns the local account for a valid token, keyed by the DID', async () => {
    expect(await clientFor(fake, 'Bearer valid-alice').account.me()).toEqual(ACCOUNT)
    expect(getAccount).toHaveBeenCalledWith(USER.id)
    expect(upsertUserFromIdentity).toHaveBeenCalledWith({
      privyUserId: 'did:privy:alice',
      email: 'alice@example.com',
    })
  })

  it('signed out → 401 UNAUTHENTICATED, missing_token', async () => {
    const error = await errorOf(clientFor(fake).account.me())
    expect(error).toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
      data: { reason: 'missing_token' },
    })
    expect(error.data.requestId).toEqual(expect.any(String))
    expect(upsertUserFromIdentity).not.toHaveBeenCalled()
  })

  it.each(['Basic abc', 'Bearer', 'Bearer a b', 'garbage'])(
    'malformed header %j → 401, never 500',
    async (header) => {
      const error = await errorOf(clientFor(fake, header).account.me())
      expect(error).toMatchObject({ status: 401, data: { reason: 'invalid_token' } })
    },
  )

  it('invalid token → 401 invalid_token', async () => {
    const error = await errorOf(clientFor(fake, 'Bearer forged').account.me())
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED', data: { reason: 'invalid_token' } })
  })

  it('expired token → 401 expired_token, with an actionable message', async () => {
    const promise = clientFor(fake, 'Bearer expired').account.me()
    const error = await errorOf(promise)
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED', data: { reason: 'expired_token' } })
    await expect(clientFor(fake, 'Bearer expired').account.me()).rejects.toThrow(/expired/)
  })

  it('auth not configured → fails closed with 503, even with a token', async () => {
    const error = await errorOf(clientFor(null, 'Bearer valid-alice').account.me())
    expect(error).toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
      status: 503,
      data: { reason: 'not_configured' },
    })
    expect(upsertUserFromIdentity).not.toHaveBeenCalled()
  })

  it('profile lookup failure with a valid token degrades instead of rejecting', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await clientFor(fake, 'Bearer valid-nobody').account.me()).toEqual(ACCOUNT)
    expect(upsertUserFromIdentity).toHaveBeenCalledWith({
      privyUserId: 'did:privy:nobody',
      email: null,
    })
  })

  it('user store down → 503, not 401 or 500', async () => {
    upsertUserFromIdentity.mockRejectedValue(new Error('ECONNREFUSED'))
    const error = await errorOf(clientFor(fake, 'Bearer valid-alice').account.me())
    expect(error).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', status: 503 })
  })

  it('a server that breaks its own output contract is a 500, not bad data', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    getAccount.mockResolvedValue({ ...ACCOUNT, id: 'not-a-uuid' })
    const error = await errorOf(clientFor(fake, 'Bearer valid-alice').account.me())
    expect(error).toMatchObject({ code: 'INTERNAL', status: 500 })
  })

  it('errors are not "defined" oRPC errors — clients branch on our codes', async () => {
    const error = await clientFor(fake)
      .account.me()
      .catch((e: unknown) => e)
    expect(isDefinedError(error)).toBe(false)
  })
})

describe('settings procedures', () => {
  const client = () => clientFor(fake, 'Bearer valid-alice')

  it('save writes the CALLER’s settings; no input can name another user', async () => {
    settingsService.saveSettings.mockResolvedValue(SAVED_SETTINGS)
    expect(await client().settings.save(SETTINGS)).toEqual(SAVED_SETTINGS)
    expect(settingsService.saveSettings).toHaveBeenCalledWith(USER.id, SETTINGS)
  })

  it('trims the name at the boundary', async () => {
    settingsService.saveSettings.mockResolvedValue(SAVED_SETTINGS)
    await client().settings.save({ ...SETTINGS, displayName: '  Jaco  ' })
    expect(settingsService.saveSettings).toHaveBeenCalledWith(USER.id, SETTINGS)
  })

  it('rejects invalid input as VALIDATION_FAILED with field paths', async () => {
    const error = await errorOf(
      client().settings.save({ ...SETTINGS, displayName: '   ', instrument: 'drums' as 'bass' }),
    )
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.data.issues?.map((issue) => issue.path).sort()).toEqual([
      'displayName',
      'instrument',
    ])
    expect(settingsService.saveSettings).not.toHaveBeenCalled()
  })

  it('rejects an empty update', async () => {
    expect((await errorOf(client().settings.update({}))).code).toBe('VALIDATION_FAILED')
  })

  it('update passes a single-field patch through', async () => {
    settingsService.updateSettings.mockResolvedValue(SAVED_SETTINGS)
    await client().settings.update({ instrument: 'guitar' })
    expect(settingsService.updateSettings).toHaveBeenCalledWith(USER.id, { instrument: 'guitar' })
  })

  it('settings procedures are authenticated like every other procedure', async () => {
    const error = await errorOf(clientFor(fake).settings.save(SETTINGS))
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED', data: { reason: 'missing_token' } })
  })
})

describe('curriculum procedures', () => {
  const client = () => clientFor(fake, 'Bearer valid-alice')
  const GROUP_ID = '0d6f3a3e-6b1c-4d5e-9f00-1a2b3c4d5e6f'

  it('list defaults to the guitar curriculum for the caller', async () => {
    curriculumService.listCurriculum.mockResolvedValue([])
    await client().curriculum.list()
    expect(curriculumService.listCurriculum).toHaveBeenCalledWith(USER.id, 'guitar')
  })

  it('recordPractice records for the CALLER, with defaults applied', async () => {
    const now = new Date()
    curriculumService.recordGroupPractice.mockResolvedValue({
      completedAt: null,
      lastPlayedAt: now,
      playCount: 1,
    })
    expect(await client().curriculum.recordPractice({ groupId: GROUP_ID })).toEqual({
      completedAt: null,
      lastPlayedAt: now,
      playCount: 1,
    })
    expect(curriculumService.recordGroupPractice).toHaveBeenCalledWith(USER.id, {
      groupId: GROUP_ID,
      completed: false,
      chordIds: [],
    })
  })

  it('rejects a malformed group id before the service runs', async () => {
    const error = await errorOf(client().curriculum.recordPractice({ groupId: 'nope' }))
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(curriculumService.recordGroupPractice).not.toHaveBeenCalled()
  })

  it('requires authentication', async () => {
    const error = await errorOf(clientFor(fake).curriculum.list())
    expect(error.code).toBe('UNAUTHENTICATED')
  })
})

describe('public lessons endpoint', () => {
  it('serves real lesson content with NO token (auth not even configured)', async () => {
    const app = createApp({ webOrigin: 'http://localhost:3000', authClient: null })
    const link = new RPCLink({
      url: 'http://api.test/public-rpc',
      fetch: async (request) => app.fetch(request),
    })
    const client = createORPCClient<RouterClient<PublicRouter>>(link)

    const lesson = await client.lessons.get({ slug: 'first-chords' })
    expect(lesson).toMatchObject({ lessonNumber: 1, name: 'First Chords' })
    expect(lesson.items.map((item) => item.title)).toEqual(['G', 'C', 'D'])

    const missing = await client.lessons.get({ slug: 'no-such-lesson' }).catch((e: unknown) => e)
    expect(missing).toBeInstanceOf(ORPCError)
    expect((missing as ORPCError<string, unknown>).code).toBe('NOT_FOUND')
  })

  it('lesson progress procedures still require authentication', async () => {
    const error = await errorOf(clientFor(fake).lessons.progress({ instrument: 'guitar' }))
    expect(error.code).toBe('UNAUTHENTICATED')
  })
})
