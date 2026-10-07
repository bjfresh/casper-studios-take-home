'use client'

import { Switch as SwitchPrimitive } from 'radix-ui'
import { useId } from 'react'
import { cn } from '@/utils/cn'
import { switchThumbClasses, switchTrackClasses } from './Switch'
import { Text, textVariants } from './Text'

export type TwoSidedOption<Value extends string> = {
  value: Value
  label: string
  /** Shown but can't be chosen (e.g. not available yet). */
  disabled?: boolean
  /** Small text after the label, e.g. "(coming soon)". Announced too. */
  hint?: string
}

export type TwoSidedSwitchProps<Value extends string> = {
  /** What the choice is about ("Instrument"); part of the switch's accessible name. */
  label: string
  /** Shown left of the switch; selected when the thumb is on the left. */
  left: TwoSidedOption<Value>
  /** Shown right of the switch; selected when the thumb is on the right. */
  right: TwoSidedOption<Value>
  value: Value
  onValueChange: (value: Value) => void
  /** Show `label` as a visible row heading above the switch. Default true. */
  showLabel?: boolean
  className?: string
}

/**
 * A choice between exactly two values, laid out `Guitar  [switch]  Bass`.
 *
 * Built on the Radix Switch, so it keeps role="switch", Space to toggle and
 * focus behaviour. To assistive tech it's "<label>: <right option>", checked
 * when the right option is chosen, and it says what unchecked means. Neither
 * side is "off", so the track is the control accent in both positions and
 * the thumb's position (and the darker label) shows which side is chosen.
 *
 * The side labels are pointer shortcuts that SELECT their side (not toggle),
 * hidden from assistive tech because the switch already carries the
 * choice; keyboard users use the switch itself.
 *
 * A side can be `disabled`: still shown (dimmed, with its `hint`), but never
 * selectable. The switch is disabled only while it would move TO that side,
 * so someone already on it (a value saved earlier) can still move off it.
 */
export function TwoSidedSwitch<Value extends string>({
  label,
  left,
  right,
  value,
  onValueChange,
  showLabel = true,
  className,
}: TwoSidedSwitchProps<Value>) {
  const id = useId()
  const isRight = value === right.value
  // The side the switch would move to: if it can't be chosen, nor can the switch.
  const isSwitchDisabled = Boolean((isRight ? left : right).disabled)
  const describe = (option: TwoSidedOption<Value>) =>
    `${option.label}${option.hint ? ` ${option.hint}` : ''}${option.disabled ? ', unavailable' : ''}`

  const sideLabel = (option: TwoSidedOption<Value>, isSelected: boolean) => {
    const isUnavailable = Boolean(option.disabled) && !isSelected
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={isUnavailable}
        onClick={() => onValueChange(option.value)}
        className={cn(
          // One weight on both sides, so flipping never reflows the labels;
          // colour shows which side is chosen.
          textVariants({ variant: 'accent-md', weight: 'semibold' }),
          // A generous hit area around a short word.
          'flex min-h-11 cursor-pointer items-center px-1 transition-colors motion-reduce:transition-none',
          isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-muted-foreground',
        )}
      >
        {/* Centred in the tap area; the hint shares the label's baseline. */}
        <span className="flex items-baseline gap-1">
          <span>{option.label}</span>
          {option.hint && (
            <span
              className={cn(
                textVariants({ variant: 'accent-sm', weight: 'regular' }),
                'whitespace-nowrap',
              )}
            >
              {option.hint}
            </span>
          )}
        </span>
      </button>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <Text id={`${id}-label`} variant="accent-sm" className="text-muted-foreground">
          {label}
        </Text>
      )}
      {/* Equal side columns keep the switch centred between labels of any length. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="justify-self-end">{sideLabel(left, !isRight)}</div>
        <SwitchPrimitive.Root
          aria-label={`${label}: ${right.label}`}
          aria-describedby={`${id}-description`}
          checked={isRight}
          disabled={isSwitchDisabled}
          onCheckedChange={(checked) => onValueChange(checked ? right.value : left.value)}
          className={cn(switchTrackClasses, 'bg-control focus-visible:ring-ring')}
        >
          <SwitchPrimitive.Thumb className={switchThumbClasses} />
        </SwitchPrimitive.Root>
        <div className="justify-self-start">{sideLabel(right, isRight)}</div>
      </div>
      <span id={`${id}-description`} className="sr-only">
        Off: {describe(left)}. On: {describe(right)}.
      </span>
    </div>
  )
}
