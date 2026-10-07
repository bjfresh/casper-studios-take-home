/** Every app route string lives here; never inline a path in a component. */
export const ROUTES = {
  home: '/',
  /** Development-only component gallery. */
  design: '/design',
} as const

/** A lesson's public URL, by its stable curriculum slug. */
export const lessonRoute = (slug: string) => `/lesson/${encodeURIComponent(slug)}`
