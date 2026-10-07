'use client'

import { focusRingClasses } from '@/components/ui/Field'
import { cn } from '@/utils/cn'

export type LessonStepsProps = {
  /** Zero-based index of the current step. */
  current: number
  /** One name per step, in order ("G", "C"…): what each dot jumps to. */
  steps: readonly string[]
  /** Jump to a step. */
  onSelect: (step: number) => void
  /** While a result is saving: shown, but not tappable. */
  disabled?: boolean
  className?: string
}

/**
 * Where the player is in the lesson, as pagination dots: one per step, all
 * alike, with the current one filled in the brand accent. Each dot is a button that
 * jumps to its step. Fixed size, so moving between steps never shifts the
 * layout.
 *
 * Each dot's tap target is 32×44px around an 8px dot: tall enough to hit
 * easily, narrow enough that a dozen steps still fit on one line. Buttons are
 * named "Go to chord 3: C", the current one marked aria-current="step", and
 * each new step is announced politely ("Chord 3 of 4").
 */
export function LessonSteps({ current, steps, onSelect, disabled, className }: LessonStepsProps) {
  const total = steps.length
  const position = `Chord ${current + 1} of ${total}`
  return (
    <nav aria-label="Lesson progress" className={className}>
      <ol className="flex flex-wrap items-center justify-center">
        {steps.map((name, step) => {
          const isCurrent = step === current
          return (
            // Steps are positions, fixed for the lesson: the index IS the identity.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <li key={step}>
              <button
                type="button"
                aria-label={`Go to chord ${step + 1}: ${name}`}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={disabled}
                onClick={() => {
                  if (!isCurrent) onSelect(step)
                }}
                className={cn(
                  'group grid h-11 w-8 cursor-pointer place-items-center rounded-full',
                  'disabled:cursor-not-allowed',
                  focusRingClasses,
                  'focus-visible:ring-ring',
                )}
              >
                <span
                  aria-hidden="true"
                  data-current={isCurrent || undefined}
                  className={cn(
                    'size-2 rounded-full',
                    // A state change, not an entrance: a quick colour
                    // transition, off for reduced motion.
                    'transition-colors duration-200 ease-out motion-reduce:transition-none',
                    isCurrent
                      ? 'bg-control'
                      : 'bg-foreground/20 group-enabled:group-hover:bg-foreground/45',
                  )}
                />
              </button>
            </li>
          )
        })}
      </ol>
      <span className="sr-only" aria-live="polite">
        {position}
      </span>
    </nav>
  )
}
