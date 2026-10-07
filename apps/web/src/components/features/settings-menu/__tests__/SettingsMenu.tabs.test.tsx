import { DEFAULT_PREFERENCES } from '@repo/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import type { Auth } from '@/hooks/use-auth'
import { createFakeApi, TestProviders } from '@/test/api'
import { SettingsBar } from '../SettingsMenu'

const api = vi.hoisted(() => ({ current: null as unknown }))
const auth = vi.hoisted(() => ({ isAuthenticated: true }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({
    isReady: true,
    isConfigured: true,
    isAuthenticated: auth.isAuthenticated,
    email: auth.isAuthenticated ? 'jaco@example.com' : null,
  }),
}))

const SETTINGS = { ...DEFAULT_PREFERENCES, displayName: 'Jaco' }

async function openSettings() {
  api.current = createFakeApi({
    'account.me': () => ({
      id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e',
      email: null,
      role: 'user',
      settings: SETTINGS,
    }),
  }).api
  await render(
    <TestProviders>
      <SettingsBar />
    </TestProviders>,
  )
  await userEvent.click(page.getByRole('button', { name: 'Settings' }))
  await expect.element(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

afterEach(() => {
  auth.isAuthenticated = true
  localStorage.clear()
})

describe('Settings menu tabs', () => {
  it('signed in: Preferences first, and an Account tab with the name', async () => {
    await openSettings()
    const tabs = page.getByRole('tablist', { name: 'Settings sections' })
    await expect
      .element(tabs.getByRole('tab', { name: 'Preferences' }))
      .toHaveAttribute('aria-selected', 'true')
    await expect.element(page.getByRole('switch', { name: 'Instrument: Bass' })).toBeVisible()

    await userEvent.click(page.getByRole('tab', { name: 'Account' }))
    await expect.element(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('Jaco')
    await expect.element(page.getByText('jaco@example.com')).toBeVisible()
    expect(page.getByRole('switch', { name: 'Instrument: Bass' }).query()).toBeNull()
  })

  it('a guest has no account, so no tab bar: just the preferences', async () => {
    auth.isAuthenticated = false
    await openSettings()
    expect(page.getByRole('tablist').query()).toBeNull()
    await expect.element(page.getByRole('switch', { name: 'Instrument: Bass' })).toBeVisible()
    expect(page.getByRole('textbox', { name: 'Your name' }).query()).toBeNull()
  })
})
