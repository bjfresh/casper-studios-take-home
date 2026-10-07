import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { createFakeApi, TestProviders } from '@/test/api'
import { LessonPage } from '../LessonPage'
import { lessonFixture } from './fixtures'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))

afterEach(() => localStorage.clear())

const insideLabels = () =>
  [...document.querySelectorAll('[data-marker] [data-label="inside"]')].map(
    (node) => node.textContent,
  )

describe('changing preferences during a lesson', () => {
  it('redraws the current chord in place, without losing the lesson position', async () => {
    const lesson = lessonFixture()
    for (const item of lesson.items) {
      item.diagram = {
        mutedStrings: [6],
        positions: [{ string: 5, fret: 3, isRoot: true, finger: 3, note: 'C', interval: '1' }],
      }
    }
    api.current = createFakeApi({}).api
    await render(
      <TestProviders>
        <LessonPage lesson={lesson} />
      </TestProviders>,
    )

    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await expect.element(page.getByText('Chord 2 of 3')).toBeInTheDocument()
    expect(insideLabels()).toEqual(['C']) // default: note names

    await userEvent.click(page.getByRole('button', { name: 'Settings' }))
    await userEvent.click(page.getByRole('radio', { name: 'Finger numbers' }))
    await userEvent.click(page.getByRole('checkbox', { name: 'Interval labels' }))
    await userEvent.click(page.getByRole('switch', { name: 'Handedness: Right' }))

    // Immediately, behind the open menu: fingers inside, intervals below, mirrored.
    await expect.poll(insideLabels).toEqual(['3'])
    expect(document.querySelectorAll('[data-interval]')).toHaveLength(1)
    const x = (string: number) =>
      document.querySelector(`[data-tuning="${string}"]`)?.getBoundingClientRect().left ?? 0
    expect(x(6)).toBeGreaterThan(x(1))
    // Still on the same chord.
    await expect.element(page.getByText('Chord 2 of 3')).toBeInTheDocument()
  })

  it('says the diagram is in standard tuning when the player tunes differently', async () => {
    localStorage.setItem(
      'casper:guest-preferences',
      JSON.stringify({ tuning: ['D', 'A', 'D', 'G', 'B', 'E'] }),
    )
    api.current = createFakeApi({}).api
    await render(
      <TestProviders>
        <LessonPage lesson={lessonFixture()} />
      </TestProviders>,
    )
    await expect.element(page.getByText('Shown in standard tuning (E A D G B E).')).toBeVisible()
  })
})
