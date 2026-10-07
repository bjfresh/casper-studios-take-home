import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { LessonSteps } from '../LessonSteps'

const STEPS = ['G', 'C', 'D', 'Em']

describe('LessonSteps', () => {
  it('one dot per step, only the current one filled, all the same size', async () => {
    const screen = await render(<LessonSteps current={1} steps={STEPS} onSelect={() => {}} />)
    const dots = [...screen.container.querySelectorAll('button > span')]
    expect(dots).toHaveLength(4)
    expect(dots.map((dot) => dot.hasAttribute('data-current'))).toEqual([false, true, false, false])
    expect(new Set(dots.map((dot) => dot.getBoundingClientRect().width)).size).toBe(1)
  })

  it('each dot is a named button; the current one is marked as the current step', async () => {
    await render(<LessonSteps current={1} steps={STEPS} onSelect={() => {}} />)
    await expect.element(page.getByRole('navigation', { name: 'Lesson progress' })).toBeVisible()
    await expect
      .element(page.getByRole('button', { name: 'Go to chord 2: C' }))
      .toHaveAttribute('aria-current', 'step')
    await expect
      .element(page.getByRole('button', { name: 'Go to chord 3: D' }))
      .not.toHaveAttribute('aria-current')
  })

  it('tapping a dot selects its step; tapping the current one does nothing', async () => {
    const onSelect = vi.fn()
    await render(<LessonSteps current={1} steps={STEPS} onSelect={onSelect} />)
    await userEvent.click(page.getByRole('button', { name: 'Go to chord 4: Em' }))
    expect(onSelect).toHaveBeenCalledWith(3)
    await userEvent.click(page.getByRole('button', { name: 'Go to chord 2: C' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('works from the keyboard', async () => {
    const onSelect = vi.fn()
    await render(<LessonSteps current={0} steps={STEPS} onSelect={onSelect} />)
    ;(page.getByRole('button', { name: 'Go to chord 3: D' }).element() as HTMLElement).focus()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('tap targets are 44px tall and at least 32px wide', async () => {
    await render(<LessonSteps current={0} steps={STEPS} onSelect={() => {}} />)
    for (const button of page.getByRole('button').elements()) {
      const box = button.getBoundingClientRect()
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(32)
    }
  })

  it('disabled while saving', async () => {
    const onSelect = vi.fn()
    await render(<LessonSteps current={0} steps={STEPS} onSelect={onSelect} disabled />)
    await expect.element(page.getByRole('button', { name: 'Go to chord 2: C' })).toBeDisabled()
  })

  it('announces each new step, and keeps its footprint whichever is current', async () => {
    const screen = await render(<LessonSteps current={0} steps={STEPS} onSelect={() => {}} />)
    const nav = page.getByRole('navigation').element()
    const before = nav.getBoundingClientRect()
    await screen.rerender(<LessonSteps current={2} steps={STEPS} onSelect={() => {}} />)
    expect(screen.container.querySelector('[aria-live="polite"]')?.textContent).toBe('Chord 3 of 4')
    const after = nav.getBoundingClientRect()
    expect([after.width, after.height]).toEqual([before.width, before.height])
  })
})
