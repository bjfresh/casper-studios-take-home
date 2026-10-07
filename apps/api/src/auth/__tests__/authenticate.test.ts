import { describe, expect, it, vi } from 'vitest'
import { createFakeAuthClient } from '../../test/fake-auth-client'
import { authenticate, extractBearerToken } from '../authenticate'

describe('extractBearerToken', () => {
  it.each([
    ['Bearer abc.def.ghi', 'abc.def.ghi'],
    ['bearer abc', 'abc'],
    ['  Bearer   abc  ', 'abc'],
  ])('accepts %j', (header, token) => {
    expect(extractBearerToken(header)).toBe(token)
  })

  it.each([
    undefined,
    null,
    '',
    'Bearer',
    'Bearer ',
    'Basic dXNlcjpwYXNz',
    'Bearer a b',
    'Bearer <script>',
    'abc.def.ghi',
  ])('returns null (never throws) for %j', (header) => {
    expect(extractBearerToken(header)).toBeNull()
  })
})

describe('authenticate', () => {
  const client = createFakeAuthClient({ 'did:privy:alice': { email: 'alice@example.com' } })

  it('fails closed when no client is configured', async () => {
    expect(await authenticate(null, 'Bearer valid-alice')).toEqual({
      status: 'failed',
      reason: 'not_configured',
    })
  })

  it.each([
    [undefined, 'missing_token'],
    ['Basic abc', 'invalid_token'],
    ['Bearer nonsense', 'invalid_token'],
    ['Bearer expired', 'expired_token'],
  ] as const)('header %j → %s', async (header, reason) => {
    expect(await authenticate(client, header)).toEqual({ status: 'failed', reason })
  })

  it('authenticates a valid token with its profile', async () => {
    expect(await authenticate(client, 'Bearer valid-alice')).toEqual({
      status: 'authenticated',
      privyUserId: 'did:privy:alice',
      email: 'alice@example.com',
    })
  })

  it('degrades to a minimal identity when the profile lookup fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await authenticate(client, 'Bearer valid-nobody')).toEqual({
      status: 'authenticated',
      privyUserId: 'did:privy:nobody',
      email: null,
    })
  })

  it('never logs the token', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await authenticate(client, 'Bearer valid-nobody')
    expect(JSON.stringify(warn.mock.calls)).not.toContain('valid-nobody ')
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/Bearer/)
  })
})
