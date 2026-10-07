import { describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import type { Auth } from '@/hooks/use-auth'
import { createFakeApi, TestProviders } from '@/test/api'
import { LessonGrid } from '../LessonGrid'
import { lessonFixture } from './fixtures'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({ isReady: true, isAuthenticated: true, isConfigured: true }),
}))

describe('LessonGrid, signed in', () => {
  it('uses the account’s progress, not this browser’s', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestProgress,
      JSON.stringify({
        version: 1,
        groups: { 'first-chords': { completedAt: null, lastPlayedAt: Date.now(), playCount: 1 } },
        items: {},
      }),
    )
    const fake = createFakeApi({
      'public.lessons.list': () => [lessonFixture()],
      'lessons.progress': () => [
        {
          slug: 'first-chords',
          completedAt: null,
          lastPlayedAt: new Date(Date.now() - 86_400_000),
          playCount: 4,
        },
      ],
      'account.me': () => ({
        id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e',
        email: null,
        role: 'user',
        settings: null,
      }),
    })
    api.current = fake.api
    await render(
      <TestProviders>
        <LessonGrid />
      </TestProviders>,
    )
    await expect
      .element(page.getByRole('listitem', { name: 'First Chords' }).getByText('Yesterday'))
      .toBeVisible()
    localStorage.clear()
  })
})
