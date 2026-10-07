import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppEnv } from '../../context/app-env'
import { createFakeAuthClient } from '../../test/fake-auth-client'
import { getAuthUser, getOptionalAuthUser, optionalAuth, requireAuth } from '../auth'
import { errorHandler } from '../error-handler'

const upsertUserFromIdentity = vi.hoisted(() => vi.fn())
vi.mock('../../services/user-service', () => ({ upsertUserFromIdentity }))

const USER = { id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e', email: null, role: 'user' }
const fake = createFakeAuthClient({ 'did:privy:alice': { email: null } })

afterEach(() => {
  vi.restoreAllMocks()
  upsertUserFromIdentity.mockReset()
})

function appWith(configure: (app: Hono<AppEnv>) => Hono<AppEnv>) {
  return configure(new Hono<AppEnv>().use(requestId())).onError(errorHandler)
}

describe('getAuthUser', () => {
  it('throws loudly on a route without requireAuth', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = appWith((a) => a.get('/unprotected', (c) => c.json(getAuthUser(c))))

    const res = await app.request('/unprotected')
    expect(res.status).toBe(500)
    expect(String(error.mock.calls[0]?.[1])).toMatch(/not behind requireAuth/)
  })

  it('returns the user behind requireAuth (mounted on a group)', async () => {
    upsertUserFromIdentity.mockResolvedValue(USER)
    const app = appWith((a) =>
      a.use('/private/*', requireAuth(fake)).get('/private/me', (c) => c.json(getAuthUser(c))),
    )
    const res = await app.request('/private/me', {
      headers: { authorization: 'Bearer valid-alice' },
    })
    expect(await res.json()).toEqual(USER)
  })

  it('protects every route added to the group, not just the first', async () => {
    const app = appWith((a) =>
      a
        .use('/private/*', requireAuth(fake))
        .get('/private/a', (c) => c.text('a'))
        .get('/private/b', (c) => c.text('b')),
    )
    expect((await app.request('/private/a')).status).toBe(401)
    expect((await app.request('/private/b')).status).toBe(401)
  })
})

describe('optionalAuth', () => {
  const app = appWith((a) =>
    a
      .use('/maybe', optionalAuth(fake))
      .get('/maybe', (c) => c.json({ user: getOptionalAuthUser(c) ?? null })),
  )

  it('lets anonymous callers through', async () => {
    const res = await app.request('/maybe')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user: null })
  })

  it('never rejects, even with a bad or expired token', async () => {
    for (const authorization of ['Bearer expired', 'Bearer forged', 'Basic x']) {
      const res = await app.request('/maybe', { headers: { authorization } })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ user: null })
    }
  })

  it('populates the user for a valid token', async () => {
    upsertUserFromIdentity.mockResolvedValue(USER)
    const res = await app.request('/maybe', { headers: { authorization: 'Bearer valid-alice' } })
    expect(await res.json()).toEqual({ user: USER })
  })
})
