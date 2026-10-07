import { ORPCError } from '@orpc/client'
import { DEFAULT_PREFERENCES } from '@repo/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import type { Auth } from '@/hooks/use-auth'
import { createFakeApi, fakeSaveSettings, TestProviders } from '@/test/api'
import { AccountSync } from '../AccountSync'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({
    isReady: true,
    isAuthenticated: true,
    isConfigured: true,
    userId: 'did:privy:paul',
    email: 'paul.vicks@example.com',
  }),
}))

const GUEST = {
  version: 1,
  groups: { 'first-chords': { completedAt: null, lastPlayedAt: 1_700_000_000_000, playCount: 2 } },
  items: { 'chord:g-major': { learnedAt: 1, lastPlayedAt: 2, lastSkippedAt: null, playCount: 1 } },
}
const ME = { id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e', email: null, role: 'user', settings: null }

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

async function renderSync(procedures: Parameters<typeof createFakeApi>[0]) {
  const fake = createFakeApi({ 'account.me': () => ME, ...procedures })
  api.current = fake.api
  await render(
    <TestProviders>
      <AccountSync />
    </TestProviders>,
  )
  return fake
}

describe('AccountSync', () => {
  it('imports guest progress once signed in, then clears the local copy', async () => {
    localStorage.setItem(STORAGE_KEYS.guestProgress, JSON.stringify(GUEST))
    const fake = await renderSync({
      'lessons.importGuestProgress': () => ({ groups: 1, items: 1 }),
    })

    await expect
      .poll(() => fake.calls.filter((call) => call.path === 'lessons.importGuestProgress'))
      .toEqual([{ path: 'lessons.importGuestProgress', input: GUEST }])
    await expect.poll(() => localStorage.getItem(STORAGE_KEYS.guestProgress)).toBeNull()
  })

  it('keeps the local copy when the import fails', async () => {
    localStorage.setItem(STORAGE_KEYS.guestProgress, JSON.stringify(GUEST))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fake = await renderSync({
      'lessons.importGuestProgress': () => {
        throw new ORPCError('DEPENDENCY_UNAVAILABLE', { status: 503 })
      },
    })
    await expect
      .poll(() => fake.calls.some((call) => call.path === 'lessons.importGuestProgress'))
      .toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.guestProgress) ?? '{}')).toEqual(GUEST)
  })

  it('saves settings collected before sign-up, wherever sign-up finished', async () => {
    const SETTINGS = { displayName: 'Paul', instrument: 'guitar', handedness: 'left' }
    localStorage.setItem(STORAGE_KEYS.pendingPlayerSettings, JSON.stringify(SETTINGS))
    const fake = await renderSync({ 'settings.save': fakeSaveSettings })

    await expect
      .poll(() => fake.calls.filter((call) => call.path === 'settings.save'))
      .toEqual([{ path: 'settings.save', input: SETTINGS }])
    await expect.poll(() => localStorage.getItem(STORAGE_KEYS.pendingPlayerSettings)).toBeNull()
  })

  it('saves settings from the set-up form even when it was filled in after the page loaded (sign-up in the same visit)', async () => {
    const SETTINGS = { displayName: 'Paul', instrument: 'guitar', handedness: 'left' }
    let resolveMe: (value: unknown) => void = () => {}
    const me = new Promise((resolve) => {
      resolveMe = resolve
    })
    const fake = await renderSync({ 'account.me': () => me, 'settings.save': fakeSaveSettings })
    // The form is completed only now, before the account has loaded.
    localStorage.setItem(STORAGE_KEYS.pendingPlayerSettings, JSON.stringify(SETTINGS))
    resolveMe(ME)
    await expect
      .poll(() => fake.calls.filter((call) => call.path === 'settings.save'))
      .toEqual([{ path: 'settings.save', input: SETTINGS }])
  })

  it('a new account that skipped the set-up form (Sign In) still gets this device’s preferences, with a name from the email', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestPreferences,
      JSON.stringify({ handedness: 'left', showIntervals: true }),
    )
    const fake = await renderSync({ 'settings.save': fakeSaveSettings })
    await expect
      .poll(() => fake.calls.find((call) => call.path === 'settings.save')?.input)
      .toMatchObject({ displayName: 'paul vicks', handedness: 'left', showIntervals: true })
  })

  it('does nothing for an account that has settings and nothing to move', async () => {
    const fake = await renderSync({
      'account.me': () => ({ ...ME, settings: { ...DEFAULT_PREFERENCES, displayName: 'Paul' } }),
    })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(fake.calls.filter((call) => call.path !== 'account.me')).toEqual([])
  })
})
