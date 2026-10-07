'use client'

import {
  formatShapeQualifier,
  type ItemResult,
  type LessonContent,
  noteLabelMode,
  sameTuning,
} from '@repo/shared'
import { useEffect, useState } from 'react'
import { ChordDiagram } from '@/components/features/chords/ChordDiagram'
import { SettingsBar } from '@/components/features/settings-menu/SettingsMenu'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { Text } from '@/components/ui/Text'
import { ROUTES } from '@/constants/routes'
import { useLessonRecorder } from '@/hooks/use-lesson-progress'
import { usePreferences } from '@/hooks/use-preferences'
import { toApiError } from '@/services/api-errors'
import { cn } from '@/utils/cn'
import { LessonSteps } from './LessonSteps'

/** The lesson's own column: phone width, centred in the wider page box. */
const LESSON_COLUMN = 'mx-auto w-full max-w-md'

/**
 * One lesson, one item at a time: the chord (or shape) with its diagram, then
 * Skip or Got it. Got it records the item as practiced; Skip records only the
 * skip and leaves it unlearned, so it stays up for review. After the last item
 * the lesson is finished (play count, last played, and completed the first
 * time every item has been learned).
 */
export function LessonPage({ lesson }: { lesson: LessonContent }) {
  // Read live: changing a preference in the menu redraws the current item
  // in place. The lesson's position is local state the menu never touches.
  const { preferences } = usePreferences()
  const { recordItem, finish, isReady } = useLessonRecorder(lesson)
  const [index, setIndex] = useState(0)
  const [pending, setPending] = useState<ItemResult | 'finish' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFinished, setIsFinished] = useState(false)

  const item = lesson.items[index]
  const qualifier = item?.type === 'shape' ? formatShapeQualifier(item) : ''
  const isOtherTuning = Boolean(
    item?.diagram &&
      preferences.instrument === lesson.instrument &&
      !sameTuning(preferences.tuning, item.tuning),
  )
  const total = lesson.items.length
  const isLast = index === total - 1

  // Auto-progress: `index` stays the single source of truth; the timer only
  // calls the same setIndex manual navigation uses. One effect owns the one
  // timer, so it restarts (never stacks) whenever the chord, the duration or
  // the lesson changes, stops when set to Off or the lesson ends, pauses
  // while a result is being saved, and is cleared on unmount. Advancing on
  // time records nothing (time passing isn't "Got it") and loops after the
  // last chord; Got it on the last chord still finishes the lesson.
  const seconds = preferences.autoProgressSeconds
  const isAutoProgress = seconds > 0 && total > 1 && !isFinished
  const isPaused = pending !== null
  // biome-ignore lint/correctness/useExhaustiveDependencies: index and lesson.id aren't read inside, but a change to either must restart the timer. That's how navigation resets the countdown.
  useEffect(() => {
    if (!isAutoProgress || isPaused) return
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % total),
      seconds * 1000,
    )
    return () => window.clearTimeout(timer)
  }, [isAutoProgress, isPaused, seconds, total, index, lesson.id])

  // Settles one item, then advances. Nothing moves on until it's saved: a
  // player who sees the next chord should be able to trust the last one counted.
  const handle = async (result: ItemResult) => {
    if (!item || pending) return
    setError(null)
    setPending(result)
    try {
      await recordItem(item, result)
      if (isLast) {
        setPending('finish')
        await finish()
        setIsFinished(true)
      } else {
        setIndex(index + 1)
      }
    } catch (cause) {
      setError(toApiError(cause).message)
    } finally {
      setPending(null)
    }
  }

  const statusBlock = (
    <div className="flex flex-col items-center gap-1 text-center">
      <Text as="h2" id="current-item" variant="display-2">
        {item?.title}
      </Text>
      {/* Shapes: qualifiers derived from structured fields, then any
          descriptive subtitle. Chords skip the qualifier line, since a
          beginner learning G doesn't need "6th-string root". */}
      {qualifier && (
        <Text variant="paragraph-md" weight="medium" className="text-muted-foreground">
          {qualifier}
        </Text>
      )}
      {item?.subtitle && (
        <Text variant="paragraph-sm" className="text-muted-foreground">
          {item.subtitle}
        </Text>
      )}
      {item?.diagram?.exampleName && (
        <Text variant="paragraph-sm" className="text-muted-foreground">
          Shown as {item.diagram.exampleName}
        </Text>
      )}
    </div>
  )

  return (
    // Three stable regions: top bar, a centre that fills the rest, and bottom
    // controls. The bottom always reserves room for the timer and an error
    // line, so nothing appearing there can push the centre around.
    // The page box matches the home page's (width and padding), so Back and
    // the menu sit where the home header's ends do; the lesson itself stays
    // in a narrow centred column (LESSON_COLUMN).
    <main className="mx-auto grid min-h-dvh w-full max-w-5xl grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4">
        <SettingsBar
          // Small, as in the home header, so the menu button is the same size
          // in the same place on both pages. Back matches it, so the bar's two
          // ends mirror each other.
          size="sm"
          start={
            <LinkButton
              href={ROUTES.home}
              variant="ghost"
              size="sm"
              label="Back"
              leftIcon={<BackArrow />}
              hideLabel
            />
          }
        />
        <header className={cn(LESSON_COLUMN, 'flex flex-col gap-1')}>
          {lesson.lessonNumber !== null && (
            <Text variant="accent-sm" className="text-muted-foreground">
              Lesson {lesson.lessonNumber}
            </Text>
          )}
          <Text as="h1" variant="paragraph-md" weight="medium" className="text-muted-foreground">
            {lesson.name}
          </Text>
        </header>
      </div>

      {total === 0 ? (
        <section
          className={cn(
            LESSON_COLUMN,
            'flex flex-col items-center justify-center gap-4 text-center',
          )}
        >
          <Text variant="paragraph-md" className="text-muted-foreground">
            This lesson isn’t available yet.
          </Text>
        </section>
      ) : isFinished ? (
        <section
          className={cn(
            LESSON_COLUMN,
            'flex flex-col items-center justify-center gap-4 text-center',
          )}
          aria-live="polite"
        >
          <Text as="h2" variant="heading-2">
            Lesson complete
          </Text>
          <LinkButton href={ROUTES.home} label="Back to lessons" />
        </section>
      ) : (
        item && (
          // Equal flexible rows above and below the diagram keep it at the
          // exact centre of this region, however tall the title block or the
          // notes below are.
          <section
            aria-labelledby="current-item"
            className={cn(
              LESSON_COLUMN,
              'grid grid-rows-[1fr_auto_1fr] justify-items-center gap-5',
            )}
          >
            <div className="self-end">{statusBlock}</div>
            <div data-lesson-centre className="flex w-full justify-center">
              {item.diagram ? (
                <ChordDiagram
                  title={item.title}
                  fingering={item.diagram}
                  tuning={item.tuning}
                  handedness={preferences.handedness}
                  labels={noteLabelMode(preferences)}
                  showIntervals={preferences.showIntervals}
                  showTuning
                  // Per position, not per chord name: the same chord twice in
                  // a row still ripples in again.
                  revealKey={`${lesson.id}-${index}`}
                  // As wide as the column, but never so tall that Skip and Got
                  // it fall below the fold: the rest of the screen needs about
                  // 30rem, so on short phones the chart shrinks (keeping its
                  // shape, centred) instead of scrolling. 10rem floor.
                  className="w-full max-w-full max-h-[max(10rem,calc(100dvh-30rem))]"
                  style={{ width: '100%' }}
                />
              ) : (
                <Text variant="paragraph-sm" className="text-muted-foreground">
                  Diagram coming soon.
                </Text>
              )}
            </div>
            <div className="self-start">
              {isOtherTuning && (
                // Fingerings exist only for standard tuning; drawing them in the
                // player's tuning would put the wrong notes on the frets.
                <Text variant="paragraph-sm" className="text-center text-muted-foreground">
                  Shown in standard tuning ({item.tuning.join(' ')}).
                </Text>
              )}
            </div>
          </section>
        )
      )}

      <div className={cn(LESSON_COLUMN, 'flex flex-col gap-3')}>
        {item && !isFinished && total > 0 && (
          <>
            {/* Just above the timer bar: where you are, then how long is left. */}
            <LessonSteps
              current={index}
              steps={lesson.items.map((step) => step.title)}
              // A jump records nothing (it's neither Got it nor Skip), like
              // auto-progress moving on. The new index replays the ripple and
              // restarts the timer, as any chord change does.
              onSelect={(step) => {
                setError(null)
                setIndex(step)
              }}
              disabled={pending !== null}
            />
            {isAutoProgress ? (
              <ChordTimer
                // A new key restarts the bar empty, in step with the timer.
                key={`${lesson.id}-${index}-${seconds}-${isPaused ? 'paused' : 'running'}`}
                seconds={seconds}
                paused={isPaused}
              />
            ) : (
              // Same height as the timer, so switching auto-progress on or off
              // never shifts the layout above.
              <div aria-hidden="true" className="h-1" />
            )}
            {/* Skip, then Got it, rise in once as the lesson appears (this row
                stays mounted across chords). Wrapped, so the entrance and the
                button's own press scale are separate transforms. Never blocks
                a tap: they're clickable from the first frame. */}
            <div className="flex w-full items-center justify-between gap-4">
              <span className="lesson-control-enter inline-flex">
                <Button
                  variant="secondary"
                  onClick={() => void handle('skipped')}
                  loading={pending === 'skipped'}
                  disabled={!isReady || (pending !== null && pending !== 'skipped')}
                  label="Skip"
                />
              </span>
              <span className="lesson-control-enter inline-flex" style={{ animationDelay: '80ms' }}>
                <Button
                  onClick={() => void handle('got_it')}
                  loading={pending === 'got_it' || pending === 'finish'}
                  disabled={!isReady || pending === 'skipped'}
                  label="Got it"
                />
              </span>
            </div>
          </>
        )}
        {/* Reserved one line, so an error appearing doesn't move the centre. */}
        <Text
          variant="paragraph-sm"
          role={error ? 'alert' : undefined}
          className="min-h-[1lh] text-center text-danger"
        >
          {error}
        </Text>
      </div>
    </main>
  )
}

/** A back chevron, sized to match the menu icon opposite. */
function BackArrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      // Fills the button's icon box, which sets its size (unsized, it would collapse).
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </svg>
  )
}

/**
 * Time on the current chord: a thin bar that fills left to right as the
 * timer runs, reaching the end as the next chord comes up. Pure CSS (a scaleX
 * animation from its left edge), so it's smooth and costs no re-renders. It
 * glides continuously in every mode: a thin bar growing
 * isn't the large motion reduced-motion guards against, and stepping made the
 * remaining time harder to read. The bar is decorative; the sr-only line says
 * what happens, once, without a ticking live region.
 */
function ChordTimer({ seconds, paused }: { seconds: number; paused: boolean }) {
  return (
    <div className="w-full">
      {/* Track: a foreground tint, so it shows on any surface in either theme.
          Fill: the brand accent, which keeps ≥3:1 against the page in both. */}
      <div
        aria-hidden="true"
        className="h-1 w-full overflow-hidden rounded-full bg-foreground/15"
        data-chord-timer
      >
        <div
          data-chord-timer-fill
          className="chord-timer h-full w-full origin-left rounded-full bg-control"
          style={{
            animationDuration: `${seconds}s`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>
      <span className="sr-only">Next chord in {seconds} seconds.</span>
    </div>
  )
}
