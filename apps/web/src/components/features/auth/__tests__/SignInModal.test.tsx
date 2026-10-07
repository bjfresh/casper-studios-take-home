import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { RegisteredModals } from '@/components/layout/RegisteredModals'
import type { Auth } from '@/hooks/use-auth'
import { MODAL_KEY, ModalProvider, useModalRegistry } from '@/providers/ModalProvider'

const auth = vi.hoisted(() => ({ isConfigured: true, login: (() => {}) as () => void }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({
    isReady: true,
    isAuthenticated: false,
    isConfigured: auth.isConfigured,
    login: auth.login,
  }),
}))

function Opener() {
  const { openModal } = useModalRegistry()
  return (
    <button type="button" onClick={() => openModal(MODAL_KEY.SIGN_IN)}>
      Open
    </button>
  )
}

async function openSignIn() {
  await render(
    <ModalProvider>
      <Opener />
      <RegisteredModals />
    </ModalProvider>,
  )
  await userEvent.click(page.getByRole('button', { name: 'Open' }))
  const dialog = page.getByRole('dialog', { name: 'Sign in' })
  await expect.element(dialog).toBeVisible()
  return dialog
}

afterEach(() => {
  auth.isConfigured = true
  localStorage.clear()
})

describe('SignInModal', () => {
  it('two stacked sections: "Have an account?" then "Create an Account"', async () => {
    const dialog = await openSignIn()
    const existing = dialog.getByRole('region', { name: 'Have an account?' })
    const create = dialog.getByRole('region', { name: 'Create an Account' })
    await expect.element(existing.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect
      .element(create.getByText('Track your progress, practice what you’ve learned, and level up!'))
      .toBeVisible()
    await expect.element(create.getByRole('button', { name: 'Sign Up' })).toBeVisible()
    const above = existing.element().getBoundingClientRect()
    const below = create.element().getBoundingClientRect()
    expect(below.top).toBeGreaterThanOrEqual(above.bottom)
  })

  it('Sign In closes the modal and hands off to Privy', async () => {
    const login = vi.fn()
    auth.login = login
    const dialog = await openSignIn()
    await userEvent.click(dialog.getByRole('button', { name: 'Sign In' }))
    expect(login).toHaveBeenCalledOnce()
    await expect
      .poll(() => [...document.querySelectorAll('dialog')].some((d) => d.open))
      .toBe(false)
  })

  it('Sign Up starts onboarding, which ends at creating the account', async () => {
    const dialog = await openSignIn()
    await userEvent.click(dialog.getByRole('button', { name: 'Sign Up' }))
    const onboarding = page.getByRole('dialog', { name: 'Let’s play' })
    await expect.element(onboarding).toBeVisible()
    await userEvent.fill(page.getByRole('textbox', { name: 'Your name' }), 'Paul')
    await userEvent.click(page.getByRole('button', { name: 'Continue' }))
    await expect.element(page.getByRole('dialog', { name: 'Create your account' })).toBeVisible()
  })

  it('unconfigured: Sign In is disabled and says why; Sign Up still sets up on this device', async () => {
    auth.isConfigured = false
    const dialog = await openSignIn()
    await expect.element(dialog.getByRole('button', { name: 'Sign In' })).toBeDisabled()
    await expect.element(dialog.getByText(/isn’t configured/)).toBeVisible()
    await expect.element(dialog.getByRole('button', { name: 'Sign Up' })).toBeEnabled()
  })
})
