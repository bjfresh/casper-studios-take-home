import { apiResponseSchema, healthStatusSchema } from '@repo/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app'

const pingDb = vi.hoisted(() => vi.fn<() => Promise<void>>())
vi.mock('@repo/db', () => ({ pingDb }))

const app = createApp({ webOrigin: 'http://localhost:3000', authClient: null })
const responseSchema = apiResponseSchema(healthStatusSchema)

describe('GET /health/ready', () => {
  // Braces matter: a function returned from beforeEach is run as teardown, and
  // mockReset() returns the mock — Vitest would then call pingDb() itself.
  beforeEach(() => {
    pingDb.mockReset()
  })

  it('returns 200 in the envelope when the database answers', async () => {
    pingDb.mockResolvedValue()
    const res = await app.request('/health/ready')

    expect(res.status).toBe(200)
    expect(responseSchema.parse(await res.json())).toEqual({
      ok: true,
      data: { status: 'ok', checks: { database: 'up' } },
    })
  })

  it('returns 503, not 404 or 500, when the database is down', async () => {
    pingDb.mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await app.request('/health/ready')
    const body = responseSchema.parse(await res.json())

    expect(res.status).toBe(503)
    expect(body.ok).toBe(false)
    if (!body.ok) expect(body.error.code).toBe('DEPENDENCY_UNAVAILABLE')
  })
})

describe('unknown routes', () => {
  it('answer 404 in the envelope with a request id', async () => {
    const res = await app.request('/nope')
    const body = responseSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(body.ok ? undefined : body.error.requestId).toEqual(expect.any(String))
  })
})
