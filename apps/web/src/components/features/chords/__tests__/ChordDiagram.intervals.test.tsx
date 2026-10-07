import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { darkTokens } from '@/test/theme'
import { ChordDiagram } from '../ChordDiagram'

const TUNING = ['E', 'A', 'D', 'G', 'B', 'E']
const FINGERING = {
  positions: [
    { string: 5, fret: 3, isRoot: true, note: 'C', interval: '1' as const },
    { string: 4, fret: 2, note: 'E', interval: '3' as const },
    { string: 3, fret: 0, note: 'G', interval: '5' as const },
  ],
  mutedStrings: [6],
}

function rgb(color: string): [number, number, number] {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}
function contrast(a: string, b: string) {
  const luminance = (color: string) => {
    const [r = 0, g = 0, b = 0] = rgb(color).map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * The glyphs' ink box on screen, from the browser's own font metrics. `only`
 * measures part of the label (its digits) at the same position.
 */
function inkBox(text: SVGTextElement, only?: string) {
  const style = getComputedStyle(text)
  const ctm = text.getScreenCTM()
  if (!ctm) throw new Error('no CTM')
  const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D
  context.font = `${style.fontWeight} ${Number.parseFloat(style.fontSize) * ctm.a}px ${style.fontFamily}`
  const metrics = context.measureText(only ?? text.textContent ?? '')
  const point = (text.ownerSVGElement as SVGSVGElement).createSVGPoint()
  point.x = Number(text.getAttribute('x'))
  point.y =
    Number(text.getAttribute('y')) +
    Number.parseFloat(text.getAttribute('dy') ?? '0') * Number.parseFloat(style.fontSize)
  const baseline = point.matrixTransform(ctm)
  return {
    top: baseline.y - metrics.actualBoundingBoxAscent,
    bottom: baseline.y + metrics.actualBoundingBoxDescent,
    width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
    scale: ctm.a,
  }
}

describe('interval labels', () => {
  it.each([['1'], ['b3'], ['b13']] as const)(
    'sit on a page-colour disc, centred on the glyphs and ~2px past their top (%s)',
    async (interval) => {
      const screen = await render(
        <ChordDiagram
          title="X"
          tuning={TUNING}
          fingering={{ positions: [{ string: 5, fret: 3, interval }] }}
          showIntervals
          style={{ width: 300 }}
        />,
      )
      const text = screen.container.querySelector('[data-interval]') as SVGTextElement
      const disc = screen.container.querySelector('[data-interval-backdrop]') as SVGRectElement
      const box = disc.getBoundingClientRect()
      const ink = inkBox(text)
      // Centred on the ink, vertically.
      expect(Math.abs((ink.top + ink.bottom) / 2 - (box.top + box.bottom) / 2)).toBeLessThan(1)
      // Reaching about 2 units (≈2–3px) past the top of the NUMBER. Measured
      // on the digits: the ♭ comes from a system fallback font (the label
      // font has none), whose height differs by OS, so it only has to fit.
      const digits = text.textContent?.replace(/[^0-9]/g, '') ?? ''
      const margin = (inkBox(text, digits).top - box.top) / ink.scale
      expect(margin).toBeGreaterThan(1.5)
      expect(margin).toBeLessThan(3)
      expect(ink.top).toBeGreaterThanOrEqual(box.top)
      // Wide enough for the whole label.
      expect(box.width).toBeGreaterThan(ink.width)
      expect(getComputedStyle(disc).fill).toBe(getComputedStyle(document.body).backgroundColor)
    },
  )

  it('sit clear of their note: a visible gap between the ring and the disc', async () => {
    const screen = await render(
      <ChordDiagram
        title="C"
        tuning={TUNING}
        fingering={FINGERING}
        showIntervals
        style={{ width: 300 }}
      />,
    )
    for (const marker of screen.container.querySelectorAll('[data-marker]')) {
      const ring = (marker.querySelector('[data-ring]') as Element).getBoundingClientRect()
      const disc = (
        marker.querySelector('[data-interval-backdrop]') as Element
      ).getBoundingClientRect()
      expect(disc.top - ring.bottom).toBeGreaterThanOrEqual(1.5)
    }
  })

  it('stay inside the drawing, above the tuning row', async () => {
    const screen = await render(
      <ChordDiagram
        title="C"
        tuning={TUNING}
        fingering={{ positions: [{ string: 5, fret: 5, interval: '1' }] }}
        showIntervals
        showTuning
        style={{ width: 300 }}
      />,
    )
    const label = (
      screen.container.querySelector('[data-interval]') as Element
    ).getBoundingClientRect()
    const tuning = (
      screen.container.querySelector('[data-tuning="5"]') as Element
    ).getBoundingClientRect()
    expect(label.bottom).toBeLessThanOrEqual(tuning.top + 1)
  })

  it.each(['light', 'dark'] as const)(
    'use the brand accent, readable as text (%s)',
    async (theme) => {
      const root = document.documentElement
      const applied = theme === 'dark' ? Object.entries(darkTokens()) : []
      for (const [name, value] of applied) root.style.setProperty(name, value)
      try {
        const screen = await render(
          <ChordDiagram title="C" tuning={TUNING} fingering={FINGERING} showIntervals />,
        )
        const label = screen.container.querySelector('[data-interval]') as Element
        const fill = getComputedStyle(label).fill
        const page = getComputedStyle(document.body).backgroundColor
        expect(contrast(fill, page), `${fill} on ${page}`).toBeGreaterThanOrEqual(4.5)
        // Not the grey of the tuning letters: an accent.
        expect(fill).not.toBe(getComputedStyle(document.body).color)
      } finally {
        for (const [name] of applied) root.style.removeProperty(name)
      }
    },
  )
})
