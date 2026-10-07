'use client'

import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { useId } from 'react'
import { cn } from '@/utils/cn'
import { focusRingClasses } from './Field'
import { Text, textVariants } from './Text'

export type RadioOption<Value extends string> = { value: Value; label: string }

export type RadioGroupProps<Value extends string> = {
  /** Visible group label; also the radiogroup's accessible name. */
  label: string
  options: ReadonlyArray<RadioOption<Value>>
  /** Null shows nothing selected yet (e.g. a guitar type not chosen). */
  value: Value | null
  onValueChange: (value: Value) => void
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * Exactly one of a few values, on the Radix RadioGroup: role="radiogroup",
 * arrow keys between options, one Tab stop for the group. Use it wherever one
 * option must be chosen; it makes "two at once" impossible to express.
 */
export function RadioGroup<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  orientation = 'horizontal',
  className,
}: RadioGroupProps<Value>) {
  const labelId = useId()
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Text id={labelId} variant="accent-sm" className="text-muted-foreground">
        {label}
      </Text>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        value={value ?? ''}
        onValueChange={(next) => onValueChange(next as Value)}
        // Layout only: left to Radix, every arrow key moves (as the ARIA radio
        // pattern expects); a Radix orientation would ignore half of them.
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row flex-wrap gap-x-5' : 'flex-col',
        )}
      >
        {options.map((option) => {
          const id = `${labelId}-${option.value}`
          return (
            // The whole row is the target (≥44px tall), not just the circle.
            <label
              key={option.value}
              htmlFor={id}
              className="flex min-h-11 cursor-pointer items-center gap-2"
            >
              <RadioGroupPrimitive.Item
                id={id}
                value={option.value}
                className={cn(
                  'grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-input bg-surface',
                  'transition-colors motion-reduce:transition-none hover:border-input-hover',
                  'data-[state=checked]:border-control',
                  focusRingClasses,
                  'focus-visible:ring-ring',
                )}
              >
                <RadioGroupPrimitive.Indicator className="block size-2.5 rounded-full bg-control" />
              </RadioGroupPrimitive.Item>
              <span
                className={cn(
                  textVariants({ variant: 'accent-md', weight: 'regular' }),
                  'text-foreground',
                )}
              >
                {option.label}
              </span>
            </label>
          )
        })}
      </RadioGroupPrimitive.Root>
    </div>
  )
}
