'use client'

import type { Prettify } from '@repo/shared'
import { Switch as SwitchPrimitive } from 'radix-ui'
import type { ComponentPropsWithRef } from 'react'
import { useField } from '@/hooks/use-field'
import { cn } from '@/utils/cn'
import { Field, type FieldControlOwnProps, focusRingClasses } from './Field'

/**
 * Track and thumb shared by Switch and TwoSidedSwitch, so both read as the
 * same control. Track colour per state is the caller's: an on/off switch
 * fills when on, a two-sided one stays neutral (neither side is "on").
 */
export const switchTrackClasses = cn(
  // 44×24 track. The label is part of the hit area too (Radix Label
  // forwards clicks), so the target is wider than the track.
  'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
  // The 2px border is always present (transparent by default), so
  // switching on the error border doesn't shift the thumb.
  'border-2 border-transparent',
  'transition-colors motion-reduce:transition-none',
  focusRingClasses,
  'disabled:cursor-not-allowed disabled:opacity-50',
)

export const switchThumbClasses = cn(
  // pointer-events-none so every click lands on the track (the button).
  'pointer-events-none block size-5 rounded-full bg-surface shadow-sm',
  // Position, not colour, is what carries the state visually; the track
  // colour is reinforcement only.
  'transition-transform motion-reduce:transition-none',
  'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
)

export type SwitchProps = Prettify<
  // `children` is omitted: the label comes from `label`, and a switch has no
  // inner content. Leaving it would let a label be passed twice, two ways.
  Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, 'children' | 'className'> &
    // `layout` is omitted: a switch is always inline (control before label).
    Omit<FieldControlOwnProps, 'layout'> & {
      /** Styles the field WRAPPER (layout, spacing). */
      className?: string
      /** Styles the switch track itself. */
      controlClassName?: string
    }
>

/**
 * An on/off toggle that takes effect IMMEDIATELY ("Email notifications: on").
 * A value that a form saves on submit is a checkbox, whatever it looks like: a
 * switch there promises an immediacy the UI doesn't deliver. Inside a form, a
 * switch is right only when the form auto-saves or the toggle fires its own
 * mutation.
 *
 * Radix supplies role="switch", aria-checked, Space/Enter, and controlled vs
 * uncontrolled handling. This component holds no state; styling reads the
 * primitive's `data-state`.
 *
 * With React Hook Form, use `Controller`, NOT `register()`. A switch isn't a
 * native input, so spreading register() onto it renders fine and silently
 * never updates the form value:
 *
 *   <Controller
 *     control={form.control}
 *     name="notifications"
 *     render={({ field, fieldState }) => (
 *       <Switch
 *         label="Email notifications"
 *         checked={field.value}
 *         onCheckedChange={field.onChange}
 *         error={fieldState.error?.message}
 *       />
 *     )}
 *   />
 */
export function Switch({
  label,
  description,
  error,
  hint,
  reserveErrorSpace,
  className,
  controlClassName,
  id,
  required,
  disabled,
  ...props
}: SwitchProps) {
  const field = useField({ id, description, error, required, disabled })

  return (
    <Field
      field={field}
      label={label}
      description={description}
      error={error}
      hint={hint}
      layout="inline"
      required={required}
      reserveErrorSpace={reserveErrorSpace}
      className={className}
    >
      <SwitchPrimitive.Root
        {...props}
        {...field.controlProps}
        // To the primitive as well as Field: Field only dims the label; this
        // makes the control itself inert.
        disabled={disabled}
        required={required}
        className={cn(
          switchTrackClasses,
          'data-[state=checked]:bg-control data-[state=unchecked]:bg-input',
          // aria-invalid alone tells screen-reader users and hides the problem
          // from everyone else; the error must be visible too.
          field.hasError ? 'border-danger focus-visible:ring-danger' : 'focus-visible:ring-ring',
          controlClassName,
        )}
      >
        <SwitchPrimitive.Thumb className={switchThumbClasses} />
      </SwitchPrimitive.Root>
    </Field>
  )
}
