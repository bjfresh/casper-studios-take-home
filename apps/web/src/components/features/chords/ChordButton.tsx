'use client'

import type { Prettify } from '@repo/shared'
import { type ComponentPropsWithRef, type CSSProperties, type ReactNode, useId } from 'react'
import { Text, type TextVariant } from '@/components/ui/Text'
import { cn } from '@/utils/cn'

/** Lesson state. Orthogonal to `selected`: a learned chord can be the current one. */
export type ChordButtonStatus = 'default' | 'learning' | 'completed' | 'locked'
export type ChordButtonSize = 'sm' | 'md' | 'lg'

export const CHORD_BUTTON_STATUSES = [
  'default',
  'learning',
  'completed',
  'locked',
] as const satisfies readonly ChordButtonStatus[]

export const CHORD_BUTTON_SIZES = ['sm', 'md', 'lg'] as const satisfies readonly ChordButtonSize[]

// Announced after the chord name, so state never relies on colour or a glyph
// alone: "D7, learned".
const STATUS_TEXT = {
  default: null,
  learning: 'new',
  completed: 'learned',
  locked: 'locked',
} as const satisfies Record<ChordButtonStatus, string | null>

/** The ring is 4px wide and floats 3px off the orb at every size; only the orb grows. */
export const RING_WIDTH = 4
export const RING_GAP = 3

/** Overall diameter in px. md/lg are the 58–64px chord markers; sm is for dense grids (≥44px target). */
export const CHORD_BUTTON_DIAMETER = { sm: 48, md: 60, lg: 64 } as const satisfies Record<
  ChordButtonSize,
  number
>

const SIZE_CLASSES = {
  sm: 'size-12',
  md: 'size-[60px]',
  lg: 'size-16',
} as const satisfies Record<ChordButtonSize, string>

/** The longer the symbol, the smaller the type, so "Cmaj7" fits as well as "G". */
function labelVariant(label: string, size: ChordButtonSize): TextVariant {
  const long = label.length >= 5
  const medium = label.length >= 3
  if (size === 'sm') return long ? 'accent-sm' : medium ? 'accent-sm' : 'accent-lg'
  if (size === 'md') return long ? 'accent-sm' : medium ? 'accent-md' : 'accent-xl'
  return long ? 'accent-md' : medium ? 'accent-lg' : 'accent-xl'
}

/**
 * A 4px annulus at the outer edge, carved by a radial mask. A CSS border
 * can't vary its opacity around the circle or fade between states, and this
 * can. The half-pixel soft stop keeps the edge crisp but anti-aliased.
 */
const RING_MASK = `radial-gradient(farthest-side, transparent calc(100% - ${RING_WIDTH}px - 0.5px), #000 calc(100% - ${RING_WIDTH}px))`

/**
 * A restrained conic variation (100% ↔ 70% of the ring colour), so the ring
 * reads as slightly material. With the layer's own opacity (~18% at rest),
 * the effective range is roughly 13–18%; at hover, roughly 25–35%.
 */
const ringStyle = (colorVar: string): CSSProperties => ({
  backgroundImage: `conic-gradient(from 210deg, var(${colorVar}), color-mix(in oklch, var(${colorVar}) 70%, transparent), var(${colorVar}), color-mix(in oklch, var(${colorVar}) 70%, transparent), var(${colorVar}))`,
  mask: RING_MASK,
  WebkitMask: RING_MASK,
})

/**
 * Orb depth: one quiet radial gradient (a touch lighter toward the top-left,
 * settling into the muted tone at the edge) plus a hairline inset highlight.
 * Static: no animation, gloss or glow. States change a tint layer over it.
 */
const ORB_STYLE: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle at 35% 28%, color-mix(in oklch, var(--surface) 92%, white), var(--surface) 45%, color-mix(in oklch, var(--muted) 80%, var(--surface)) 100%)',
}

const TRANSITION =
  'transition-[opacity,background-color,transform,filter] duration-150 ease-out motion-reduce:transition-none'

export type ChordButtonProps = Prettify<
  Omit<ComponentPropsWithRef<'button'>, 'children' | 'disabled'> & {
    /** The chord symbol: G, Am, D7, Cmaj7. Use chordSymbol() from @repo/shared. */
    label: string
    /** Optional small text inside the orb, under the label. */
    secondaryLabel?: string
    /** Optional caption under the button (outside the circle). */
    caption?: ReactNode
    status?: ChordButtonStatus
    /** The currently selected chord (aria-pressed): the strongest persistent state. */
    selected?: boolean
    size?: ChordButtonSize
  }
>

/**
 * A chord marker: a quiet, dimensional orb with the chord name, floating
 * inside a crisp 4px ring with a 3px gap. The ring carries the state:
 *
 *   default   neutral ring ~18%
 *   hover     neutral ring ~35%, orb a shade brighter
 *   pressed   whole control scales to 0.97, orb a shade darker, ring ~50%
 *   learning  primary ring ~35% plus a small dot
 *   selected  primary ring at full strength, orb tinted richer, label in
 *             primary: the strongest state, and never glow alone
 *   locked    flat orb, faint ring, muted label, lock badge, disabled
 *
 * Every status also has a glyph and announced text, so none relies on colour.
 */
export function ChordButton({
  label,
  secondaryLabel,
  caption,
  status = 'default',
  selected = false,
  size = 'md',
  className,
  type,
  ...props
}: ChordButtonProps) {
  const captionId = useId()
  const isLocked = status === 'locked'
  const isLearning = status === 'learning'
  const statusText = STATUS_TEXT[status]
  // An explicit name, so it's exactly "D7, learned": computed from the
  // visible spans, browsers insert their own spacing between them.
  const accessibleName = statusText ? `${label}, ${statusText}` : label

  return (
    <button
      {...props}
      type={type ?? 'button'}
      disabled={isLocked}
      aria-pressed={selected}
      aria-label={accessibleName}
      aria-describedby={caption ? captionId : undefined}
      data-status={status}
      data-selected={selected || undefined}
      className={cn(
        // The button is the footprint (and the hit area); the circle sits inside it.
        'group inline-flex cursor-pointer flex-col items-center gap-1.5 rounded-xl outline-none',
        'disabled:cursor-not-allowed',
        className,
      )}
    >
      <span
        data-chord-marker
        className={cn(
          'relative grid shrink-0 place-items-center rounded-full',
          SIZE_CLASSES[size],
          TRANSITION,
          'group-enabled:group-active:scale-[0.97]',
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring',
        )}
      >
        {/* Neutral ring: present at rest, firmer on hover and press. Hidden when
            the primary ring takes over, so they never stack into a muddy blend. */}
        <span
          aria-hidden="true"
          data-ring="neutral"
          style={ringStyle('--foreground')}
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full opacity-[0.18]',
            TRANSITION,
            'group-enabled:group-hover:opacity-[0.35] group-enabled:group-active:opacity-50',
            'group-disabled:opacity-10',
            (selected || isLearning) &&
              'opacity-0 group-enabled:group-hover:opacity-0 group-enabled:group-active:opacity-0',
          )}
        />
        {/* Primary ring: the state ring. Learning is a partial ring; selected is full. */}
        <span
          aria-hidden="true"
          data-ring="primary"
          style={ringStyle('--primary')}
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full opacity-0',
            TRANSITION,
            isLearning && 'opacity-[0.35] group-enabled:group-hover:opacity-50',
            // A 1px, barely-there edge glow: polish, not the signal. The opacity is.
            selected &&
              'opacity-100 drop-shadow-[0_0_1px_var(--primary)] group-enabled:group-hover:opacity-100',
          )}
        />

        {/* The orb, inset by ring + gap. */}
        <span
          data-orb
          style={{ ...ORB_STYLE, inset: RING_WIDTH + RING_GAP }}
          className={cn(
            'absolute grid place-items-center overflow-hidden rounded-full',
            'shadow-[inset_0_1px_0_rgb(255_255_255/0.55),inset_0_-1px_1px_rgb(0_0_0/0.06)]',
            'dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.07),inset_0_-1px_1px_rgb(0_0_0/0.35)]',
            'group-disabled:bg-muted group-disabled:bg-none group-disabled:shadow-none',
          )}
        >
          {/* State tint over the static gradient: brighter on hover, darker
              pressed, a richer primary wash when selected. */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 rounded-full bg-transparent',
              TRANSITION,
              'group-enabled:group-hover:bg-white/[0.06] dark:group-enabled:group-hover:bg-white/[0.04]',
              'group-enabled:group-active:bg-black/[0.06]',
              selected &&
                'bg-primary/[0.09] group-enabled:group-hover:bg-primary/[0.12] group-enabled:group-active:bg-primary/[0.16]',
            )}
          />
          <span className="relative flex flex-col items-center leading-none">
            <Text
              as="span"
              variant={labelVariant(label, size)}
              weight="semibold"
              className={cn(
                'text-foreground',
                selected && 'text-primary',
                'group-disabled:text-muted-foreground',
              )}
            >
              {label}
            </Text>
            {secondaryLabel && (
              <Text
                as="span"
                variant="accent-sm"
                weight="regular"
                className="text-muted-foreground"
              >
                {secondaryLabel}
              </Text>
            )}
          </span>
        </span>

        <StatusBadge status={status} size={size} />
      </span>
      {caption && (
        <Text
          as="span"
          id={captionId}
          variant="accent-sm"
          weight="regular"
          className="text-muted-foreground"
        >
          {caption}
        </Text>
      )}
    </button>
  )
}

const BADGE_POSITION = {
  sm: '-top-0.5 -right-0.5 size-4',
  md: '-top-0.5 -right-0.5 size-5',
  lg: 'top-0 right-0 size-5',
} as const satisfies Record<ChordButtonSize, string>

/** Small corner accent. Decorative (aria-hidden): the status is announced as text. */
function StatusBadge({ status, size }: { status: ChordButtonStatus; size: ChordButtonSize }) {
  if (status === 'default') return null

  if (status === 'learning') {
    // A dot, not a badge: encouraging, not urgent.
    return (
      <span
        aria-hidden="true"
        data-badge="learning"
        className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background"
      />
    )
  }

  const isCompleted = status === 'completed'
  return (
    <span
      aria-hidden="true"
      data-badge={status}
      className={cn(
        'absolute grid place-items-center rounded-full ring-2 ring-background',
        BADGE_POSITION[size],
        isCompleted ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-[70%]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isCompleted ? (
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
        ) : (
          <>
            <rect x={3.5} y={7} width={9} height={6.5} rx={1.5} fill="currentColor" stroke="none" />
            <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
          </>
        )}
      </svg>
    </span>
  )
}
