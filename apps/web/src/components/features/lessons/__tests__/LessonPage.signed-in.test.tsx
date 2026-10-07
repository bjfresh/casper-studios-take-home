import { ORPCError } from '@orpc/client'
import { DEFAULT_PREFERENCES } from '@repo/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { AccountSync } from '@/components/layout/AccountSync'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import type { Auth } from '@/hooks/use-auth'
import { createFakeApi, TestProviders } from '@/test/api'
import { LessonPage } from '../LessonPage'
import { lessonFixture } from './fixtures'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): Partial<Auth> => ({
    isReady: true,
    isAuthenticated: true,
    isConfigured: true,
    userId: 'did:privy:alice',
    email: 'alice@example.com',
  }),
}))

const ME = {
  id: '6c9f3f4e-0d5c-4c39-8d0e-5e6a7b8c9d0e',
  email: null,
  role: 'user',
  settings: { ...DEFAULT_PREFERENCES, displayName: 'Alice' },
}

const USER = 'did:privy:alice'

async function play(fake: ReturnType<typeof createFakeApi>, lesson = lessonFixture()) {
  api.current = fake.api
  await render(
    <TestProviders>
      {/* The sync runs from the root layout in the app. */}
      <AccountSync />
      <LessonPage lesson={lesson} />
    </TestProviders>,
  )
  return lesson
}

const outbox = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.progressOutbox) ?? '[]')

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('LessonPage, signed in', () => {
  it('queues each result and the finish on this device, then syncs them to the API in order, by id', async () => {
    const lesson = lessonFixture()
    const fake = createFakeApi({
      'account.me': () => ME,
      'lessons.recordItem': () => ({ ok: true }),
      'lessons.finish': () => ({
        slug: lesson.slug,
        completedAt: null,
        lastPlayedAt: new Date(),
        playCount: 1,
      }),
      'lessons.progress': () => [],
    })
    await play(fake, lesson)
    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await userEvent.click(page.getByRole('button', { name: 'Skip' }))
    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await expect.element(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible()

    const writes = () =>
      fake.calls.filter(
        (call) => call.path === 'lessons.recordItem' || call.path === 'lessons.finish',
      )
    await expect.poll(writes).toEqual([
      {
        path: 'lessons.recordItem',
        input: {
          groupId: lesson.id,
          item: { type: 'chord', id: lesson.items[0]?.id },
          result: 'got_it',
        },
      },
      {
        path: 'lessons.recordItem',
        input: {
          groupId: lesson.id,
          item: { type: 'chord', id: lesson.items[1]?.id },
          result: 'skipped',
        },
      },
      {
        path: 'lessons.recordItem',
        input: {
          groupId: lesson.id,
          item: { type: 'chord', id: lesson.items[2]?.id },
          result: 'got_it',
        },
      },
      { path: 'lessons.finish', input: { groupId: lesson.id } },
    ])
    // Removed from the device once the server has each one.
    await expect.poll(() => localStorage.getItem(STORAGE_KEYS.progressOutbox)).toBeNull()
  })

  it('never waits on the network: with the API down the lesson moves on and the plays stay queued', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fake = createFakeApi({
      'account.me': () => ME,
      'lessons.progress': () => [],
      'lessons.recordItem': () => {
        throw new ORPCError('DEPENDENCY_UNAVAILABLE', {
          status: 503,
          message: 'Database unavailable',
        })
      },
    })
    const lesson = await play(fake)
    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    // On to the second chord, no error shown.
    await expect
      .element(page.getByRole('heading', { level: 2, name: lesson.items[1]?.title }))
      .toBeVisible()
    expect(page.getByRole('alert').query()).toBeNull()
    await expect
      .poll(() => fake.calls.some((call) => call.path === 'lessons.recordItem'))
      .toBe(true)
    expect(outbox()).toMatchObject([
      { type: 'item', userId: USER, groupSlug: lesson.slug, input: { result: 'got_it' } },
    ])
  })

  it('a play the server can never accept is dropped, so it can’t block the ones after it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let first = true
    const fake = createFakeApi({
      'account.me': () => ME,
      'lessons.progress': () => [],
      'lessons.recordItem': () => {
        if (first) {
          first = false
          throw new ORPCError('NOT_FOUND', { status: 404, message: 'No such lesson' })
        }
        return { ok: true }
      },
    })
    await play(fake)
    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await expect
      .poll(() => fake.calls.filter((call) => call.path === 'lessons.recordItem').length)
      .toBe(2)
    await expect.poll(() => localStorage.getItem(STORAGE_KEYS.progressOutbox)).toBeNull()
  })
})
