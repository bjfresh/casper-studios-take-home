import { beforeEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { RegisteredModals } from '@/components/layout/RegisteredModals'
import type { Auth } from '@/hooks/use-auth'
import { ModalProvider } from '@/providers/ModalProvider'
import { AuthGate } from '../AuthGate'

// The auth boundary is the seam: every state is driven through useAuth().
const auth = vi.hoisted(() => ({ current: {} as Auth }))
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth.current }))

function setAuth(overrides: Partial<Auth>) {
  auth.current = {
    isReady: true,
    isAuthenticated: false,
    isConfigured: true,
    userId: null,
    email: null,
    login: vi.fn(),
    logout: vi.fn(async () => {}),
    getToken: vi.fn(async () => null),
    ...overrides,
  }
}

function renderGate() {
  return render(
    <ModalProvider>
      <AuthGate>
        <nav>Private navigation</nav>
      </AuthGate>
      <RegisteredModals />
    </ModalProvider>,
  )
}

beforeEach(() => setAuth({}))

describe('AuthGate', () => {
  it('renders nothing signed-out until auth is ready (no flash for restored sessions)', async () => {
    setAuth({ isReady: false })
    await renderGate()
    await expect.element(page.getByText('Checking your session')).toBeInTheDocument()
    expect(page.getByText('Sign in to continue').query()).toBeNull()
    expect(page.getByText('Private navigation').query()).toBeNull()
  })

  it('signed out: shows the sign-in prompt in place and hides private chrome', async () => {
    const urlBefore = window.location.href
    await renderGate()
    await expect.element(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
    expect(page.getByText('Private navigation').query()).toBeNull()
    // In place, not a redirect: the URL the user was trying to reach is untouched.
    expect(window.location.href).toBe(urlBefore)
  })

  it('signed out: one Sign In button opens the sign-in modal, which hands off to Privy', async () => {
    const login = vi.fn()
    setAuth({ login })
    await renderGate()

    await userEvent.click(page.getByRole('button', { name: 'Sign In', exact: true }))
    const dialog = page.getByRole('dialog', { name: 'Sign in' })
    await expect.element(dialog).toBeVisible()

    await userEvent.click(dialog.getByRole('button', { name: 'Sign In', exact: true }))
    expect(login).toHaveBeenCalledOnce()
    // Our modal closed before Privy's opened, so it can't make Privy's UI inert.
    await expect.poll(() => document.querySelector('dialog')?.open).toBe(false)
  })

  it('authenticated: renders the protected children', async () => {
    setAuth({ isAuthenticated: true, userId: 'did:privy:alice' })
    await renderGate()
    await expect.element(page.getByText('Private navigation')).toBeVisible()
  })

  it('unconfigured: explains instead of offering a sign-in that cannot work', async () => {
    setAuth({ isConfigured: false })
    await renderGate()
    await expect.element(page.getByRole('heading', { name: 'Sign-in unavailable' })).toBeVisible()
    expect(page.getByRole('button', { name: /sign in/i }).query()).toBeNull()
    expect(page.getByText('Private navigation').query()).toBeNull()
  })
})
