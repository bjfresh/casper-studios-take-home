import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ChordDiagram } from '../ChordDiagram'
import { EXAMPLE_FINGERINGS } from '../examples'

const { cMajorOpen, gMajorOpen, bMajorBarre7, bassCRootFifthOctave, bass5FRootFifthOctave } =
  EXAMPLE_FINGERINGS

function xOf(element: Element | null) {
  if (!element) throw new Error('missing element')
  const box = element.getBoundingClientRect()
  return box.left + box.width / 2
}

describe('ChordDiagram', () => {
  it('is an image named by its title and described in words', async () => {
    await render(<ChordDiagram {...cMajorOpen} />)
    const image = page.getByRole('img', { name: 'C major' })
    await expect.element(image).toHaveAccessibleDescription(/A string: 3rd fret, finger 3, root/)
  })

  it('near the nut: draws the nut and no fret number', async () => {
    const screen = await render(<ChordDiagram {...cMajorOpen} />)
    expect(screen.container.querySelector('[data-testid="nut"]')).not.toBeNull()
    expect(screen.container.querySelector('[data-testid="fret-number"]')).toBeNull()
  })

  it('up the neck: no nut, and the first fret labelled beside the grid instead', async () => {
    const screen = await render(<ChordDiagram {...bMajorBarre7} />)
    expect(screen.container.querySelector('[data-testid="nut"]')).toBeNull()
    expect(screen.container.querySelector('[data-testid="fret-number"]')?.textContent).toBe('7fr')
    expect(screen.container.querySelector('[data-fret-number]')?.textContent).toBe('7')
  })

  it('rings every root (and only roots), including an open root', async () => {
    const screen = await render(<ChordDiagram {...gMajorOpen} />)
    expect(screen.container.querySelectorAll('[data-root="true"]')).toHaveLength(3)
  })

  it('aligns open and muted indicators with their strings', async () => {
    const screen = await render(<ChordDiagram {...cMajorOpen} />)
    const container = screen.container
    const stringLine = (n: number) => container.querySelector(`line[data-string="${n}"]`)
    const muted = container.querySelector('[data-indicator="muted"][data-string="6"]')
    const open = container.querySelector('[data-indicator="open"][data-string="1"]')
    expect(xOf(muted)).toBeCloseTo(xOf(stringLine(6)), 0)
    expect(xOf(open)).toBeCloseTo(xOf(stringLine(1)), 0)
  })

  it('left-handed: mirrors strings, indicators and tuning labels', async () => {
    const right = await render(<ChordDiagram {...cMajorOpen} showTuning />)
    const rightLowE = xOf(right.container.querySelector('[data-tuning="6"]'))
    const rightHighE = xOf(right.container.querySelector('[data-tuning="1"]'))
    expect(rightLowE).toBeLessThan(rightHighE)
    const rightMuted = xOf(right.container.querySelector('[data-indicator="muted"]'))
    await right.unmount()

    const left = await render(<ChordDiagram {...cMajorOpen} handedness="left" showTuning />)
    const leftLowE = xOf(left.container.querySelector('[data-tuning="6"]'))
    const leftHighE = xOf(left.container.querySelector('[data-tuning="1"]'))
    expect(leftLowE).toBeGreaterThan(leftHighE)
    // The muted low E moved to the other side with its string.
    expect(xOf(left.container.querySelector('[data-indicator="muted"]'))).toBeGreaterThan(
      rightMuted,
    )
  })

  it('draws lower strings thicker', async () => {
    const screen = await render(<ChordDiagram {...cMajorOpen} />)
    const width = (n: number) =>
      Number(
        screen.container.querySelector(`line[data-string="${n}"]`)?.getAttribute('stroke-width'),
      )
    expect(width(6)).toBeGreaterThan(width(3))
    expect(width(3)).toBeGreaterThan(width(1))
  })

  it.each([
    ['4-string bass', bassCRootFifthOctave, 4, 'E A D G'],
    ['5-string bass', bass5FRootFifthOctave, 5, 'B E A D G'],
  ])('%s: one string per tuning note, labelled in order', async (_, example, count, labels) => {
    const screen = await render(<ChordDiagram {...example} showTuning />)
    expect(screen.container.querySelectorAll('line[data-string]')).toHaveLength(count)
    const tuning = [...screen.container.querySelectorAll('[data-tuning]')]
      .sort((a, b) => xOf(a) - xOf(b))
      .map((node) => node.textContent)
      .join(' ')
    expect(tuning).toBe(labels)
  })

  it('bass patterns mark no unplayed strings as muted', async () => {
    const screen = await render(<ChordDiagram {...bassCRootFifthOctave} />)
    expect(screen.container.querySelector('[data-indicator="muted"]')).toBeNull()
  })

  it('shows one label overlay at a time: notes or fingers, off by default', async () => {
    const plain = await render(<ChordDiagram {...cMajorOpen} />)
    expect(plain.container.querySelectorAll('[data-marker] text')).toHaveLength(0)
    await plain.unmount()

    const notes = await render(<ChordDiagram {...cMajorOpen} labels="notes" />)
    expect(
      [...notes.container.querySelectorAll('[data-marker] text')].map((t) => t.textContent),
    ).toEqual(['C', 'E', 'C'])
    await notes.unmount()

    const fingers = await render(<ChordDiagram {...cMajorOpen} labels="fingers" />)
    expect(
      [...fingers.container.querySelectorAll('[data-marker] text')].map((t) => t.textContent),
    ).toEqual(['3', '2', '1'])
  })
})
