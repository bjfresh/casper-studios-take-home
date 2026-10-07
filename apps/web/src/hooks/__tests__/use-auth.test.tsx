import { describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useAuth } from '../use-auth'

// No NEXT_PUBLIC_PRIVY_APP_ID in the test env and no PrivyProvider: the
// unconfigured mode a fresh clone boots in.
describe('useAuth without Privy configured', () => {
  it('is ready (never stuck loading), signed out, and says it is unconfigured', async () => {
    const { result } = await renderHook(() => useAuth())
    expect(result.current).toMatchObject({
      isReady: true,
      isAuthenticated: false,
      isConfigured: false,
      userId: null,
      email: null,
    })
  })

  it('guards the vendor calls that would otherwise throw', async () => {
    const { result } = await renderHook(() => useAuth())
    expect(await result.current.getToken()).toBeNull()
    expect(() => result.current.login()).not.toThrow()
    await expect(result.current.logout()).resolves.toBeUndefined()
  })
})
