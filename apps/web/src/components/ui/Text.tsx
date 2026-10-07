import type { Prettify } from '@repo/shared'
import { Slot } from 'radix-ui'
import type { ElementType, HTMLAttributes, Ref } from 'react'
import { cn } from '@/utils/cn'

/**
 * The type scale. Each variant sets size, leading, tracking and family ONLY —
 * weight is the separate `weight` prop, so "heading-3 but lighter" is a prop,
 * not a className override. Mobile first, then the `md:` desktop step; comments
 * give font-size/line-height in px at each.
 *
 * Adding a step is one entry here; the TextVariant union follows automatically.
 */
const TEXT_VARIANTS = {
  // 36/40 → 60/64
  'display-1': 'font-display text-4xl/10 tracking-tight md:text-6xl/16',
  // 30/36 → 48/56
  'display-2': 'font-display text-3xl/9 tracking-tight md:text-5xl/14',
  // 24/32 → 36/40
  'heading-1': 'font-headline text-2xl/8 tracking-tight md:text-4xl/10',
  // 20/28 → 30/36
  'heading-2': 'font-headline text-xl/7 tracking-tight md:text-3xl/9',
  // 18/28 → 24/32
  'heading-3': 'font-headline text-lg/7 tracking-tight md:text-2xl/8',
  // 16/24 → 20/28
  'heading-4': 'font-headline text-base/6 tracking-normal md:text-xl/7',
  // 18/28 → 20/32
  'paragraph-lg': 'font-body text-lg/7 tracking-normal md:text-xl/8',
  // 16/24 → 16/28
  'paragraph-md': 'font-body text-base/6 tracking-normal md:text-base/7',
  // 14/20 → 14/24
  'paragraph-sm': 'font-body text-sm/5 tracking-normal md:text-sm/6',
  // Accent: UI chrome (labels, buttons, badges) — tighter leading than prose and
  // the same at every breakpoint, so controls don't change height on resize.
  // 24/32 (large control labels, e.g. chord buttons)
  'accent-2xl': 'font-accent text-2xl/8 tracking-tight',
  // 20/28
  'accent-xl': 'font-accent text-xl/7 tracking-tight',
  // 16/24
  'accent-lg': 'font-accent text-base/6 tracking-normal',
  // 14/20
  'accent-md': 'font-accent text-sm/5 tracking-normal',
  // 12/16
  'accent-sm': 'font-accent text-xs/4 tracking-wide',
  // Form-field type (the face and size inside Input/TextArea: 16px, 14px from
  // md up) at ZERO line-height, for short inline text that sits with a
  // control (e.g. the tuning notes under the tuning select) without adding
  // line-box height of its own.
  // 16/0 → 14/0
  'field-inline': 'font-sans text-base/0 tracking-normal md:text-sm/0',
  // 14/24
  'mono-md': 'font-mono text-sm/6 tracking-normal',
  // 12/20
  'mono-sm': 'font-mono text-xs/5 tracking-normal',
} as const

export type TextVariant = keyof typeof TEXT_VARIANTS

export const TEXT_VARIANT_NAMES = Object.keys(TEXT_VARIANTS) as TextVariant[]

const TEXT_WEIGHTS = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  black: 'font-black',
} as const

export type TextWeight = keyof typeof TEXT_WEIGHTS

export const TEXT_WEIGHT_NAMES = Object.keys(TEXT_WEIGHTS) as TextWeight[]

type VariantFamily = 'display' | 'heading' | 'paragraph' | 'accent' | 'mono' | 'field'

function familyOf(variant: TextVariant): VariantFamily {
  return variant.slice(0, variant.indexOf('-')) as VariantFamily
}

const DEFAULT_WEIGHT = {
  display: 'bold',
  // Quicksand has no 900: black resolves to its real 700 (constants/fonts.ts).
  heading: 'black',
  paragraph: 'regular',
  accent: 'medium',
  mono: 'regular',
  field: 'regular',
} as const satisfies Record<VariantFamily, TextWeight>

type TextElement =
  | 'p'
  | 'span'
  | 'div'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'label'
  | 'legend'
  | 'li'
  | 'dt'
  | 'dd'
  | 'figcaption'
  | 'blockquote'
  | 'code'
  | 'strong'
  | 'em'
  | 'small'
  | 'time'

// Visual size and document outline are separate concerns: these defaults are
// conservative, and a heading that needs a different level passes `as`.
const DEFAULT_ELEMENT = {
  display: 'h1',
  heading: 'h2',
  paragraph: 'p',
  accent: 'span',
  mono: 'code',
  field: 'span',
} as const satisfies Record<VariantFamily, TextElement>

// Literal class names so Tailwind's scanner sees each one.
const CLAMP_CLASSES = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
} as const

export type TextProps = Prettify<
  HTMLAttributes<HTMLElement> & {
    ref?: Ref<HTMLElement>
    /** Element to render. Defaults by variant family (heading → h2, paragraph → p…). */
    as?: TextElement
    /** Merge the typography onto the single child element instead (Radix Slot). */
    asChild?: boolean
    variant?: TextVariant
    /** Defaults by family: display bold, heading black, accent medium, else regular. */
    weight?: TextWeight
    /** Render as an inline `span` instead of a block. */
    inline?: boolean
    /** Single line with ellipsis. */
    truncate?: boolean
    /** Clamp to N lines with ellipsis. */
    clamp?: keyof typeof CLAMP_CLASSES
    /**
     * Layout, spacing and color only. Size, leading, tracking, family and weight
     * here are ignored — the variant and `weight` win (see below).
     */
    className?: string
  }
>

export function textVariants({
  variant = 'paragraph-md',
  weight,
}: {
  variant?: TextVariant
  weight?: TextWeight
} = {}): string {
  return cn(TEXT_VARIANTS[variant], TEXT_WEIGHTS[weight ?? DEFAULT_WEIGHT[familyOf(variant)]])
}

export function Text({
  as,
  asChild = false,
  variant = 'paragraph-md',
  weight,
  inline = false,
  truncate = false,
  clamp,
  className,
  ...props
}: TextProps) {
  // Widened to ElementType: TS can't relate one `Ref<HTMLElement>` to the union
  // of every element's specific ref type. Props are already checked by TextProps.
  const Component: ElementType = asChild
    ? Slot.Root
    : (as ?? (inline ? 'span' : DEFAULT_ELEMENT[familyOf(variant)]))
  const display = truncate ? (inline ? 'inline-block max-w-full' : 'block') : inline ? 'inline' : ''

  // Order matters: className goes FIRST so twMerge lets the variant's size,
  // leading, tracking, family and weight override any call-site attempt, while
  // layout/spacing/color classes (no conflict) pass through untouched.
  const classes = cn(
    className,
    display,
    truncate && 'truncate',
    clamp && CLAMP_CLASSES[clamp],
    textVariants({ variant, weight }),
  )

  return <Component className={classes} {...props} />
}
