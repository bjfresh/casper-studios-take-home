import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { guestPreferences } from '@/data/guest-preferences'
import { createFakeApi, TestProviders } from '@/test/api'
import { LessonPage } from '../LessonPage'
import { chordItem, lessonFixture } from './fixtures'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))

// C → Am → F → G, as in the spec.
const LESSON = lessonFixture({
  items: [
    chordItem('C', 'c-major'),
    chordItem('Am', 'a-minor'),
    chordItem('F', 'f-major'),
    chordItem('G', 'g-major'),
  ],
})

function setSeconds(seconds: number) {
  act(() => guestPreferences.write({ ...guestPreferences.read(), autoProgressSeconds: seconds }))
}

const current = () => document.querySelector('#current-item')?.textContent
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

async function renderLesson(seconds: number) {
  localStorage.setItem(
    STORAGE_KEYS.guestPreferences,
    JSON.stringify({ autoProgressSeconds: seconds }),
  )
  api.current = createFakeApi({}).api
  return render(
    <TestProviders>
      <LessonPage lesson={LESSON} />
    </TestProviders>,
  )
}

beforeEach(() => {
  // Only the timers the lesson uses; user events and rendering keep real time.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('auto-progress', () => {
  it('Off: no timer, no progress bar, no movement', async () => {
    await renderLesson(0)
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    expect(document.querySelector('[data-chord-timer]')).toBeNull()
    advance(60_000)
    expect(current()).toBe('C')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cycles C → Am → F → G → C at the chosen pace, with a progress bar', async () => {
    await renderLesson(10)
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    expect(document.querySelector('[data-chord-timer]')).not.toBeNull()

    advance(9_999)
    expect(current()).toBe('C')
    const seen: Array<string | null | undefined> = []
    for (let i = 0; i < 4; i += 1) {
      advance(i === 0 ? 1 : 10_000)
      seen.push(current())
    }
    expect(seen).toEqual(['Am', 'F', 'G', 'C'])
    expect(vi.getTimerCount()).toBe(1)
  })

  it('advancing on time records nothing: it isn’t "Got it"', async () => {
    await renderLesson(3)
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    advance(3_000)
    advance(3_000)
    expect(current()).toBe('F')
    expect(localStorage.getItem(STORAGE_KEYS.guestProgress)).toBeNull()
  })

  it('manual navigation resets the countdown for the new chord', async () => {
    await renderLesson(5)
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    advance(4_000)
    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await expect.element(page.getByRole('heading', { level: 2, name: 'Am' })).toBeVisible()

    advance(4_000)
    expect(current()).toBe('Am') // a fresh 5s, not the 1s left over
    advance(1_000)
    expect(current()).toBe('F')
    expect(vi.getTimerCount()).toBe(1)
  })

  it('changing the duration restarts the timer with the new value; Off stops it', async () => {
    await renderLesson(10)
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    advance(8_000)
    setSeconds(3)
    advance(2_999)
    expect(current()).toBe('C')
    advance(1)
    expect(current()).toBe('Am')

    setSeconds(0)
    expect(vi.getTimerCount()).toBe(0)
    advance(60_000)
    expect(current()).toBe('Am')
    expect(document.querySelector('[data-chord-timer]')).toBeNull()
  })

  it('leaves no timer behind when the lesson unmounts', async () => {
    const screen = await renderLesson(5)
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    expect(vi.getTimerCount()).toBe(1)
    await screen.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('puts the progress bar directly above the Skip / Got it row', async () => {
    await renderLesson(10)
    const bar = document.querySelector('[data-chord-timer]')?.getBoundingClientRect()
    const skip = page.getByRole('button', { name: 'Skip' }).element().getBoundingClientRect()
    expect(bar?.bottom).toBeLessThanOrEqual(skip.top)
    expect(skip.top - (bar?.bottom ?? 0)).toBeLessThan(40)
  })
})
