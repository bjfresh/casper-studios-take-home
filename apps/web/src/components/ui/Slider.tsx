'use client'

import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/utils/cn'

export type SliderProps = {
  /** Accessible name for the thumb (the visible label is the caller's). */
  'aria-label': string
  /** What a screen reader hears for the current value ("10 seconds per chord"), not a raw index. */
  valueText: string
  value: number
  min: number
  max: number
  step?: number
  onValueChange: (value: number) => void
  className?: string
}

/**
 * A single-thumb slider on Radix Slider: arrow keys, Home/End and Page keys,
 * pointer drag, and role="slider" with aria-valuetext. For non-linear scales,
 * slide over an index and map it to the real value at the call site.
 */
export function Slider({ value, onValueChange, valueText, className, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      onValueChange={([next]) => next !== undefined && onValueChange(next)}
      min={props.min}
      max={props.max}
      step={props.step ?? 1}
      // 44px tall hit area around a 6px track.
      className={cn('relative flex h-11 w-full touch-none select-none items-center', className)}
    >
      {/* Track: a translucent FOREGROUND tint, so it reads on any surface in
          either theme (bg-muted all but vanishes on a dark surface) without
          competing with the filled range. */}
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-foreground/15">
        <SliderPrimitive.Range className="absolute h-full bg-control" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={props['aria-label']}
        aria-valuetext={valueText}
        data-at-minimum={value === props.min || undefined}
        className={cn(
          'block size-5 cursor-grab rounded-full border-2 border-control bg-surface shadow-sm',
          // At the minimum ("Off" for auto-progress) the thumb goes neutral:
          // nothing is filled, so a control-coloured thumb would overstate it.
          'data-[at-minimum]:border-muted-foreground',
          'transition-transform active:cursor-grabbing active:scale-110 motion-reduce:transition-none',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        )}
      />
    </SliderPrimitive.Root>
  )
}
