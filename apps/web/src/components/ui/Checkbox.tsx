'use client'

import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { useId } from 'react'
import { cn } from '@/utils/cn'
import { focusRingClasses } from './Field'
import { textVariants } from './Text'

export type CheckboxProps = {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Short help under the label. */
  description?: string
  className?: string
}

/**
 * An independent on/off option, on the Radix Checkbox: role="checkbox",
 * Space to toggle, the label as part of the target. Use it when several
 * options can be on together; for exactly-one-of, use RadioGroup.
 */
export function Checkbox({
  label,
  checked,
  onCheckedChange,
  description,
  className,
}: CheckboxProps) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn('flex min-h-11 cursor-pointer items-start gap-3 py-2.5', className)}
    >
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        // Name from the label text only; the description stays a description.
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        className={cn(
          'mt-px grid size-5 shrink-0 cursor-pointer place-items-center rounded-md border-2 border-input bg-surface',
          'transition-colors motion-reduce:transition-none hover:border-input-hover',
          'data-[state=checked]:border-control data-[state=checked]:bg-control data-[state=checked]:text-control-foreground',
          focusRingClasses,
          'focus-visible:ring-ring',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <svg
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span className="flex flex-col gap-0.5">
        <span
          id={`${id}-label`}
          className={cn(textVariants({ variant: 'accent-md' }), 'text-foreground')}
        >
          {label}
        </span>
        {description && (
          <span
            id={`${id}-description`}
            className={cn(textVariants({ variant: 'paragraph-sm' }), 'text-muted-foreground')}
          >
            {description}
          </span>
        )}
      </span>
    </label>
  )
}
