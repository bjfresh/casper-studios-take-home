import { ORPCError } from '@orpc/client'
import { StandardRPCJsonSerializer, StandardRPCSerializer } from '@orpc/client/standard'
import { describe, expect, it, vi } from 'vitest'
import { toApiError } from '../api-errors'
import { createApi } from '../rpc-client'

// Encodes bodies with oRPC's own serializer, so these tests speak the real
// wire format instead of a hand-copied one.
const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer())
const USER = {
  id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e',
  email: 'alice@example.com',
  role: 'user',
  settings: null,
}

function respondWith(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(serializer.serialize(body)), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  )
}

function authorizationOf(fetchMock: ReturnType<typeof respondWith>, call = 0) {
  const [request] = fetchMock.mock.calls[call] ?? []
  return request instanceof Request ? request.headers.get('authorization') : undefined
}

describe('createApi', () => {
  it('attaches a bearer token fetched at request time', async () => {
    const fetchMock = respondWith(USER)
    const getToken = vi.fn().mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2')
    const api = createApi({ baseUrl: 'http://api.test', getToken, fetch: fetchMock })

    await api.client.account.me()
    await api.client.account.me()
    expect(authorizationOf(fetchMock, 0)).toBe('Bearer token-1')
    expect(authorizationOf(fetchMock, 1)).toBe('Bearer token-2')
  })

  it('sends no Authorization header when signed out', async () => {
    const fetchMock = respondWith(USER)
    const api = createApi({
      baseUrl: 'http://api.test',
      getToken: async () => null,
      fetch: fetchMock,
    })
    await api.client.account.me()
    expect(authorizationOf(fetchMock)).toBeNull()
  })

  it('validates responses against the shared contract', async () => {
    const fetchMock = respondWith({ ...USER, id: 'not-a-uuid' })
    const api = createApi({
      baseUrl: 'http://api.test',
      getToken: async () => null,
      fetch: fetchMock,
    })
    await expect(api.client.account.me()).rejects.toThrow()
  })

  it('surfaces the server’s auth error code and reason', async () => {
    const error = new ORPCError('UNAUTHENTICATED', {
      status: 401,
      message: 'Your session has expired. Sign in again.',
      data: { reason: 'expired_token', requestId: 'req-1' },
    })
    const fetchMock = respondWith(error.toJSON(), 401)
    const api = createApi({
      baseUrl: 'http://api.test',
      getToken: async () => 't',
      fetch: fetchMock,
    })

    const thrown = await api.client.account.me().catch((e: unknown) => e)
    expect(toApiError(thrown)).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'Your session has expired. Sign in again.',
      reason: 'expired_token',
      requestId: 'req-1',
    })
  })
})

describe('toApiError', () => {
  it('maps an unreachable server to DEPENDENCY_UNAVAILABLE', () => {
    expect(toApiError(new TypeError('Failed to fetch')).code).toBe('DEPENDENCY_UNAVAILABLE')
  })

  it('never passes through an unknown code or its message', () => {
    const error = new ORPCError('SOMETHING_ODD', { message: 'internal detail' })
    expect(toApiError(error)).toEqual({ code: 'INTERNAL', message: 'Something went wrong' })
  })
})
