import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Text, type TextVariant, type TextWeight } from './Text'

// No 'use client' here, deliberately: LinkButton renders on the server and
// calls buttonVariants(). Exported from a 'use client' module, the function
// would become a client reference the server cannot invoke.

/**
 * Shared by Button and LinkButton so the two can never look different.
 *
 * Disabled: `disabled:` matches <button>; anchors have no disabled state, so
 * LinkButton sets aria-disabled and the same styles key off `aria-disabled:`.
 * Each variant restates its resting background under those two states to cancel
 * hover — deliberately NOT `pointer-events-none`, which would also stop the
 * not-allowed cursor from ever showing.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'select-none transition-colors outline-none',
    // Tailwind v4's preflight resets buttons to cursor: default.
    'cursor-pointer',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    'aria-busy:cursor-progress',
  ],
  {
    variants: {
      variant: {
        // The brand accent (globals.css --control), shared with form controls.
        primary:
          'bg-control text-control-foreground hover:bg-control-hover disabled:hover:bg-control aria-disabled:hover:bg-control',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary-hover disabled:hover:bg-secondary aria-disabled:hover:bg-secondary',
        ghost:
          'bg-transparent text-foreground hover:bg-accent disabled:hover:bg-transparent aria-disabled:hover:bg-transparent',
        destructive:
          'bg-danger text-danger-foreground hover:bg-danger-hover disabled:hover:bg-danger aria-disabled:hover:bg-danger',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline disabled:hover:no-underline aria-disabled:hover:no-underline',
      },
      // Hit areas: sm is 32px (the floor); md/lg clear the 44px touch guidance.
      // min-w matches the height so a one-character label still meets it.
      size: {
        sm: 'h-8 min-w-8 px-3',
        md: 'h-11 min-w-11 px-4',
        lg: 'h-12 min-w-12 px-6',
      },
    },
    compoundVariants: [
      {
        // A link sits inline with prose: no box padding or fixed height at any
        // size. Exempt from the hit-area floor, as inline links are under WCAG 2.5.8.
        variant: 'link',
        size: ['sm', 'md', 'lg'],
        className: 'h-auto w-auto min-w-0 px-0',
      },
    ],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>
export type ButtonVariant = NonNullable<ButtonVariantProps['variant']>
export type ButtonSize = NonNullable<ButtonVariantProps['size']>

export const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'ghost',
  'destructive',
  'link',
] as const satisfies readonly ButtonVariant[]

export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const satisfies readonly ButtonSize[]

const LABEL_TEXT_VARIANT = {
  sm: 'accent-sm',
  md: 'accent-md',
  lg: 'accent-lg',
} as const satisfies Record<ButtonSize, TextVariant>

/** Every button label, at every size: a step bolder than accent text's default. */
const LABEL_WEIGHT: TextWeight = 'semibold'

export const BUTTON_ICON_CLASSES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const satisfies Record<ButtonSize, string>

/**
 * A hidden-label button is a square at its size's height (sm 32px, md 44px,
 * lg 48px), so it lines up with the labelled buttons beside it. Derived from
 * `hideLabel`, not chosen separately.
 */
const HIDDEN_LABEL_CLASSES = {
  sm: 'w-8 px-0',
  md: 'w-11 px-0',
  lg: 'w-12 px-0',
} as const satisfies Record<ButtonSize, string>

/** The icon in a hidden-label button: the button's only content, so a step larger. */
const HIDDEN_LABEL_ICON_CLASSES = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const satisfies Record<ButtonSize, string>

/**
 * What a button shows, passed as props rather than children, so every button
 * renders its label and icons the same way.
 *
 * - `label` is the visible text AND the accessible name. Pass `aria-label`
 *   only to say more than the label (a "Play" button named "Play First
 *   Chords").
 * - `hideLabel` makes an icon-only button: the label becomes its accessible
 *   name, and it needs a `leftIcon` to show.
 */
export type ButtonContentProps =
  | {
      label: string
      hideLabel?: false
      /** Decorative icon before the label. While loading, the spinner takes its place. */
      leftIcon?: ReactNode
      /** Decorative icon after the label. */
      rightIcon?: ReactNode
    }
  | {
      label: string
      hideLabel: true
      /** The icon that stands in for the label. */
      leftIcon: ReactNode
      rightIcon?: never
    }

export type ButtonStyleProps = {
  variant?: ButtonVariant
  size?: ButtonSize
} & ButtonContentProps

/** The classes for a button's box: its variant and size, square if its label is hidden. */
export function buttonClasses({
  variant,
  size = 'md',
  hideLabel = false,
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  hideLabel?: boolean
  className?: string
}): string {
  return cn(buttonVariants({ variant, size }), hideLabel && HIDDEN_LABEL_CLASSES[size], className)
}

/**
 * The inside of a Button or LinkButton: icons and the label, laid out the
 * same in both. `leftIconSlot` lets Button swap a spinner into the icon's box.
 */
export function ButtonContent({
  label,
  hideLabel = false,
  leftIcon,
  rightIcon,
  size = 'md',
  leftIconSlot,
}: {
  // Loose on purpose: the public ButtonContentProps already enforce the
  // hidden-label rules; this only renders what it's given.
  label: string
  hideLabel?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  size?: ButtonSize
  leftIconSlot?: ReactNode
}) {
  const iconClasses = cn(
    'inline-flex shrink-0 items-center justify-center',
    hideLabel ? HIDDEN_LABEL_ICON_CLASSES[size] : BUTTON_ICON_CLASSES[size],
  )
  return (
    <>
      {leftIcon != null && (
        <span aria-hidden="true" className={iconClasses}>
          {leftIconSlot ?? leftIcon}
        </span>
      )}
      {!hideLabel && (
        <Text variant={LABEL_TEXT_VARIANT[size]} weight={LABEL_WEIGHT} inline>
          {label}
        </Text>
      )}
      {rightIcon != null && (
        <span aria-hidden="true" className={iconClasses}>
          {rightIcon}
        </span>
      )}
    </>
  )
}
