import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useAuth } from '../use-auth'

// Configured mode, with the vendor SDK replaced: these tests pin how useAuth
// translates Privy's state, without a Privy app.
vi.mock('@/providers/AuthProvider', () => ({ isAuthConfigured: true }))

const privy = vi.hoisted(() => ({
  ready: false,
  authenticated: false,
  user: null as null | { id: string; email?: { address: string }; google?: { email: string } },
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  login: vi.fn(),
  logout: vi.fn<() => Promise<void>>(),
}))
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => privy }))

beforeEach(() => {
  Object.assign(privy, { ready: false, authenticated: false, user: null })
  privy.getAccessToken.mockReset()
  privy.login.mockReset()
})

describe('useAuth with Privy configured', () => {
  it('is not ready while Privy restores the session, and not signed in yet', async () => {
    const { result } = await renderHook(() => useAuth())
    expect(result.current).toMatchObject({
      isReady: false,
      isAuthenticated: false,
      isConfigured: true,
    })
  })

  it('exposes the DID and the first known email once authenticated', async () => {
    Object.assign(privy, {
      ready: true,
      authenticated: true,
      user: { id: 'did:privy:alice', google: { email: 'alice@gmail.test' } },
    })
    const { result } = await renderHook(() => useAuth())
    expect(result.current).toMatchObject({
      isReady: true,
      isAuthenticated: true,
      userId: 'did:privy:alice',
      email: 'alice@gmail.test',
    })
  })

  it('returns a fresh token at call time', async () => {
    privy.getAccessToken.mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2')
    const { result } = await renderHook(() => useAuth())
    expect(await result.current.getToken()).toBe('token-1')
    expect(await result.current.getToken()).toBe('token-2')
  })

  it('turns a vendor error into a neutral null, never a raw error', async () => {
    privy.getAccessToken.mockRejectedValue(new Error('internal vendor detail: secret-ish'))
    const { result } = await renderHook(() => useAuth())
    expect(await result.current.getToken()).toBeNull()
  })

  it('swallows a throwing login rather than surfacing it', async () => {
    privy.login.mockImplementation(() => {
      throw new Error('vendor detail')
    })
    const { result } = await renderHook(() => useAuth())
    expect(() => result.current.login()).not.toThrow()
  })
})
