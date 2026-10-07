import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { createFakeApi, TestProviders } from '@/test/api'
import { LessonGrid } from '../LessonGrid'
import { lessonFixture } from './fixtures'

// Guest mode by default: the test env has no Privy app id, so useAuth() is
// ready and signed out, exactly like a visitor without an account.
const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))

const LESSONS = [
  lessonFixture({ slug: 'the-c-family', name: 'The C Family', lessonNumber: 3, sortOrder: 30 }),
  lessonFixture({ slug: 'first-chords', name: 'First Chords', lessonNumber: 1, sortOrder: 10 }),
  lessonFixture({ slug: 'first-minors', name: 'First Minors', lessonNumber: 2, sortOrder: 20 }),
]

async function renderGrid(procedures: Parameters<typeof createFakeApi>[0] = {}) {
  const fake = createFakeApi({ 'public.lessons.list': () => LESSONS, ...procedures })
  api.current = fake.api
  await render(
    <TestProviders>
      <LessonGrid />
    </TestProviders>,
  )
  return fake
}

afterEach(async () => {
  localStorage.clear()
  await page.viewport(414, 896)
})

describe('LessonGrid', () => {
  it('lists lessons by sortOrder: number, name, last played, and Play', async () => {
    await renderGrid()
    await expect.element(page.getByRole('list', { name: 'Lessons' })).toBeVisible()
    const names = page
      .getByRole('heading', { level: 2 })
      .elements()
      .map((heading) => heading.textContent)
    expect(names).toEqual(['First Chords', 'First Minors', 'The C Family'])

    const card = page.getByRole('listitem', { name: 'First Chords' })
    await expect.element(card.getByText('Lesson 1')).toBeVisible()
    await expect.element(card.getByText('Never played')).toBeVisible()
    await expect
      .element(card.getByRole('link', { name: 'Play First Chords' }))
      .toHaveAttribute('href', '/lesson/first-chords')
  })

  it('guests: shows last played from this browser, never a raw date', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestProgress,
      JSON.stringify({
        version: 1,
        groups: {
          'first-chords': { completedAt: null, lastPlayedAt: Date.now(), playCount: 1 },
          'first-minors': {
            completedAt: null,
            lastPlayedAt: Date.now() - 3 * 86_400_000,
            playCount: 2,
          },
        },
        items: {},
      }),
    )
    await renderGrid()
    await expect
      .element(page.getByRole('listitem', { name: 'First Chords' }).getByText('Today'))
      .toBeVisible()
    await expect
      .element(page.getByRole('listitem', { name: 'First Minors' }).getByText('3 days ago'))
      .toBeVisible()
  })

  it('a played lesson gets the success badge; a never-played one stays outline', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestProgress,
      JSON.stringify({
        version: 1,
        groups: { 'first-chords': { completedAt: null, lastPlayedAt: Date.now(), playCount: 1 } },
        items: {},
      }),
    )
    await renderGrid()
    const played = page.getByRole('listitem', { name: 'First Chords' })
    const unplayed = page.getByRole('listitem', { name: 'First Minors' })
    await expect.element(played.getByText('Today', { exact: true })).toBeVisible()
    const badgeOf = (card: typeof played, text: string) =>
      card.getByText(text, { exact: true }).element().closest('[class*="rounded"]') as Element
    expect(badgeOf(played, 'Today').className).toContain('bg-success/10')
    expect(badgeOf(unplayed, 'Never played').className).toContain('bg-transparent')
    expect(badgeOf(unplayed, 'Never played').className).not.toContain('bg-success')
  })

  it('the badge says what the date is about, for screen readers', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestProgress,
      JSON.stringify({
        version: 1,
        groups: { 'first-chords': { completedAt: null, lastPlayedAt: Date.now(), playCount: 1 } },
        items: {},
      }),
    )
    await renderGrid()
    const card = page.getByRole('listitem', { name: 'First Chords' })
    await expect.element(card.getByText('Last played today')).toBeInTheDocument()
  })

  it('is one column on phones and three on larger screens', async () => {
    await page.viewport(390, 800)
    await renderGrid()
    const columns = () =>
      getComputedStyle(
        page.getByRole('list', { name: 'Lessons' }).element(),
      ).gridTemplateColumns.split(' ').length
    await expect.poll(columns).toBe(1)
    await page.viewport(1024, 800)
    await expect.poll(columns).toBe(3)
  })
})
