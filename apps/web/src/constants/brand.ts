/**
 * The brand ramps' names and steps, for the design-system reference. The
 * colour VALUES live only in app/globals.css (@theme static); this lists what
 * exists, so the reference can paint each one from its CSS variable.
 */
export const BRAND_TOKENS = ['brand-1', 'brand-2', 'brand-3', 'brand-4', 'brand-5'] as const

export type BrandToken = (typeof BRAND_TOKENS)[number]

export const BRAND_NAMES = {
  'brand-1': 'brick ember',
  'brand-2': 'medium jungle',
  'brand-3': 'amber gold',
  'brand-4': 'royal orchid',
  'brand-5': 'frozen lake',
} as const satisfies Record<BrandToken, string>

export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

export type RampStep = (typeof RAMP_STEPS)[number]

/** The semantic theme tokens (globals.css), in reading order, with what each is for. */
export const THEME_TOKENS = [
  ['background', 'Page'],
  ['surface', 'Panels, popovers'],
  ['foreground', 'Text, chord markers'],
  ['muted-foreground', 'Secondary text'],
  ['border', 'Dividers'],
  ['input', 'Control borders, off switches'],
  ['control', 'Brand accent: controls, primary buttons, progress'],
  ['interval', 'Interval labels'],
  ['primary', 'Links, focus, chord selection'],
  ['danger', 'Errors, destructive'],
  ['success', 'Success'],
  ['warning', 'Warnings'],
] as const
