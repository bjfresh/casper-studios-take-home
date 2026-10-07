import { describe, expect, it } from 'vitest'
import { createFakeAuthClient } from '../../test/fake-auth-client'
import { withProfileCache } from '../auth-client'

describe('withProfileCache', () => {
  it('memoizes profiles per user for the TTL', async () => {
    let now = 0
    const inner = createFakeAuthClient({ a: { email: 'a@x.test' } })
    const client = withProfileCache(inner, { ttlMs: 60_000, now: () => now })

    await client.getProfile('a')
    await client.getProfile('a')
    expect(inner.profileCalls).toEqual(['a'])

    now = 60_001
    await client.getProfile('a')
    expect(inner.profileCalls).toEqual(['a', 'a'])
  })

  it('does not cache failures', async () => {
    const inner = createFakeAuthClient({})
    const client = withProfileCache(inner)
    await expect(client.getProfile('b')).rejects.toThrow()
    await expect(client.getProfile('b')).rejects.toThrow()
    expect(inner.profileCalls).toEqual(['b', 'b'])
  })

  it('stays bounded, evicting the oldest entry', async () => {
    const inner = createFakeAuthClient({
      a: { email: null },
      b: { email: null },
      c: { email: null },
    })
    const client = withProfileCache(inner, { maxEntries: 2 })
    await client.getProfile('a')
    await client.getProfile('b')
    await client.getProfile('c')
    await client.getProfile('a')
    expect(inner.profileCalls).toEqual(['a', 'b', 'c', 'a'])
  })
})
