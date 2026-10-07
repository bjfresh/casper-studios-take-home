import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { Auth } from '@/hooks/use-auth'
import { createFakeApi, TestProviders } from '@/test/api'
import { HomeHeader } from '../HomeHeader'

const api = vi.hoisted(() => ({ current: null as unknown }))
const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  logout: (() => {}) as () => Promise<void>,
}))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({
    isReady: true,
    isConfigured: true,
    isAuthenticated: auth.isAuthenticated,
    logout: auth.logout,
  }),
}))

async function renderHeader() {
  api.current = createFakeApi({}).api
  await render(
    <TestProviders>
      <HomeHeader />
    </TestProviders>,
  )
}

afterEach(() => {
  auth.isAuthenticated = true
})

describe('HomeHeader', () => {
  it('signed in: a Sign out button, and no Account link (account details are in Settings)', async () => {
    const logout = vi.fn(async () => {})
    auth.logout = logout
    await renderHeader()
    expect(page.getByRole('link', { name: 'Account' }).query()).toBeNull()
    await userEvent.click(page.getByRole('button', { name: 'Sign out' }))
    expect(logout).toHaveBeenCalledOnce()
  })

  it('signed out: a single Sign In button (the modal covers signing up too)', async () => {
    auth.isAuthenticated = false
    await renderHeader()
    await expect.element(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    expect(page.getByRole('button', { name: /create account|sign up/i }).query()).toBeNull()
    expect(page.getByRole('button', { name: 'Sign out' }).query()).toBeNull()
  })
})
