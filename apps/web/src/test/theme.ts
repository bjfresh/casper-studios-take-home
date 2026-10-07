/**
 * The dark theme's tokens, read from the stylesheet's
 * `@media (prefers-color-scheme: dark) { :root { … } }` rule, for tests that
 * check both themes by applying them inline on <html>.
 *
 * Parsed from the rule's CSS text, not by iterating its CSSStyleDeclaration:
 * Chromium's enumeration skips some custom properties (seen with the
 * fallback duplicates the CSS build emits for color-mix()), which silently
 * left those tokens in their light values. Later declarations win, as in CSS.
 */
export function darkTokens(): Record<string, string> {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSMediaRule)) continue
      if (!rule.conditionText.includes('prefers-color-scheme: dark')) continue
      for (const inner of rule.cssRules) {
        if (!(inner instanceof CSSStyleRule) || inner.selectorText !== ':root') continue
        const tokens: Record<string, string> = {}
        const body = inner.cssText.slice(
          inner.cssText.indexOf('{') + 1,
          inner.cssText.lastIndexOf('}'),
        )
        for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
          if (name && value) tokens[name] = value.trim()
        }
        return tokens
      }
    }
  }
  throw new Error('dark theme tokens not found')
}
