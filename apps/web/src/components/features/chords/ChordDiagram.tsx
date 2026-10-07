import { type ChordInterval, formatInterval, type Handedness, type Prettify } from '@repo/shared'
import { type ComponentPropsWithoutRef, type CSSProperties, useId } from 'react'
import { cn } from '@/utils/cn'
import {
  type ChordFingering,
  computeFretWindow,
  describeFingering,
  FRET_ROWS,
  stringColumn,
  stringStrokeWidth,
  tuningNote,
} from './chord-diagram-layout'

/** One label layer at a time: two overlays at once crowd a small diagram. */
export type ChordDiagramLabels = 'none' | 'notes' | 'fingers'

export type ChordDiagramProps = Prettify<
  Omit<ComponentPropsWithoutRef<'svg'>, 'children'> & {
    fingering: ChordFingering
    /** Open-string notes, low → high. Its length is the string count. */
    tuning: readonly string[]
    handedness?: Handedness
    /** Accessible name, e.g. "C major". The description is generated from the fingering. */
    title: string
    /** Overlay inside the markers. Default: none (beginner view). */
    labels?: ChordDiagramLabels
    /**
     * Each note's interval ('1', '♭3'…), small and under its marker (above it,
     * for open strings). Independent of `labels`.
     */
    showIntervals?: boolean
    /** Show the tuning under the strings. */
    showTuning?: boolean
    /** Fret rows drawn, the same for every chord (the window shifts instead). */
    rows?: number
    /**
     * Identifies the chord on display. When it changes, the notes ripple in
     * again, string by string. Defaults to the title.
     */
    revealKey?: string
  }
>

// Geometry in viewBox units; the SVG scales to whatever width it's given.
// At the default scale (1.25px per unit) the ring is 4px and the gap 2.5px.
const STRING_GAP = 28
const FRET_GAP = 30
const ORB_R = 7.5
const RING_GAP = 2
const RING_WIDTH = 3.2
/** Centre line of the ring's stroke. */
const RING_R = ORB_R + RING_GAP + RING_WIDTH / 2
/** Outer edge of a marker. Under STRING_GAP / 2, so neighbours never touch. */
const MARKER_OUTER_R = ORB_R + RING_GAP + RING_WIDTH
/** Clear space beside the outer strings, for their markers' rings. */
const EDGE = 14
/** The column left of the grid that carries the fret label ("7fr"). */
const FRET_LABEL_COLUMN = 20
// Symmetric, so the grid stays centred in the drawing.
const PAD_X = EDGE + FRET_LABEL_COLUMN
const NUT_HEIGHT = 5
const INDICATOR_ROW = 20
const TUNING_ROW = 18
/** Room for one line of interval text. */
const INTERVAL_ROW = 12
/** From a marker's outer edge to its interval label's centre. */
const INTERVAL_OFFSET = 7
/**
 * Inside-the-orb labels use the rounded accent face (Quicksand, as on form
 * labels and buttons) at a fixed size for every value: note names and
 * finger numbers alike.
 */
const NOTE_LABEL_FONT = 'font-accent text-[10px] font-bold'
/** Cap height of the label face as a fraction of its size, for optical centring. */
const CAP_HEIGHT_EM = 0.7
/** Gap between one string's note and the next one's, as the chord ripples in. */
const REVEAL_STAGGER_MS = 50

/**
 * A chord or fingering diagram: vertical strings, horizontal frets and a
 * marker for each played note: an orb inside a floating ring. Every ring is
 * faint; a root's is at full strength. That's the one root highlight, and
 * it's a shape, not a colour.
 *
 * The grid is a stable stage. It always draws `rows` frets and reserves its
 * open/muted and fret-label space, so its size and position depend only on
 * the string count and display settings, never on the chord. Only the
 * markers change, rippling in string by string (globals.css, .chord-note-enter).
 *
 * Adapts to string count and tuning (any length), handedness (mirrored), and
 * position: the nut near the headstock, a fret label further up. Pure SVG on
 * theme tokens, so it scales crisply and follows dark mode.
 */
export function ChordDiagram({
  fingering,
  tuning,
  handedness = 'right',
  title,
  labels = 'none',
  showIntervals = false,
  showTuning = false,
  rows: rowCount = FRET_ROWS,
  revealKey = title,
  className,
  style,
  ...props
}: ChordDiagramProps) {
  const id = useId()
  const stringCount = tuning.length
  const { positions, mutedStrings = [] } = fingering
  const { startFret, rows, showNut } = computeFretWindow(positions, { rows: rowCount })

  // Vertical stack, top to bottom: open-string intervals (when shown), the
  // open/muted row, the grid, the last row's intervals, the tuning. Each row
  // depends on a setting, never on the chord, so chords never move the grid.
  const openIntervalTop = 0
  const indicatorTop = openIntervalTop + (showIntervals ? INTERVAL_ROW : 0)
  const gridTop = indicatorTop + INDICATOR_ROW
  const gridHeight = rows * FRET_GAP
  const gridBottom = gridTop + gridHeight
  const height = gridBottom + (showIntervals ? INTERVAL_ROW : 0) + (showTuning ? TUNING_ROW : 8)
  const gridWidth = (stringCount - 1) * STRING_GAP
  const width = gridWidth + PAD_X * 2

  const x = (string: number) => PAD_X + stringColumn(string, stringCount, handedness) * STRING_GAP
  const markerY = (fret: number) => gridTop + (fret - startFret + 0.5) * FRET_GAP
  // Biased upward so open/muted symbols clear the nut.
  const indicatorY = indicatorTop + INDICATOR_ROW / 2 - 2
  const isVisible = (fret: number) => fret >= startFret && fret < startFret + rows

  const open = positions.filter((position) => position.fret === 0)
  const fretted = positions.filter((position) => position.fret > 0 && isVisible(position.fret))
  // Inside the marker: note name OR finger number, never both (the settings
  // model enforces it; `labels` is one value, so this can't express both).
  // Only fretted markers have an inside, so open strings never get a finger.
  const label = (position: (typeof positions)[number]) =>
    labels === 'notes' ? position.note : labels === 'fingers' ? position.finger : undefined

  // The ripple runs across the strings as DRAWN (left to right, so mirrored
  // for left-handers), counting only strings with a note: an empty string
  // adds no delay.
  const revealOrder = [...new Set([...open, ...fretted].map((position) => position.string))].sort(
    (a, b) => stringColumn(a, stringCount, handedness) - stringColumn(b, stringCount, handedness),
  )
  const revealStyle = (string: number): CSSProperties => ({
    animationDelay: `${revealOrder.indexOf(string) * REVEAL_STAGGER_MS}ms`,
  })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      // Width follows the drawing (more strings → wider), so every diagram
      // draws strings and frets at the same size whatever its string count.
      // Scale them all together with --chord-diagram-scale.
      style={{ width: `calc(${width}px * var(--chord-diagram-scale, 1.25))`, ...style }}
      className={cn('h-auto max-w-full select-none font-sans', className)}
      {...props}
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{describeFingering(fingering, tuning)}</desc>

      {/* Fret lines. With the nut shown, the top line IS the nut (drawn below). */}
      {Array.from({ length: rows + 1 }, (_, line) => startFret + line).map((fret, line) => (
        <line
          key={`fret-${fret}`}
          x1={PAD_X}
          x2={PAD_X + gridWidth}
          y1={gridTop + line * FRET_GAP}
          y2={gridTop + line * FRET_GAP}
          strokeWidth={1}
          className="stroke-foreground/25"
          data-fret={fret}
        />
      ))}
      {showNut ? (
        <rect
          x={PAD_X - 1}
          y={gridTop - NUT_HEIGHT}
          width={gridWidth + 2}
          height={NUT_HEIGHT}
          rx={1}
          className="fill-foreground"
          data-testid="nut"
        />
      ) : (
        // Beside the first row, in its own column: above the grid it would
        // need a row that open chords don't, and the grid would jump.
        <text
          x={PAD_X - EDGE - 2}
          y={gridTop + FRET_GAP / 2}
          dy={`${CAP_HEIGHT_EM / 2}em`}
          textAnchor="end"
          className="fill-muted-foreground font-accent text-[9px] font-semibold"
          data-testid="fret-number"
        >
          <tspan data-fret-number>{startFret}</tspan>
          <tspan className="text-[7px]">fr</tspan>
        </text>
      )}

      {/* Strings: thicker for lower strings. */}
      {Array.from({ length: stringCount }, (_, index) => {
        const string = index + 1
        return (
          <line
            key={`string-${string}`}
            x1={x(string)}
            x2={x(string)}
            y1={gridTop}
            y2={gridBottom}
            strokeWidth={stringStrokeWidth(string, stringCount)}
            className="stroke-foreground/55"
            data-string={string}
          />
        )
      })}

      {/* Muted strings (×) are part of the chord but not notes: they appear
          with it, without the ripple. */}
      {mutedStrings.map((string) => (
        <g
          key={`muted-${string}`}
          data-indicator="muted"
          data-string={string}
          strokeWidth={1.5}
          strokeLinecap="round"
          className="stroke-muted-foreground"
        >
          <line x1={x(string) - 4} x2={x(string) + 4} y1={indicatorY - 4} y2={indicatorY + 4} />
          <line x1={x(string) - 4} x2={x(string) + 4} y1={indicatorY + 4} y2={indicatorY - 4} />
        </g>
      ))}

      {/* The notes. Keyed by the chord, so a new chord mounts fresh markers and
          the ripple restarts cleanly: nothing from the last chord keeps
          animating. */}
      <g key={revealKey} data-notes>
        {open.map((position) => (
          <g
            key={`open-${position.string}`}
            className="chord-note-enter"
            style={revealStyle(position.string)}
            data-indicator="open"
            data-string={position.string}
            data-reveal={revealOrder.indexOf(position.string)}
          >
            <circle
              cx={x(position.string)}
              cy={indicatorY}
              r={4.5}
              strokeWidth={1.5}
              className="fill-none stroke-note-ring"
            />
            {position.isRoot && (
              <circle
                cx={x(position.string)}
                cy={indicatorY}
                r={7.5}
                strokeWidth={1.25}
                className="fill-none stroke-note-ring"
                data-root="true"
              />
            )}
            {showIntervals && position.interval && (
              // Above, not below: below an open-string circle is the nut.
              <IntervalLabel
                x={x(position.string)}
                y={openIntervalTop + INTERVAL_ROW / 2}
                interval={position.interval}
              />
            )}
          </g>
        ))}

        {fretted.map((position) => {
          const cx = x(position.string)
          const cy = markerY(position.fret)
          const text = label(position)
          return (
            // Two groups, so the transforms compose: the outer one runs the
            // entrance, the inner one hover and press (globals.css).
            <g
              key={`note-${position.string}-${position.fret}`}
              className="chord-note-enter"
              style={revealStyle(position.string)}
              data-marker
              data-string={position.string}
              data-reveal={revealOrder.indexOf(position.string)}
            >
              <g className="chord-note" data-root={position.isRoot ? 'true' : undefined}>
                {/* Backdrop: the page colour under the whole marker, so the
                    string and fret lines stop at its edge instead of showing
                    through the gap between orb and ring. */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={MARKER_OUTER_R}
                  className="fill-background"
                  data-backdrop
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={RING_R}
                  fill="none"
                  // Flat: the ring and orb are plain brand blue, no gradient.
                  className="chord-note-ring stroke-note-ring"
                  strokeWidth={RING_WIDTH}
                  data-ring
                />
                <circle cx={cx} cy={cy} r={ORB_R} className="chord-note-orb fill-note" data-orb />
                {text !== undefined && (
                  <text
                    x={cx}
                    y={cy}
                    // Centre the GLYPHS, not the em box: on the alphabetic
                    // baseline, dropped by half the cap height. dominant-baseline
                    // "central" centres the em box, descender space included, so
                    // capitals and digits (C, F♯, 1–4) sat visibly high.
                    dy={`${CAP_HEIGHT_EM / 2}em`}
                    textAnchor="middle"
                    className={cn(NOTE_LABEL_FONT, 'fill-note-foreground')}
                    data-label="inside"
                  >
                    {text}
                  </text>
                )}
              </g>
              {showIntervals && position.interval && (
                // Below the ring, with clear space so it never touches the
                // marker, close enough to read as this note's. A chord has
                // one note per string, so nothing sits right below.
                <IntervalLabel
                  x={cx}
                  y={cy + MARKER_OUTER_R + INTERVAL_OFFSET}
                  interval={position.interval}
                />
              )}
            </g>
          )
        })}
      </g>

      {showTuning &&
        Array.from({ length: stringCount }, (_, index) => {
          const string = index + 1
          return (
            <text
              key={`tuning-${string}`}
              x={x(string)}
              y={gridBottom + TUNING_ROW / 2 + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px] font-medium"
              data-tuning={string}
            >
              {tuningNote(tuning, string)}
            </text>
          )
        })}
    </svg>
  )
}

/** Interval text size, in viewBox units. */
const INTERVAL_FONT_SIZE = 8.5
/**
 * The interval disc's radius: half the glyphs' height (cap height, since
 * intervals are digits and accidentals) plus ~2px of clear space beyond the
 * top of the number at lesson size.
 */
const INTERVAL_DISC_R = (INTERVAL_FONT_SIZE * CAP_HEIGHT_EM) / 2 + 2
/** Rough advance per character, to widen the disc into a pill for "♭13". */
const INTERVAL_CHAR_WIDTH = INTERVAL_FONT_SIZE * 0.62

/**
 * Small, in the brand accent (fill-interval), so it reads as a separate layer
 * from the note names and fingers inside the markers. It sits on a disc in
 * the page colour, centred on the glyphs and reaching ~2px past their top,
 * so string and fret lines stop short of it instead of running through the
 * number. Short labels ("1", "♭3") get a circle; longer ones a pill of the
 * same height, so nothing is clipped.
 */
function IntervalLabel({ x, y, interval }: { x: number; y: number; interval: ChordInterval }) {
  const text = formatInterval(interval)
  const width = Math.max(INTERVAL_DISC_R * 2, text.length * INTERVAL_CHAR_WIDTH + 3)
  return (
    <g data-interval-label>
      <rect
        x={x - width / 2}
        y={y - INTERVAL_DISC_R}
        width={width}
        height={INTERVAL_DISC_R * 2}
        rx={INTERVAL_DISC_R}
        className="fill-background"
        data-interval-backdrop
      />
      <text
        x={x}
        y={y}
        // Centre the glyphs, not the em box (as inside the markers).
        dy={`${CAP_HEIGHT_EM / 2}em`}
        textAnchor="middle"
        className="fill-interval text-[8.5px] font-bold"
        data-interval={interval}
      >
        {text}
      </text>
    </g>
  )
}
