import { ORPCError } from '@orpc/client'
import { DEFAULT_PREFERENCES } from '@repo/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import type { Auth } from '@/hooks/use-auth'
import { createFakeApi, fakeSaveSettings, TestProviders } from '@/test/api'
import { AccountPanel } from '../AccountPanel'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({
    isReady: true,
    isAuthenticated: true,
    isConfigured: true,
    email: 'jaco@example.com',
  }),
}))

const SETTINGS = {
  ...DEFAULT_PREFERENCES,
  displayName: 'Jaco',
  instrument: 'guitar',
  handedness: 'right',
} as const
const ME = { id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e', email: 'jaco@example.com', role: 'user' }

function setup(procedures: Record<string, (input: unknown) => unknown>, settings: unknown) {
  const fake = createFakeApi({ 'account.me': () => ({ ...ME, settings }), ...procedures })
  api.current = fake.api
  return fake
}

const echo = (input: unknown) => ({ ...SETTINGS, ...(input as object) })

async function renderPanel() {
  await render(
    <TestProviders>
      <AccountPanel />
      <button type="button">Elsewhere</button>
    </TestProviders>,
  )
  await expect.element(page.getByRole('textbox', { name: 'Your name' })).toBeVisible()
}

afterEach(() => localStorage.clear())

describe('AccountPanel (the Settings menu’s Account tab)', () => {
  it('shows the name and the sign-in email, and never the role', async () => {
    setup({}, SETTINGS)
    await renderPanel()
    await expect.element(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('Jaco')
    await expect.element(page.getByText('jaco@example.com')).toBeVisible()
    expect(page.getByText(/role/i).query()).toBeNull()
    expect(page.getByText('user', { exact: true }).query()).toBeNull()
  })

  it('saves the name when it loses focus, only if it changed — no Save button', async () => {
    const fake = setup({ 'settings.update': echo }, SETTINGS)
    await renderPanel()
    const name = page.getByRole('textbox', { name: 'Your name' })

    await userEvent.click(name)
    await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }))
    expect(fake.calls.filter((call) => call.path === 'settings.update')).toEqual([])

    await userEvent.fill(name, 'Jaco P')
    await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }))
    await expect
      .poll(() => fake.calls.filter((call) => call.path === 'settings.update'))
      .toEqual([{ path: 'settings.update', input: { displayName: 'Jaco P' } }])
    await expect.element(page.getByRole('status')).toHaveTextContent('Saved')
    expect(page.getByRole('button', { name: /save/i }).query()).toBeNull()
  })

  it('saves on Enter too', async () => {
    const fake = setup({ 'settings.update': echo }, SETTINGS)
    await renderPanel()
    await userEvent.fill(page.getByRole('textbox', { name: 'Your name' }), 'Jaco P{Enter}')
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => fake.calls.some((call) => call.path === 'settings.update')).toBe(true)
  })

  it('puts the saved name back when the server rejects it, and says why', async () => {
    setup(
      {
        'settings.update': () => {
          throw new ORPCError('DEPENDENCY_UNAVAILABLE', {
            status: 503,
            message: 'Database unavailable',
          })
        },
      },
      SETTINGS,
    )
    await renderPanel()
    const name = page.getByRole('textbox', { name: 'Your name' })
    await userEvent.fill(name, 'Someone else')
    await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }))
    await expect.element(page.getByRole('alert')).toHaveTextContent('Database unavailable')
    await expect.element(name).toHaveValue('Jaco')
  })

  it('signed in but never onboarded: the first name saved creates the settings, keeping this device’s preferences', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestPreferences,
      JSON.stringify({ handedness: 'left', showIntervals: true }),
    )
    const fake = setup({ 'settings.save': fakeSaveSettings }, null)
    await renderPanel()
    await userEvent.fill(page.getByRole('textbox', { name: 'Your name' }), 'Paul')
    await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }))
    await expect
      .poll(() => fake.calls.find((call) => call.path === 'settings.save')?.input)
      .toMatchObject({ displayName: 'Paul', handedness: 'left', showIntervals: true })
    await expect.element(page.getByRole('status')).toHaveTextContent('Saved')
  })
})
