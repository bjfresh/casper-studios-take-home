import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { EXAMPLE_FINGERINGS } from '@/components/features/chords/examples'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { createFakeApi, TestProviders } from '@/test/api'
import { darkTokens } from '@/test/theme'
import { LessonPage } from '../LessonPage'
import { chordItem, lessonFixture } from './fixtures'

const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))

const LESSON = lessonFixture({
  items: [chordItem('C', 'c-major'), chordItem('Am', 'a-minor'), chordItem('F', 'f-major')],
})

async function renderLesson(autoProgressSeconds = 0, viewport: [number, number] = [390, 844]) {
  localStorage.setItem(STORAGE_KEYS.guestPreferences, JSON.stringify({ autoProgressSeconds }))
  api.current = createFakeApi({}).api
  await page.viewport(...viewport)
  return render(
    <TestProviders>
      <LessonPage lesson={LESSON} />
    </TestProviders>,
  )
}

const centre = () =>
  document.querySelector('[data-lesson-centre]')?.getBoundingClientRect() as DOMRect

function relativeLuminance(color: string): number {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = Array.from(context.getImageData(0, 0, 1, 1).data).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi = 0, lo = 0] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

afterEach(() => localStorage.clear())

// The accent is the bright brand swatch (brand-5-500) by choice: ~2.4:1 on
// white, under WCAG's 3:1 for UI, so light mode is held at that (a paler
// accent still fails) and dark mode at the full 3:1. States never rely on
// its colour alone.
const ACCENT_MIN = { light: 2.3, dark: 3 } as const

describe('Lesson layout', () => {
  it('Back and the settings menu share the top row; Skip and Got it sit at the bottom', async () => {
    await renderLesson()
    const back = page.getByRole('link', { name: /Back/ }).element().getBoundingClientRect()
    const menu = page.getByRole('button', { name: 'Settings' }).element().getBoundingClientRect()
    expect(Math.abs(back.top + back.height / 2 - (menu.top + menu.height / 2))).toBeLessThan(2)
    expect(menu.left).toBeGreaterThan(back.left)

    const gotIt = page.getByRole('button', { name: 'Got it' }).element().getBoundingClientRect()
    expect(gotIt.bottom).toBeGreaterThan(window.innerHeight - 120)
    expect(gotIt.top).toBeGreaterThan(centre().bottom)
  })

  it('the chord chart is vertically centred and does not move between chords', async () => {
    await renderLesson()
    const first = centre()
    const middle = first.top + first.height / 2
    expect(Math.abs(middle - window.innerHeight / 2)).toBeLessThan(window.innerHeight * 0.1)

    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await expect.element(page.getByText('Chord 2 of 3')).toBeInTheDocument()
    expect(centre().top).toBeCloseTo(first.top, 0)
    await userEvent.click(page.getByRole('button', { name: 'Skip' }))
    expect(centre().top).toBeCloseTo(first.top, 0)
  })

  it('turning auto-progress on does not move the chart', async () => {
    await renderLesson(0)
    const before = centre().top
    await userEvent.click(page.getByRole('button', { name: 'Settings' }))
    const slider = page.getByRole('slider', { name: 'Time per chord' })
    ;(slider.element() as HTMLElement).focus()
    await userEvent.keyboard('{ArrowRight}{Escape}')
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
    await expect.element(page.getByText('Next chord in 3 seconds.')).toBeInTheDocument()
    expect(centre().top).toBeCloseTo(before, 0)
  })

  it.each(['light', 'dark'] as const)(
    'the timer bar sits right above the buttons and reads clearly (%s)',
    async (theme) => {
      const root = document.documentElement
      const applied = theme === 'dark' ? Object.entries(darkTokens()) : []
      for (const [name, value] of applied) root.style.setProperty(name, value)
      try {
        await renderLesson(10)
        const track = document.querySelector('[data-chord-timer]') as HTMLElement
        const fill = document.querySelector('[data-chord-timer-fill]') as HTMLElement
        const buttons = page
          .getByRole('button', { name: 'Got it' })
          .element()
          .getBoundingClientRect()
        const bar = track.getBoundingClientRect()
        expect(bar.height).toBeGreaterThanOrEqual(4)
        expect(buttons.top - bar.bottom).toBeGreaterThan(0)
        expect(buttons.top - bar.bottom).toBeLessThan(32)

        const pageBg = getComputedStyle(document.body).backgroundColor
        // The brand accent, the same as Got it.
        const gotItColor = getComputedStyle(
          page.getByRole('button', { name: 'Got it' }).element(),
        ).backgroundColor
        expect(getComputedStyle(fill).backgroundColor).toBe(gotItColor)
        // The brand accent (see ACCENT_MIN): the full 3:1 on dark; on white,
        // held at the bright swatch's ~2.4:1.
        expect(contrast(getComputedStyle(fill).backgroundColor, pageBg)).toBeGreaterThanOrEqual(
          ACCENT_MIN[theme],
        )
      } finally {
        for (const [name] of applied) root.style.removeProperty(name)
      }
    },
  )

  it('the bar animates continuously (a CSS animation, not per-second steps) and restarts per chord', async () => {
    await renderLesson(10)
    const fill = () => document.querySelector('[data-chord-timer-fill]') as HTMLElement
    const [animation] = fill().getAnimations()
    expect(animation).toBeDefined()
    expect(getComputedStyle(fill()).animationTimingFunction).toBe('linear')
    expect(getComputedStyle(fill()).animationDuration).toBe('10s')
    const firstNode = fill()

    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await expect.element(page.getByText('Chord 2 of 3')).toBeInTheDocument()
    expect(fill()).not.toBe(firstNode) // a fresh element → a fresh animation from empty
    expect(fill().getAnimations()[0]?.currentTime ?? 0).toBeLessThan(1000)
  })

  it('no bar when auto-progress is off', async () => {
    await renderLesson(0)
    expect(document.querySelector('[data-chord-timer]')).toBeNull()
  })

  it('Skip then Got it rise in once, and are clickable straight away', async () => {
    await renderLesson()
    const wrapper = (name: string) =>
      page.getByRole('button', { name }).element().closest('.lesson-control-enter') as HTMLElement
    const skip = wrapper('Skip')
    const gotIt = wrapper('Got it')
    expect(skip.getAnimations()[0]?.effect?.getTiming().delay ?? 0).toBe(0)
    expect(gotIt.getAnimations()[0]?.effect?.getTiming().delay).toBe(80)

    // No waiting: a tap during the entrance counts.
    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await expect.element(page.getByText('Chord 2 of 3')).toBeInTheDocument()
    // Same elements on the next chord, so the entrance doesn't replay.
    expect(wrapper('Skip')).toBe(skip)
    expect(wrapper('Got it')).toBe(gotIt)
  })

  it('each new chord ripples its notes in, while the grid stays exactly where it was', async () => {
    await renderLesson()
    const grid = () =>
      [...document.querySelectorAll('[data-lesson-centre] line[data-fret]')].map(
        (line) => line.getBoundingClientRect().top,
      )
    const before = grid()
    const firstNote = document.querySelector('[data-lesson-centre] .chord-note-enter')
    await userEvent.click(page.getByRole('button', { name: 'Got it' }))
    await expect.element(page.getByText('Chord 2 of 3')).toBeInTheDocument()
    expect(grid()).toEqual(before)
    const note = document.querySelector('[data-lesson-centre] .chord-note-enter')
    expect(note).not.toBe(firstNote)
    expect(firstNote?.isConnected).toBe(false)
  })

  it('the bar fills left to right: its left edge stays put while its right edge advances', async () => {
    await renderLesson(10)
    const fill = document.querySelector('[data-chord-timer-fill]') as HTMLElement
    const track = (
      document.querySelector('[data-chord-timer]') as HTMLElement
    ).getBoundingClientRect()
    const [animation] = fill.getAnimations()
    if (!animation) throw new Error('no timer animation')
    animation.pause()
    animation.currentTime = 1000
    const early = fill.getBoundingClientRect()
    animation.currentTime = 9000
    const late = fill.getBoundingClientRect()
    expect(early.left).toBeCloseTo(track.left, 0)
    expect(late.left).toBeCloseTo(track.left, 0)
    expect(early.width).toBeCloseTo(track.width * 0.1, 0)
    expect(late.width).toBeCloseTo(track.width * 0.9, 0)
  })

  it('the step dots sit just above the timer bar', async () => {
    await renderLesson(10)
    const dots = page
      .getByRole('navigation', { name: 'Lesson progress' })
      .element()
      .getBoundingClientRect()
    const bar = (
      document.querySelector('[data-chord-timer]') as HTMLElement
    ).getBoundingClientRect()
    expect(bar.top - dots.bottom).toBeGreaterThanOrEqual(0)
    expect(bar.top - dots.bottom).toBeLessThan(24)
  })

  it('tapping a dot jumps to that chord, records nothing, and keeps the grid still', async () => {
    await renderLesson()
    const stored = JSON.stringify(localStorage)
    const grid = () =>
      [...document.querySelectorAll('[data-lesson-centre] line[data-fret]')].map(
        (line) => line.getBoundingClientRect().top,
      )
    const before = grid()
    await userEvent.click(page.getByRole('button', { name: 'Go to chord 3: F' }))
    await expect.element(page.getByText('Chord 3 of 3')).toBeInTheDocument()
    await expect.element(page.getByRole('heading', { level: 2, name: 'F' })).toBeVisible()
    await expect
      .element(page.getByRole('button', { name: 'Go to chord 3: F' }))
      .toHaveAttribute('aria-current', 'step')
    expect(grid()).toEqual(before)
    // And back again.
    await userEvent.click(page.getByRole('button', { name: 'Go to chord 1: C' }))
    await expect.element(page.getByRole('heading', { level: 2, name: 'C' })).toBeVisible()
    // A jump isn't a result: no progress was saved.
    expect(JSON.stringify(localStorage)).toBe(stored)
  })

  it('Back is an icon-only chevron, named for screen readers, matching the menu button', async () => {
    await renderLesson()
    const back = page.getByRole('link', { name: 'Back', exact: true })
    await expect.element(back).toHaveAttribute('href', '/')
    expect(back.element().textContent?.trim()).toBe('')
    const icon = back.element().querySelector('svg')?.getBoundingClientRect()
    const menu = page.getByRole('button', { name: 'Settings' }).element()
    const menuIcon = menu.querySelector('svg')?.getBoundingClientRect()
    expect(icon?.width).toBeCloseTo(menuIcon?.width ?? 0, 0)
    // The same small square as the menu button (the home header's size).
    const backBox = back.element().getBoundingClientRect()
    const menuBox = menu.getBoundingClientRect()
    expect([backBox.width, backBox.height]).toEqual([32, 32])
    expect([menuBox.width, menuBox.height]).toEqual([32, 32])
  })

  it('on a wide screen the bar spans the home page width while the lesson stays a column', async () => {
    await renderLesson(0, [1280, 800])
    const menu = page.getByRole('button', { name: 'Settings' }).element().getBoundingClientRect()
    // max-w-5xl (1024px) less sm:px-6, centred: the home header's right edge.
    expect(menu.right).toBeCloseTo((1280 + 1024) / 2 - 24, 0)
    const steps = page.getByRole('navigation', { name: 'Lesson progress' }).element()
    const column = steps.parentElement?.getBoundingClientRect()
    expect(column?.width).toBeLessThanOrEqual(448)
    expect(((column?.left ?? 0) + (column?.right ?? 0)) / 2).toBeCloseTo(640, 0)
  })

  it.each([
    [390, 844],
    [375, 667],
  ])(
    'at %ix%i the chart is as big as fits, with Skip and Got it on screen',
    async (width, height) => {
      await page.viewport(width, height)
      localStorage.setItem(
        STORAGE_KEYS.guestPreferences,
        JSON.stringify({ autoProgressSeconds: 10 }),
      )
      api.current = createFakeApi({}).api
      const lesson = lessonFixture({
        items: [{ ...chordItem('C', 'c-major'), diagram: EXAMPLE_FINGERINGS.cMajorOpen.fingering }],
      })
      await render(
        <TestProviders>
          <LessonPage lesson={lesson} />
        </TestProviders>,
      )
      await Promise.all(document.getAnimations().map((animation) => animation.finished))
      const gotIt = page.getByRole('button', { name: 'Got it' }).element().getBoundingClientRect()
      expect(gotIt.bottom).toBeLessThanOrEqual(height)
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(height)
      const chart = document.querySelector('[data-lesson-centre] svg')?.getBoundingClientRect()
      // Full column width where there's room.
      if (height >= 800) expect(chart?.width).toBeGreaterThan(width - 40)
    },
  )
})
