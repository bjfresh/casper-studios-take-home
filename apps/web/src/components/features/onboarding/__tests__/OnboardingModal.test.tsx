import { DEFAULT_PREFERENCES } from '@repo/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { RegisteredModals } from '@/components/layout/RegisteredModals'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import type { Auth } from '@/hooks/use-auth'
import { MODAL_KEY, ModalProvider, useModalRegistry } from '@/providers/ModalProvider'

const auth = vi.hoisted(() => ({ login: (() => {}) as () => void }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({
    isReady: true,
    isAuthenticated: false,
    isConfigured: true,
    login: auth.login,
  }),
}))

function Opener() {
  const { openModal } = useModalRegistry()
  return (
    <button type="button" onClick={() => openModal(MODAL_KEY.ONBOARDING)}>
      Open
    </button>
  )
}

async function openOnboarding() {
  await render(
    <ModalProvider>
      <Opener />
      <RegisteredModals />
    </ModalProvider>,
  )
  await userEvent.click(page.getByRole('button', { name: 'Open' }))
}

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.pendingPlayerSettings) ?? 'null')

afterEach(() => localStorage.clear())

describe('OnboardingModal (front-loaded, before an account exists)', () => {
  it('stores the settings locally, then moves on to creating an account', async () => {
    await openOnboarding()
    await userEvent.fill(page.getByRole('textbox', { name: 'Your name' }), 'Paul')
    await userEvent.click(page.getByRole('switch', { name: 'Handedness: Right' }))
    await userEvent.click(page.getByRole('button', { name: 'Continue' }))

    expect(stored()).toEqual({
      ...DEFAULT_PREFERENCES,
      displayName: 'Paul',
      instrument: 'guitar',
      handedness: 'left',
    })
    await expect.element(page.getByRole('dialog', { name: 'Create your account' })).toBeVisible()
  })

  it('carries the guest’s fretboard choices into the account, so sign-up keeps the display mode', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestPreferences,
      JSON.stringify({
        showNoteNames: false,
        showFingerNumbers: true,
        showIntervals: true,
        handedness: 'left',
      }),
    )
    await openOnboarding()
    // Prefilled from the guest's preferences.
    await expect
      .element(page.getByRole('switch', { name: 'Handedness: Right' }))
      .toHaveAttribute('aria-checked', 'false')
    await userEvent.fill(page.getByRole('textbox', { name: 'Your name' }), 'Paul')
    await userEvent.click(page.getByRole('button', { name: 'Continue' }))

    expect(stored()).toMatchObject({
      displayName: 'Paul',
      handedness: 'left',
      showNoteNames: false,
      showFingerNumbers: true,
      showIntervals: true,
    })
  })

  it('submits on Enter in the name field (a real form, via formId)', async () => {
    await openOnboarding()
    await userEvent.type(page.getByRole('textbox', { name: 'Your name' }), 'Paul{Enter}')
    expect(stored()?.displayName).toBe('Paul')
  })

  it('stores nothing until the settings are valid', async () => {
    await openOnboarding()
    await userEvent.click(page.getByRole('button', { name: 'Continue' }))
    expect(stored()).toBeNull()
    await expect.element(page.getByRole('dialog', { name: 'Let’s play' })).toBeVisible()
  })

  it('pre-fills from settings left by an earlier, unfinished visit', async () => {
    localStorage.setItem(
      STORAGE_KEYS.pendingPlayerSettings,
      JSON.stringify({ displayName: 'Paul', instrument: 'bass', handedness: 'left' }),
    )
    await openOnboarding()
    await expect.element(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('Paul')
    await expect
      .element(page.getByRole('switch', { name: 'Instrument: Bass' }))
      .toHaveAttribute('aria-checked', 'true')
  })

  it('ignores invalid stored settings instead of crashing', async () => {
    localStorage.setItem(STORAGE_KEYS.pendingPlayerSettings, '{"displayName":42}')
    await openOnboarding()
    await expect.element(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('')
  })

  it('sends players who already have an account straight to Privy', async () => {
    const login = vi.fn()
    auth.login = login
    await openOnboarding()
    await userEvent.click(page.getByRole('button', { name: 'I already have an account' }))
    expect(login).toHaveBeenCalledOnce()
    // Closed first, so our modal can't make Privy's UI inert.
    await expect
      .poll(() => [...document.querySelectorAll('dialog')].some((d) => d.open))
      .toBe(false)
  })
})
