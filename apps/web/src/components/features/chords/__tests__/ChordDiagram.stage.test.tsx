import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { ChordDiagram } from '../ChordDiagram'
import { FRET_ROWS } from '../chord-diagram-layout'
import { EXAMPLE_FINGERINGS } from '../examples'

const { cMajorOpen, gMajorOpen, bMajorBarre7 } = EXAMPLE_FINGERINGS
const TUNING = ['E', 'A', 'D', 'G', 'B', 'E']

/** Everything about the grid that must not change between chords. */
function stage(container: HTMLElement) {
  const svg = container.querySelector('svg') as SVGSVGElement
  const box = svg.getBoundingClientRect()
  const frets = [...container.querySelectorAll('line[data-fret]')].map((line) =>
    Math.round(line.getBoundingClientRect().top - box.top),
  )
  const strings = [...container.querySelectorAll('line[data-string]')].map((line) =>
    Math.round(line.getBoundingClientRect().left - box.left),
  )
  return { viewBox: svg.getAttribute('viewBox'), height: Math.round(box.height), frets, strings }
}

describe('the fretboard is a stable stage', () => {
  it('open, open and barre chords draw exactly the same grid', async () => {
    const shapes = [cMajorOpen, gMajorOpen, bMajorBarre7]
    const stages = []
    for (const shape of shapes) {
      const screen = await render(<ChordDiagram {...shape} showTuning style={{ width: 260 }} />)
      stages.push(stage(screen.container))
      expect(screen.container.querySelectorAll('line[data-fret]')).toHaveLength(FRET_ROWS + 1)
      await screen.unmount()
    }
    expect(stages[1]).toEqual(stages[0])
    expect(stages[2]).toEqual(stages[0])
  })

  it('a high chord shifts the frets it represents, not the grid', async () => {
    const screen = await render(<ChordDiagram {...bMajorBarre7} />)
    const frets = [...screen.container.querySelectorAll('line[data-fret]')].map((line) =>
      Number(line.getAttribute('data-fret')),
    )
    expect(frets).toEqual([7, 8, 9, 10, 11, 12])
  })

  it('changing chord in place keeps every grid line where it was', async () => {
    const screen = await render(
      <ChordDiagram {...cMajorOpen} revealKey="a" style={{ width: 260 }} />,
    )
    const before = stage(screen.container)
    await screen.rerender(<ChordDiagram {...bMajorBarre7} revealKey="b" style={{ width: 260 }} />)
    expect(stage(screen.container)).toEqual(before)
  })
})

describe('note markers', () => {
  it('each is an orb inside a separate ring; roots get the strong ring', async () => {
    const screen = await render(<ChordDiagram {...cMajorOpen} labels="notes" />)
    const markers = screen.container.querySelectorAll('[data-marker]')
    expect(markers.length).toBeGreaterThan(0)
    for (const marker of markers) {
      const orb = marker.querySelector('[data-orb]') as SVGCircleElement
      const ring = marker.querySelector('[data-ring]') as SVGCircleElement
      const orbR = Number(orb.getAttribute('r'))
      const ringInner =
        Number(ring.getAttribute('r')) - Number(ring.getAttribute('stroke-width')) / 2
      // A visible gap between orb and ring.
      expect(ringInner - orbR).toBeGreaterThanOrEqual(1.5)
      const isRoot = marker.querySelector('[data-root]') !== null
      const opacity = Number(getComputedStyle(ring).opacity)
      if (isRoot) expect(opacity).toBeGreaterThanOrEqual(0.7)
      else {
        expect(opacity).toBeGreaterThanOrEqual(0.15)
        expect(opacity).toBeLessThanOrEqual(0.2)
      }
    }
  })

  it('a backdrop in the page colour hides the strings behind the whole marker', async () => {
    const screen = await render(<ChordDiagram {...cMajorOpen} />)
    for (const marker of screen.container.querySelectorAll('[data-marker]')) {
      const backdrop = marker.querySelector('[data-backdrop]') as SVGCircleElement
      const ring = marker.querySelector('[data-ring]') as SVGCircleElement
      // Drawn first (underneath), and reaching the ring's outer edge.
      expect(marker.querySelector('circle')).toBe(backdrop)
      const ringOuter =
        Number(ring.getAttribute('r')) + Number(ring.getAttribute('stroke-width')) / 2
      expect(Number(backdrop.getAttribute('r'))).toBeCloseTo(ringOuter, 5)
      expect(getComputedStyle(backdrop).fill).toBe(getComputedStyle(document.body).backgroundColor)
    }
  })

  it('adjacent notes on the same fret never touch', async () => {
    const screen = await render(
      <ChordDiagram
        title="A"
        tuning={TUNING}
        fingering={{
          positions: [
            { string: 4, fret: 2 },
            { string: 3, fret: 2 },
            { string: 2, fret: 2 },
          ],
        }}
      />,
    )
    const rings = [...screen.container.querySelectorAll('[data-ring]')].map((ring) =>
      ring.getBoundingClientRect(),
    )
    for (let index = 1; index < rings.length; index++) {
      const [a, b] = [rings[index - 1], rings[index]].sort(
        (x, y) => (x?.left ?? 0) - (y?.left ?? 0),
      )
      expect((b?.left ?? 0) - (a?.right ?? 0)).toBeGreaterThan(0)
    }
  })
})

describe('the ripple', () => {
  const delays = (container: HTMLElement) =>
    [...container.querySelectorAll<SVGGElement>('.chord-note-enter')]
      .map((note) => ({
        x: note.getBoundingClientRect().left,
        delay: Number.parseFloat(note.style.animationDelay),
      }))
      .sort((a, b) => a.x - b.x)
      .map((note) => note.delay)

  it('runs across the strings as drawn, skipping strings with no note', async () => {
    // C major: low E muted, so five strings ripple, 50ms apart.
    const screen = await render(<ChordDiagram {...cMajorOpen} />)
    expect(delays(screen.container)).toEqual([0, 50, 100, 150, 200])
    // Muted strings aren't notes: they don't take part.
    expect(screen.container.querySelector('[data-indicator="muted"]')?.classList).not.toContain(
      'chord-note-enter',
    )
  })

  it('left-handed: still travels left to right across the drawn strings', async () => {
    const screen = await render(<ChordDiagram {...cMajorOpen} handedness="left" />)
    expect(delays(screen.container)).toEqual([0, 50, 100, 150, 200])
    const first = screen.container.querySelector('[data-reveal="0"]')
    expect(first?.getAttribute('data-string')).toBe('1') // high E is leftmost when mirrored
  })

  it('pops with an overshoot that settles at exactly 1, on transform and opacity only', async () => {
    const screen = await render(<ChordDiagram {...gMajorOpen} />)
    const note = screen.container.querySelector('.chord-note-enter') as SVGGElement
    const [animation] = note.getAnimations()
    if (!animation) throw new Error('no entrance animation')
    const keyframes = (animation.effect as KeyframeEffect).getKeyframes()
    const scales = keyframes.map((frame) => String(frame.transform))
    expect(scales[0]).toContain('scale(0.5)')
    expect(scales).toContain('scale(1.1)')
    expect(scales.at(-1)).toContain('scale(1)')
    for (const frame of keyframes) {
      const animated = Object.keys(frame).filter(
        (key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key),
      )
      for (const property of animated) expect(['opacity', 'transform']).toContain(property)
    }
    expect((animation.effect?.getTiming().duration as number) <= 250).toBe(true)
  })

  it('a new chord replaces the markers, restarting the ripple (no stale animations)', async () => {
    const screen = await render(<ChordDiagram {...cMajorOpen} revealKey="1" />)
    const old = screen.container.querySelector('[data-marker]')
    await screen.rerender(<ChordDiagram {...cMajorOpen} revealKey="2" />)
    const fresh = screen.container.querySelector('[data-marker]')
    expect(fresh).not.toBe(old)
    expect(old?.isConnected).toBe(false)
    // A display setting isn't a new chord: no replay.
    await screen.rerender(<ChordDiagram {...cMajorOpen} revealKey="2" labels="notes" />)
    expect(screen.container.querySelector('[data-marker]')).toBe(fresh)
  })

  it('hover and press live on an inner group, so they compose with the entrance', async () => {
    const screen = await render(<ChordDiagram {...cMajorOpen} />)
    const enter = screen.container.querySelector('[data-marker]') as Element
    expect(enter.classList).toContain('chord-note-enter')
    expect(enter.querySelector('.chord-note')).not.toBeNull()
  })

  it('reduced motion turns the entrances off', () => {
    const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules])
    const reduced = rules.find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule &&
        rule.conditionText.includes('prefers-reduced-motion: reduce'),
    )
    const off = [...(reduced?.cssRules ?? [])].filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.style.animationName === 'none',
    )
    const selectors = off.map((rule) => rule.selectorText).join(',')
    expect(selectors).toContain('.chord-note-enter')
    expect(selectors).toContain('.lesson-control-enter')
  })
})
