import { ORPCError } from '@orpc/client'
import { DEFAULT_PREFERENCES } from '@repo/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { createFakeApi, fakeSaveSettings, TestProviders } from '@/test/api'
import { OnboardingGate } from '../OnboardingGate'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))

const USER = { id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e', email: 'paul@example.com', role: 'user' }
const LOCAL = { displayName: 'Paul', instrument: 'bass', handedness: 'left' } as const
const SAVED = { ...DEFAULT_PREFERENCES, displayName: 'Saved Paul' }

const storePending = () =>
  localStorage.setItem(STORAGE_KEYS.pendingPlayerSettings, JSON.stringify(LOCAL))
const pendingInStorage = () => localStorage.getItem(STORAGE_KEYS.pendingPlayerSettings)

async function renderGate(procedures: Parameters<typeof createFakeApi>[0]) {
  const fake = createFakeApi(procedures)
  api.current = fake.api
  await render(
    <TestProviders>
      <OnboardingGate>
        <p>The app</p>
      </OnboardingGate>
    </TestProviders>,
  )
  return fake
}

afterEach(() => localStorage.clear())

describe('OnboardingGate', () => {
  it('saves settings collected before sign-up, clears the local copy, then lets the player in', async () => {
    storePending()
    const fake = await renderGate({
      'account.me': () => ({ ...USER, settings: null }),
      'settings.save': fakeSaveSettings,
    })

    await expect.element(page.getByText('The app')).toBeVisible()
    expect(fake.calls.filter((call) => call.path === 'settings.save')).toEqual([
      { path: 'settings.save', input: LOCAL },
    ])
    expect(pendingInStorage()).toBeNull()
  })

  it('keeps an existing account’s saved settings and discards the pending copy', async () => {
    storePending()
    const fake = await renderGate({ 'account.me': () => ({ ...USER, settings: SAVED }) })

    await expect.element(page.getByText('The app')).toBeVisible()
    expect(fake.calls.map((call) => call.path)).toEqual(['account.me'])
    await expect.poll(pendingInStorage).toBeNull()
  })

  it('keeps the local copy when the save fails, and retries on request', async () => {
    storePending()
    let attempts = 0
    await renderGate({
      'account.me': () => ({ ...USER, settings: null }),
      'settings.save': (input) => {
        attempts += 1
        if (attempts === 1) throw new ORPCError('DEPENDENCY_UNAVAILABLE', { status: 503 })
        return fakeSaveSettings(input)
      },
    })

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('We couldn’t save your settings. They’re still on this device.')
    expect(pendingInStorage()).not.toBeNull()

    await userEvent.click(page.getByRole('button', { name: 'Try again' }))
    await expect.element(page.getByText('The app')).toBeVisible()
    expect(pendingInStorage()).toBeNull()
  })

  it('signed in with nothing saved and nothing pending: saves this device’s preferences with a starting name, then lets the player in', async () => {
    localStorage.setItem(STORAGE_KEYS.guestPreferences, JSON.stringify({ handedness: 'left' }))
    const fake = await renderGate({
      'account.me': () => ({ ...USER, settings: null }),
      'settings.save': fakeSaveSettings,
    })

    await expect.element(page.getByText('The app')).toBeVisible()
    expect(fake.calls.find((call) => call.path === 'settings.save')?.input).toMatchObject({
      // No email in this environment (auth unconfigured), so the fallback name.
      displayName: 'Player',
      handedness: 'left',
    })
  })
})
