/** sRGB channels (0–255) of a CSS colour, as the browser resolves it. Browser only. */
export function rgbOf(color: string): [number, number, number] {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return [0, 0, 0]
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

/** WCAG relative luminance of sRGB channels. */
export function relativeLuminance([r, g, b]: readonly [number, number, number]): number {
  const linear = (channel: number) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** WCAG contrast ratio between two colours' channels, 1–21. */
export function contrastRatio(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Black or white, whichever reads better on `background`. Decided by
 * contrast, never by a ramp's step number: amber's 500 needs dark text where
 * other ramps' 500 need light.
 */
export function readableTextColor(
  background: readonly [number, number, number],
): '#000000' | '#ffffff' {
  const black = contrastRatio(background, [0, 0, 0])
  const white = contrastRatio(background, [255, 255, 255])
  return black >= white ? '#000000' : '#ffffff'
}
