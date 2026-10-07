import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { RegisteredModals } from '@/components/layout/RegisteredModals'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import type { Auth } from '@/hooks/use-auth'
import { createFakeApi, TestProviders } from '@/test/api'
import { LessonPage } from '../LessonPage'
import { chordItem, lessonFixture } from './fixtures'

const api = vi.hoisted(() => ({ current: null as unknown }))
const auth = vi.hoisted(() => ({ isAuthenticated: false, isConfigured: true }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({
    isReady: true,
    isAuthenticated: auth.isAuthenticated,
    isConfigured: auth.isConfigured,
    userId: auth.isAuthenticated ? 'did:privy:alice' : null,
    login: () => {},
  }),
}))

// A one-chord lesson: one Got it finishes it.
const LESSON = lessonFixture({ items: [chordItem('G', 'g-major')] })

async function finishLesson() {
  api.current = createFakeApi({ 'lessons.progress': () => [] }).api
  const screen = await render(
    <TestProviders>
      <LessonPage lesson={LESSON} />
      <RegisteredModals />
    </TestProviders>,
  )
  await userEvent.click(page.getByRole('button', { name: 'Got it' }))
  await expect.element(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible()
  return screen
}

const prompt = () => page.getByRole('region', { name: 'Keep your progress' })

afterEach(() => {
  auth.isAuthenticated = false
  auth.isConfigured = true
  localStorage.clear()
})

describe('Sign-up prompt on the lesson-complete screen', () => {
  it('invites a guest after their first lesson, set well apart from the lesson navigation', async () => {
    await finishLesson()
    await expect.element(prompt()).toBeVisible()
    await expect
      .element(prompt().getByRole('button', { name: 'Sign up for free' }))
      .toHaveClass(/bg-control/)
    const navigation = page.getByRole('link', { name: 'Back to lessons' }).element()
    const gap =
      prompt().element().getBoundingClientRect().top - navigation.getBoundingClientRect().bottom
    expect(gap).toBeGreaterThanOrEqual(40)
  })

  it('Sign up for free opens the set-up form (onboarding), which leads to creating the account', async () => {
    await finishLesson()
    await userEvent.click(prompt().getByRole('button', { name: 'Sign up for free' }))
    await expect.element(page.getByRole('dialog', { name: 'Let’s play' })).toBeVisible()
  })

  it('has no dismiss button, and the button sits on the right of the card', async () => {
    await finishLesson()
    expect(prompt().getByRole('button').elements()).toHaveLength(1)
    const card = prompt().element().getBoundingClientRect()
    const button = prompt().getByRole('button').element().getBoundingClientRect()
    // Right-aligned: flush with the card's right padding, not its left.
    expect(card.right - button.right).toBeLessThan(button.left - card.left)
  })

  it('only after the FIRST lesson: a guest who has finished one before sees no prompt', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestProgress,
      JSON.stringify({
        version: 1,
        groups: { 'second-lesson': { completedAt: null, lastPlayedAt: 1, playCount: 1 } },
        items: {},
      }),
    )
    await finishLesson()
    expect(prompt().query()).toBeNull()
  })

  it('not for a signed-in player', async () => {
    auth.isAuthenticated = true
    await finishLesson()
    expect(prompt().query()).toBeNull()
  })

  it('not where sign-in isn’t configured (it couldn’t work)', async () => {
    auth.isConfigured = false
    await finishLesson()
    expect(prompt().query()).toBeNull()
  })
})
