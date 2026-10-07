'use client'

import { useEffect, useState } from 'react'
import { Text } from '@/components/ui/Text'
import {
  BRAND_NAMES,
  BRAND_TOKENS,
  type BrandToken,
  RAMP_STEPS,
  THEME_TOKENS,
} from '@/constants/brand'
import { readableTextColor, rgbOf } from '@/utils/color'

/**
 * The brand ramps and the semantic theme tokens, painted from their CSS
 * variables (not Tailwind classes: a template like `bg-${token}-${step}`
 * generates nothing, and reading the variables proves they resolve). Switch
 * to dark mode and the theme tokens re-resolve; the ramps are fixed.
 */
export function BrandPalette() {
  // Each step's label colour, chosen by contrast from the RESOLVED variable,
  // so it can't drift from the CSS. Measured after mount (needs the DOM).
  const [labels, setLabels] = useState<Record<string, string>>({})
  useEffect(() => {
    const root = getComputedStyle(document.documentElement)
    const next: Record<string, string> = {}
    for (const token of BRAND_TOKENS) {
      for (const step of RAMP_STEPS) {
        const value = root.getPropertyValue(`--color-${token}-${step}`).trim()
        if (value) next[`${token}-${step}`] = readableTextColor(rgbOf(value))
      }
    }
    setLabels(next)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        {BRAND_TOKENS.map((token) => (
          <BrandRamp key={token} token={token} labels={labels} />
        ))}
        <div className="flex flex-col gap-2">
          <Text variant="mono-sm" className="text-muted-foreground">
            --gradient-brand
          </Text>
          <div className="h-3 rounded-full" style={{ backgroundImage: 'var(--gradient-brand)' }} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Text as="h3" variant="heading-4">
          Theme tokens
        </Text>
        <ul className="grid gap-3 sm:grid-cols-2">
          {THEME_TOKENS.map(([token, use]) => (
            <li key={token} className="flex items-center gap-3">
              <span
                className="size-10 shrink-0 rounded-md border border-border"
                style={{ backgroundColor: `var(--${token})` }}
              />
              <span className="flex flex-col">
                <Text variant="mono-sm">--{token}</Text>
                <Text variant="paragraph-sm" className="text-muted-foreground">
                  {use}
                </Text>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function BrandRamp({ token, labels }: { token: BrandToken; labels: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <Text as="h3" variant="accent-md" weight="semibold">
          {token}
        </Text>
        <Text variant="mono-sm" className="text-muted-foreground">
          {BRAND_NAMES[token]}
        </Text>
      </div>
      <div className="flex overflow-hidden rounded-md">
        {RAMP_STEPS.map((step) => (
          <div
            key={step}
            title={`--color-${token}-${step}`}
            className="flex h-12 flex-1 items-end justify-center pb-1"
            style={{ backgroundColor: `var(--color-${token}-${step})` }}
          >
            <Text variant="mono-sm" style={{ color: labels[`${token}-${step}`] }}>
              {step}
            </Text>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded px-2 py-1"
          style={{ backgroundColor: `var(--color-${token})`, color: `var(--color-${token}-fg)` }}
        >
          <Text variant="mono-sm">base + fg</Text>
        </span>
        <span className="rounded px-2 py-1" style={{ color: `var(--color-${token}-text)` }}>
          <Text variant="mono-sm">text on page background</Text>
        </span>
      </div>
    </div>
  )
}
