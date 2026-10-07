import type { GuestProgress } from '@repo/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { createFakeApi, TestProviders } from '@/test/api'
import { LessonPage } from '../LessonPage'
import { chordItem, lessonFixture, shapeItem } from './fixtures'

// Guest mode (no Privy app id in tests): progress goes to localStorage through
// the shared rules.
const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))

const stored = (): GuestProgress =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.guestProgress) ?? 'null')

async function renderLesson(lesson = lessonFixture()) {
  api.current = createFakeApi({}).api
  await render(
    <TestProviders>
      <LessonPage lesson={lesson} />
    </TestProviders>,
  )
  return lesson
}

const gotIt = () => userEvent.click(page.getByRole('button', { name: 'Got it' }))
const skip = () => userEvent.click(page.getByRole('button', { name: 'Skip' }))

afterEach(() => localStorage.clear())

describe('LessonPage', () => {
  it('shows one chord at a time, with lesson metadata secondary and a way Back to /', async () => {
    await renderLesson()
    await expect.element(page.getByRole('heading', { level: 2, name: 'G' })).toBeVisible()
    await expect.element(page.getByText('Lesson 1')).toBeVisible()
    await expect
      .element(page.getByRole('heading', { level: 1, name: 'First Chords' }))
      .toBeVisible()
    await expect.element(page.getByText('Chord 1 of 3')).toBeInTheDocument()
    await expect.element(page.getByRole('img', { name: 'G' })).toBeVisible()
    await expect.element(page.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/')
  })

  it('puts Skip on the left and Got it on the right, spanning the column', async () => {
    await renderLesson()
    // Measure the settled layout, after the buttons' entrance.
    await Promise.all(document.getAnimations().map((animation) => animation.finished))
    const skipBox = page.getByRole('button', { name: 'Skip' }).element().getBoundingClientRect()
    const gotItBox = page.getByRole('button', { name: 'Got it' }).element().getBoundingClientRect()
    expect(skipBox.left).toBeLessThan(gotItBox.left)
    const row = page
      .getByRole('button', { name: 'Skip' })
      .element()
      .closest('.lesson-control-enter')
      ?.parentElement?.getBoundingClientRect()
    expect(gotItBox.right).toBeCloseTo(row?.right ?? 0, 0)
  })

  it('Got it learns the chord; Skip only records the skip; the lesson is played but not completed', async () => {
    await renderLesson()
    await gotIt()
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    await skip()
    await expect.element(page.getByRole('heading', { level: 2, name: 'D' })).toBeVisible()
    await gotIt()

    await expect.element(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible()
    await expect
      .element(page.getByRole('link', { name: 'Back to lessons' }))
      .toHaveAttribute('href', '/')

    const progress = stored()
    expect(progress.items['chord:g-major']).toMatchObject({ playCount: 1, lastSkippedAt: null })
    expect(progress.items['chord:g-major']?.learnedAt).not.toBeNull()
    expect(progress.items['chord:c-major']).toMatchObject({ learnedAt: null, playCount: 0 })
    expect(progress.items['chord:c-major']?.lastSkippedAt).not.toBeNull()
    expect(progress.groups['first-chords']).toMatchObject({ playCount: 1, completedAt: null })
  })

  it('completes the lesson once every chord has been learned, across sessions', async () => {
    const lesson = await renderLesson()
    await gotIt()
    await skip()
    await gotIt()
    expect(stored().groups['first-chords']?.completedAt).toBeNull()

    document.body.innerHTML = ''
    await renderLesson(lesson)
    await gotIt()
    await gotIt()
    await gotIt()
    await expect.element(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible()
    expect(stored().groups['first-chords']).toMatchObject({ playCount: 2 })
    expect(stored().groups['first-chords']?.completedAt).not.toBeNull()
  })

  it('skipping the last chord still finishes the lesson, keeping the skip', async () => {
    await renderLesson(lessonFixture({ items: [chordItem('G', 'g-major')] }))
    await skip()
    await expect.element(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible()
    expect(stored().items['chord:g-major']).toMatchObject({ learnedAt: null })
    expect(stored().groups['first-chords']).toMatchObject({ playCount: 1, completedAt: null })
  })

  it('an empty lesson shows an unavailable state with Back, not a broken player', async () => {
    await renderLesson(lessonFixture({ items: [] }))
    await expect.element(page.getByText('This lesson isn’t available yet.')).toBeVisible()
    await expect.element(page.getByRole('link', { name: 'Back' })).toBeVisible()
    expect(page.getByRole('button', { name: 'Got it' }).query()).toBeNull()
  })

  it('an item without a diagram still shows its name', async () => {
    await renderLesson(lessonFixture({ items: [chordItem('E7', 'e7', false)] }))
    await expect.element(page.getByRole('heading', { level: 2, name: 'E7' })).toBeVisible()
    await expect.element(page.getByText('Diagram coming soon.')).toBeVisible()
  })

  it('draws the diagram for the player’s handedness', async () => {
    localStorage.setItem(STORAGE_KEYS.guestPreferences, JSON.stringify({ handedness: 'left' }))
    await renderLesson()
    await expect.element(page.getByRole('img', { name: 'G' })).toBeVisible()
    const tuning = [...document.querySelectorAll('[data-tuning]')]
    const x = (string: number) =>
      tuning
        .find((node) => node.getAttribute('data-tuning') === String(string))
        ?.getBoundingClientRect().left ?? 0
    // Left-handed: the low E (string 6) is drawn on the right.
    expect(x(6)).toBeGreaterThan(x(1))
  })

  it('shows a shape’s qualifiers from structured data, then its subtitle', async () => {
    await renderLesson(
      lessonFixture({
        items: [
          shapeItem('Major 7 Shell', 'shell-maj7-root-6', { rootString: 6 }),
          shapeItem('Major Triad', 'triad-major-top-first', {
            inversion: 1,
            stringSetStart: 1,
            stringSetEnd: 3,
            subtitle: 'Compact version',
          }),
        ],
      }),
    )
    await expect
      .element(page.getByRole('heading', { level: 2, name: 'Major 7 Shell' }))
      .toBeVisible()
    await expect.element(page.getByText('6th-string root', { exact: true })).toBeVisible()

    await gotIt()
    await expect.element(page.getByRole('heading', { level: 2, name: 'Major Triad' })).toBeVisible()
    const qualifier = page.getByText('1st inversion · Strings 1–3', { exact: true })
    const subtitle = page.getByText('Compact version', { exact: true })
    await expect.element(qualifier).toBeVisible()
    // Structured qualifiers first, descriptive subtitle after.
    expect(
      qualifier.element().compareDocumentPosition(subtitle.element()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows no qualifier line for a chord, even though its voicing has one', async () => {
    await renderLesson(
      lessonFixture({ items: [{ ...chordItem('C', 'c-major'), rootString: 5, inversion: 0 }] }),
    )
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    expect(page.getByText('5th-string root').query()).toBeNull()
  })
})
