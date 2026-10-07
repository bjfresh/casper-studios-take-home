import type { Prettify } from '@repo/shared'
import { Label as LabelPrimitive } from 'radix-ui'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Text, type TextVariant } from './Text'

export type LabelProps = Prettify<
  ComponentPropsWithRef<typeof LabelPrimitive.Root> & {
    /**
     * Shows an asterisk plus sr-only "(required)". This is presentation only:
     * the control itself must still set `required` / `aria-required` (Field's
     * controlProps does) — a marker in the label is not a semantic signal.
     */
    required?: boolean
    /** Short inline note after the label, e.g. "(optional)". */
    hint?: ReactNode
    variant?: Extract<TextVariant, `accent-${string}`>
  }
>

/**
 * Radix Label gives correct association, including click-to-focus/toggle for
 * checkbox, radio and switch. Accent typography by default: labels are short
 * chrome, visually distinct from the copy inside the field they name.
 */
export function Label({
  required = false,
  hint,
  variant = 'accent-md',
  className,
  children,
  ...props
}: LabelProps) {
  return (
    <Text asChild variant={variant} className={cn('text-foreground', className)}>
      <LabelPrimitive.Root {...props}>
        {children}
        {required && (
          <>
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
        {hint != null && (
          <Text as="span" variant={variant} weight="regular" className="ml-1 text-muted-foreground">
            {hint}
          </Text>
        )}
      </LabelPrimitive.Root>
    </Text>
  )
}
