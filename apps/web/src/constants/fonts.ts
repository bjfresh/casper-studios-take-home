import {
  Poppins as PoppinsFont,
  Quicksand as QuicksandFont,
  Space_Mono as SpaceMonoFont,
} from 'next/font/google'

/**
 * Web fonts, self-hosted at build time by next/font.
 *
 * No runtime request to Google, and the metrics are known up front so text does
 * not reflow once a font lands. Each is exposed as a CSS variable rather than a
 * class so globals.css can point a role token at it and the type scale picks it
 * up with no per-component wiring.
 *
 * Weights are declared explicitly for non-variable fonts: next/font only ships
 * the ones listed, and an undeclared weight renders as a synthesised (smeared)
 * bold rather than a real face.
 */

/**
 * Display and body copy, behind --font-display, --font-body and --font-sans.
 *
 * Poppins is not a variable font on Google Fonts, so every weight is a separate
 * file — this list covers exactly the weights `Text` exposes
 * (normal/medium/semibold/bold/black) and nothing more, since each extra weight
 * is another download.
 */
export const Poppins = PoppinsFont({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
})

/**
 * Headings and accent, behind --font-headline and --font-accent — headings,
 * eyebrows, form labels, buttons.
 *
 * Quicksand's real range is 300-700; it has no 900, so the `black` weight that
 * headings default to resolves to 700 rather than rendering a fake black.
 */
export const Quicksand = QuicksandFont({
  subsets: ['latin'],
  variable: '--font-quicksand',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

/**
 * Monospace face, behind --font-mono. Space Mono ships only 400 and 700, so
 * `Text`'s medium/semibold/black weights all resolve to the nearest real face.
 */
export const SpaceMono = SpaceMonoFont({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
  display: 'swap',
})

/** Applied to <html> so every font variable is in scope document-wide. */
export const FONT_VARIABLES = [Poppins.variable, Quicksand.variable, SpaceMono.variable].join(' ')

/**
 * Which family backs each type role, for the design-system reference.
 *
 * Kept beside the definitions so it cannot drift from what is actually loaded.
 */
export const FONT_BY_ROLE = {
  display: 'Poppins',
  heading: 'Quicksand',
  paragraph: 'Poppins',
  accent: 'Quicksand',
  mono: 'Space Mono',
} as const

export type FontRole = keyof typeof FONT_BY_ROLE
