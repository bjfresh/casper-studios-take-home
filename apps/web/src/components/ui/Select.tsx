'use client'

import { Select as SelectPrimitive } from 'radix-ui'
import { useId } from 'react'
import { cn } from '@/utils/cn'
import { controlBaseClasses, controlStateClasses } from './Field'
import { Text, textVariants } from './Text'

export type SelectOption<Value extends string> = { value: Value; label: string; hint?: string }

export type SelectProps<Value extends string> = {
  label: string
  options: ReadonlyArray<SelectOption<Value>>
  value: Value
  onValueChange: (value: Value) => void
  /** Text tied to the trigger as its description (e.g. the tuning's notes). */
  description?: string
  className?: string
}

/**
 * One value from a list, on the Radix Select (not the native <select>):
 * keyboard type-ahead, arrow keys and Escape, role="combobox" + listbox, and
 * a popup styled like the rest of the design system. The trigger shares the
 * form-control base classes, so it matches Input.
 */
export function Select<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  description,
  className,
}: SelectProps<Value>) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className={cn(textVariants({ variant: 'accent-sm' }), 'text-muted-foreground')}
      >
        {label}
      </label>
      <SelectPrimitive.Root value={value} onValueChange={(next) => onValueChange(next as Value)}>
        <SelectPrimitive.Trigger
          id={id}
          aria-describedby={description ? `${id}-description` : undefined}
          className={cn(
            controlBaseClasses,
            controlStateClasses(false),
            'flex h-11 cursor-pointer items-center justify-between gap-2 text-left',
          )}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon className="text-muted-foreground">
            <Chevron />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            // Above the settings popover it may open from.
            className={cn(
              'z-[60] max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)]',
              'overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl',
            )}
          >
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 rounded-md py-2 pr-3 pl-8 outline-none',
                    textVariants({ variant: 'accent-md', weight: 'regular' }),
                    'text-foreground data-[highlighted]:bg-accent',
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 text-control">
                    <Check />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.hint && (
                    <span
                      className={cn(
                        textVariants({ variant: 'accent-sm', weight: 'regular' }),
                        'text-muted-foreground',
                      )}
                    >
                      {option.hint}
                    </span>
                  )}
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {description && (
        <div>
          <Text
            inline
            id={`${id}-description`}
            variant="field-inline"
            className="text-muted-foreground"
          >
            {description}
          </Text>
        </div>
      )}
    </div>
  )
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  )
}

function Check() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  )
}
