import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { darkTokens } from '@/test/theme'
import { BADGE_VARIANTS, Badge } from '../Badge'

/** sRGB of any CSS colour (oklch, with alpha…) composited over `over`, via a 1×1 canvas. */
function rgbOf(color: string, over = 'white'): [number, number, number] {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no 2d context')
  context.fillStyle = over
  context.fillRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const luminance = ([r, g, b]: [number, number, number]) => {
    const [R, G, B] = [r, g, b].map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * (R ?? 0) + 0.7152 * (G ?? 0) + 0.0722 * (B ?? 0)
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

// solid is the primary Button's look, brand-5-500 with white text: ~2.4:1 by
// choice (globals.css --control), so it's held to the accent's minimum and to
// white text rather than to 4.5:1.
const SOLID_MIN = { light: 2.3, dark: 2.3 } as const

describe('Badge', () => {
  it('renders its label in a span by default', async () => {
    await render(<Badge>Published</Badge>)
    const badge = page.getByText('Published').element()
    expect(badge.tagName).toBe('SPAN')
  })

  it('gives each variant its own token', async () => {
    await render(
      <div>
        {BADGE_VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </div>,
    )
    const classOf = (variant: string) =>
      page.getByText(variant, { exact: true }).element().className
    expect(classOf('success')).toContain('text-success-strong')
    expect(classOf('warning')).toContain('bg-warning/15')
    expect(classOf('danger')).toContain('text-danger-strong')
    expect(classOf('solid')).toContain('bg-control')
    expect(new Set(BADGE_VARIANTS.map(classOf)).size).toBe(BADGE_VARIANTS.length)
  })

  it('with asChild, renders the child element (a link) with badge styling and its own attributes', async () => {
    await render(
      <Badge asChild variant="success">
        <a href="/lessons/4">Lesson 4</a>
      </Badge>,
    )
    const link = page.getByRole('link', { name: 'Lesson 4' }).element()
    expect(link.getAttribute('href')).toBe('/lessons/4')
    expect(link.className).toContain('rounded-full')
    expect(link.className).toContain('text-success-strong')
  })

  it('merges a caller className without dropping the variant styles', async () => {
    await render(
      <Badge variant="danger" className="ml-2 px-4">
        Sold out
      </Badge>,
    )
    const { className } = page.getByText('Sold out').element()
    expect(className).toContain('ml-2')
    expect(className).toContain('px-4')
    expect(className).not.toContain('px-2 ')
    expect(className).toContain('text-danger-strong')
  })

  it('aria-label replaces the visible text for assistive tech, robustly on a span', async () => {
    await render(
      <p>
        Margherita <Badge aria-label="Limited availability">Limited</Badge>
      </p>,
    )
    // The visible word is hidden from AT; the full meaning is what's read.
    expect(
      page.getByText('Limited', { exact: true }).element().closest('[aria-hidden="true"]'),
    ).not.toBeNull()
    await expect.element(page.getByText('Limited availability')).toBeInTheDocument()
    await expect.element(page.getByRole('paragraph')).toHaveAccessibleName('')
    expect(page.getByRole('paragraph').element().textContent).toContain('Limited availability')
  })

  it('aria-label stays a real accessible name on an asChild link', async () => {
    await render(
      <Badge asChild aria-label="Lesson 4: The A Family">
        <a href="/lessons/4">L4</a>
      </Badge>,
    )
    await expect.element(page.getByRole('link', { name: 'Lesson 4: The A Family' })).toBeVisible()
  })

  it.each(['light', 'dark'] as const)(
    'every tinted variant meets 4.5:1 text contrast in the %s theme',
    async (theme) => {
      await render(
        <div data-testid="surface" className="bg-background p-4">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>,
      )
      const surface = page.getByTestId('surface').element() as HTMLElement
      // Applied to :root, the way the real dark theme switches: Tailwind resolves
      // some colour variables there, so overriding tokens on a wrapper would
      // half-apply the theme.
      const root = document.documentElement
      const applied = theme === 'dark' ? Object.entries(darkTokens()) : []
      for (const [name, value] of applied) root.style.setProperty(name, value)
      try {
        const pageBackground = getComputedStyle(surface).backgroundColor
        for (const variant of BADGE_VARIANTS) {
          const style = getComputedStyle(page.getByText(variant, { exact: true }).element())
          const fill = rgbOf(style.backgroundColor, pageBackground)
          const text = rgbOf(style.color, `rgb(${fill.join(',')})`)
          const minimum = variant === 'solid' ? SOLID_MIN[theme] : 4.5
          expect(contrast(text, fill), `${variant} (${theme})`).toBeGreaterThanOrEqual(minimum)
          if (variant === 'solid') expect(text, `solid text (${theme})`).toEqual([255, 255, 255])
        }
      } finally {
        for (const [name] of applied) root.style.removeProperty(name)
      }
    },
  )
})
