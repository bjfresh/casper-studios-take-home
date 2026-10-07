import { ORPCError } from '@orpc/client'
import { DEFAULT_PREFERENCES } from '@repo/shared'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import type { Auth } from '@/hooks/use-auth'
import { createFakeApi, fakeSaveSettings, TestProviders } from '@/test/api'
import { usePreferences } from '../use-preferences'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({ isReady: true, isAuthenticated: true, isConfigured: true }),
}))

const ME = {
  id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e',
  email: null,
  role: 'user',
  settings: { ...DEFAULT_PREFERENCES, displayName: 'Paul' },
}

async function renderPreferences(update: (input: unknown) => unknown) {
  const fake = createFakeApi({ 'account.me': () => ME, 'settings.update': update })
  api.current = fake.api
  const hook = await renderHook(() => usePreferences(), { wrapper: TestProviders })
  await vi.waitFor(() => expect(hook.result.current.source).toBe('account'))
  return { ...hook, fake }
}

describe('usePreferences, signed in', () => {
  it('applies a change instantly, then saves just the patch to the account', async () => {
    let release: () => void = () => {}
    const { result, act, fake } = await renderPreferences(
      (input) =>
        new Promise((resolve) => {
          release = () => resolve(fakeSaveSettings({ ...ME.settings, ...(input as object) }))
        }),
    )
    await act(() => result.current.update({ showFingerNumbers: true }))

    // Optimistic: already applied (and normalized) before the server answers.
    expect(result.current.preferences).toMatchObject({
      showFingerNumbers: true,
      showNoteNames: false,
    })
    await vi.waitFor(() =>
      expect(fake.calls.filter((call) => call.path === 'settings.update')).toEqual([
        { path: 'settings.update', input: { showFingerNumbers: true } },
      ]),
    )
    release()
  })

  it('puts the saved value back if the save fails', async () => {
    const { result, act } = await renderPreferences(() => {
      throw new ORPCError('DEPENDENCY_UNAVAILABLE', { status: 503 })
    })
    await act(() => result.current.update({ handedness: 'left' }))
    await vi.waitFor(() => expect(result.current.preferences.handedness).toBe('right'))
  })
})
