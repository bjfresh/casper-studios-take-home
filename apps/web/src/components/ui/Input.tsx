'use client'

import type { Prettify } from '@repo/shared'
import type { ComponentPropsWithRef } from 'react'
import { useField } from '@/hooks/use-field'
import { cn } from '@/utils/cn'
import { controlBaseClasses, controlStateClasses, Field, type FieldControlOwnProps } from './Field'

const INPUT_SIZE_CLASSES = {
  // Matches Button heights so inputs and buttons align in a row.
  sm: 'h-8',
  md: 'h-11',
  lg: 'h-12',
} as const

export type InputSize = keyof typeof INPUT_SIZE_CLASSES

export type InputProps = Prettify<
  // DOM `size` (character width) is omitted so it can't collide with the size variant.
  Omit<ComponentPropsWithRef<'input'>, 'size' | 'className'> &
    FieldControlOwnProps & {
      size?: InputSize
      /** Styles the field WRAPPER (layout, spacing). */
      className?: string
      /** Styles the <input> element itself. */
      controlClassName?: string
    }
>

export function Input({
  label,
  description,
  error,
  hint,
  layout,
  reserveErrorSpace,
  size = 'md',
  className,
  controlClassName,
  id,
  required,
  disabled,
  ...props
}: InputProps) {
  const field = useField({ id, description, error, required, disabled })

  return (
    <Field
      field={field}
      label={label}
      description={description}
      error={error}
      hint={hint}
      layout={layout}
      required={required}
      reserveErrorSpace={reserveErrorSpace}
      className={className}
    >
      <input
        {...props}
        {...field.controlProps}
        required={required}
        disabled={disabled}
        className={cn(
          controlBaseClasses,
          controlStateClasses(field.hasError),
          INPUT_SIZE_CLASSES[size],
          controlClassName,
        )}
      />
    </Field>
  )
}
