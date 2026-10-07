import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { AuthGate } from '@/components/features/auth/AuthGate'
import { AppProviders } from '../AppProviders'

describe('AppProviders without Privy credentials', () => {
  it('renders the app (no PrivyProvider) and the gate explains auth is unavailable', async () => {
    await render(
      <AppProviders>
        <p>Public content</p>
        <AuthGate>
          <p>Private content</p>
        </AuthGate>
      </AppProviders>,
    )
    await expect.element(page.getByText('Public content')).toBeVisible()
    await expect.element(page.getByRole('heading', { name: 'Sign-in unavailable' })).toBeVisible()
    expect(page.getByText('Private content').query()).toBeNull()
  })
})
