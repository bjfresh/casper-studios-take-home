import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { createFakeApi, TestProviders } from '@/test/api'
import { LessonPage } from '../LessonPage'
import { chordItem, lessonFixture } from './fixtures'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))

const FIRST = lessonFixture({ items: [chordItem('G', 'g-major')] })
const SECOND = lessonFixture({
  slug: 'first-minors',
  name: 'First Minors',
  lessonNumber: 2,
  sortOrder: 20,
})
const THIRD = lessonFixture({ slug: 'power-chords', lessonNumber: 3, sortOrder: 30 })

async function finish(lesson = FIRST, list: unknown = () => [THIRD, FIRST, SECOND]) {
  api.current = createFakeApi({ 'public.lessons.list': list as () => unknown }).api
  await render(
    <TestProviders>
      <LessonPage lesson={{ ...lesson, items: [chordItem('G', 'g-major')] }} />
    </TestProviders>,
  )
  await userEvent.click(page.getByRole('button', { name: 'Got it' }))
  await expect.element(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible()
}

afterEach(() => localStorage.clear())

describe('Lesson complete: Next lesson', () => {
  it('links to the next lesson in curriculum order, as the primary action', async () => {
    await finish()
    const next = page.getByRole('link', { name: 'Next lesson' })
    await expect.element(next).toHaveAttribute('href', '/lesson/first-minors')
    await expect.element(next).toHaveClass(/bg-control/)
    expect(page.getByRole('link', { name: 'Back to lessons' }).query()).toBeNull()
  })

  it('after the last lesson there is no next: Back to lessons instead', async () => {
    await finish(THIRD)
    await expect
      .element(page.getByRole('link', { name: 'Back to lessons' }))
      .toHaveAttribute('href', '/')
    expect(page.getByRole('link', { name: 'Next lesson' }).query()).toBeNull()
  })

  it('if the lesson list can’t load, still offers a way on: Back to lessons', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await finish(FIRST, () => {
      throw new Error('down')
    })
    await expect.element(page.getByRole('link', { name: 'Back to lessons' })).toBeVisible()
  })
})
