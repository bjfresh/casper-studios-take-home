import type { Prettify } from '@repo/shared'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/utils/cn'
import { textVariants } from './Text'

/**
 * Variants name INTENT, not colour: `success` keeps its meaning when the
 * palette changes; `green` wouldn't.
 *
 * Tinted variants are a low-opacity fill plus a slightly stronger border of
 * the same token, which reads as a tint on any background, dark mode included.
 * Their text uses the `-strong` shade: base-shade text on its own 10% tint can
 * drop below 4.5:1 even when both tokens pass alone (Badge.test.tsx checks
 * every variant in both themes). `solid` is the exception: the bright brand
 * accent with white text, held to the accent's documented minimum instead.
 */
export const badgeVariants = cva(
  // whitespace-nowrap: a two-word badge wrapping inside a table row looks
  // broken; overflowing its container is the lesser evil.
  // inline-flex + gap: room for a small icon beside the text.
  ['inline-flex items-center gap-1 rounded-full border whitespace-nowrap', 'transition-colors'],
  {
    variants: {
      variant: {
        /** Quiet: attributes that inform rather than alert. */
        neutral: 'border-border bg-muted text-foreground',
        /** Same quietness without a fill, for dense lists where fills get noisy. */
        outline: 'border-border bg-transparent text-muted-foreground',
        success: 'border-success/35 bg-success/10 text-success-strong',
        warning: 'border-warning/45 bg-warning/15 text-warning-strong',
        danger: 'border-danger/35 bg-danger/10 text-danger-strong',
        /** Filled: the one thing in a row that should read first. */
        // The brand accent with white text, exactly as the primary Button: the
        // same --control tokens, so the two never drift apart. Below 4.5:1 by
        // choice (see globals.css --control); the text says it, not the colour.
        solid: 'border-control bg-control text-control-foreground',
      },
      // A badge is chrome, not content: the accent face (like labels and
      // buttons), with family, size, leading and tracking set here so it reads
      // the same wherever it's placed rather than inheriting.
      size: {
        // 11/16 is deliberately BELOW the smallest step of the type scale
        // (accent-sm, 12px): badges sit inside dense rows. Not an oversight.
        sm: 'h-5 px-2 font-sans text-[11px]/4 font-medium tracking-wide',
        md: cn('h-6 px-2.5', textVariants({ variant: 'accent-sm' })),
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  },
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>

export const BADGE_VARIANTS = [
  'neutral',
  'outline',
  'success',
  'warning',
  'danger',
  'solid',
] as const satisfies readonly BadgeVariant[]

export type BadgeProps = Prettify<
  ComponentPropsWithoutRef<'span'> &
    VariantProps<typeof badgeVariants> & {
      /**
       * Render the single child (e.g. a link) with badge styling, via Radix
       * Slot. The ONE interactive case: a badge that navigates. Same contract
       * as Button's asChild.
       */
      asChild?: boolean
    }
>

/**
 * A short, NON-interactive label read alongside the thing it describes: a
 * status, an attribute, a count. Not a button, chip or filter. If it can be
 * clicked to do something or dismissed, it's a different component. No Radix
 * primitive exists for this, correctly: a badge has no behaviour.
 *
 * Accessibility:
 * - The TEXT carries the meaning; colour only reinforces it. Never render a
 *   badge whose only content is colour.
 * - When the text is ambiguous out of context ("Limited"), pass `aria-label`
 *   with the full meaning ("Limited availability"). On a plain badge that
 *   becomes visually-hidden text replacing the visible text for assistive
 *   tech, because aria-label on a role-less <span> is disallowed by ARIA and
 *   ignored by many screen readers. With asChild (a link), it stays a real
 *   aria-label.
 * - A badge announcing a CHANGE (a live count) needs an aria-live region at
 *   the call site; this component doesn't provide one, since most badges are
 *   static and would spam announcements.
 * - A decorative badge that repeats adjacent text: pass aria-hidden.
 */
export function Badge({
  variant,
  size,
  asChild = false,
  className,
  children,
  'aria-label': ariaLabel,
  ...props
}: BadgeProps) {
  const classes = cn(badgeVariants({ variant, size }), className)

  if (asChild) {
    return (
      <Slot.Root className={classes} aria-label={ariaLabel} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <span className={classes} {...props}>
      {ariaLabel ? (
        <>
          <span aria-hidden="true" className="contents">
            {children}
          </span>
          <span className="sr-only">{ariaLabel}</span>
        </>
      ) : (
        children
      )}
    </span>
  )
}
