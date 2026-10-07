import { vi } from 'vitest'
// Real Tailwind output in component tests, so layout assertions (widths,
// visibility, min/max height) measure what users actually get.
import '../app/globals.css'

// next/font only works inside Next's build. Components that import
// constants/fonts get the same CSS variable names, with the theme's
// system-font fallbacks taking over.
vi.mock('next/font/google', () => {
  const font = (options: { variable?: string }) => ({
    className: '',
    variable: options.variable?.replace(/^--/, 'font-var-') ?? '',
    style: { fontFamily: 'system-ui' },
  })
  return { Poppins: font, Quicksand: font, Space_Mono: font }
})
