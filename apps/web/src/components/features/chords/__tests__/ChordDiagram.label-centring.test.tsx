import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { ChordDiagram } from '../ChordDiagram'

const TUNING = ['E', 'A', 'D', 'G', 'B', 'E']

/** The glyphs' actual ink box, from the browser's own font metrics. */
function inkCentreY(text: SVGTextElement): number {
  const style = getComputedStyle(text)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no 2d context')
  // Font size in screen px: the SVG scales its 10-unit font.
  const ctm = text.getScreenCTM()
  const scale = ctm ? ctm.a : 1
  const fontSize = Number.parseFloat(style.fontSize) * scale
  context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`
  const metrics = context.measureText(text.textContent ?? '')
  // Baseline y on screen = the text's y attribute plus its dy, scaled.
  const point = text.ownerSVGElement?.createSVGPoint()
  if (!point || !ctm) throw new Error('no CTM')
  point.x = Number(text.getAttribute('x'))
  point.y =
    Number(text.getAttribute('y')) +
    Number.parseFloat(text.getAttribute('dy') ?? '0') * Number.parseFloat(style.fontSize)
  const baseline = point.matrixTransform(ctm).y
  return baseline - (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2
}

function circleCentreY(text: SVGTextElement): number {
  const circle =
    text.parentElement?.querySelector('circle:not([data-root])') ??
    text.parentElement?.querySelector('circle')
  const box = circle?.getBoundingClientRect()
  if (!box) throw new Error('no circle')
  return box.top + box.height / 2
}

describe('labels inside note circles', () => {
  it.each([
    [
      'notes',
      [
        { string: 5, fret: 3, note: 'C' },
        { string: 4, fret: 2, note: 'F♯' },
      ],
    ],
    [
      'fingers',
      [
        { string: 5, fret: 3, finger: 3 as const },
        { string: 4, fret: 2, finger: 1 as const },
      ],
    ],
  ] as const)('are vertically centred in the circle (%s)', async (labels, positions) => {
    const screen = await render(
      <ChordDiagram
        title="Test"
        tuning={TUNING}
        labels={labels}
        fingering={{ positions: [...positions], mutedStrings: [] }}
        style={{ width: '300px' }}
      />,
    )
    for (const text of screen.container.querySelectorAll<SVGTextElement>('[data-label="inside"]')) {
      expect(Math.abs(inkCentreY(text) - circleCentreY(text)), text.textContent ?? '').toBeLessThan(
        1,
      )
    }
  })

  it('use the rounded accent face of form labels and buttons', async () => {
    const screen = await render(
      <div>
        <input aria-label="field" className="font-accent" />
        <ChordDiagram
          title="Test"
          tuning={TUNING}
          labels="notes"
          fingering={{ positions: [{ string: 5, fret: 3, note: 'C' }], mutedStrings: [] }}
        />
      </div>,
    )
    const label = screen.container.querySelector('[data-label="inside"]') as Element
    const field = screen.container.querySelector('input') as Element
    expect(getComputedStyle(label).fontFamily).toBe(getComputedStyle(field).fontFamily)
  })
})
