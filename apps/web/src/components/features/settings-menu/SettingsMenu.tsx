'use client'

import {
  AUTO_PROGRESS_STEPS,
  BASS_STRING_COUNTS,
  displayForMode,
  findTuningPreset,
  formatAutoProgress,
  type NoteLabelMode,
  nearestAutoProgressStep,
  noteLabelMode,
  stringCountFor,
  tuningPresetsFor,
} from '@repo/shared'
import { Popover } from 'radix-ui'
import { type ReactNode, useCallback, useState } from 'react'
import { AccountPanel } from '@/components/features/settings/AccountPanel'
import { Button, type ButtonSize } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioGroup } from '@/components/ui/RadioGroup'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Tabs } from '@/components/ui/Tabs'
import { Text } from '@/components/ui/Text'
import { TwoSidedSwitch } from '@/components/ui/TwoSidedSwitch'
import { useAuth } from '@/hooks/use-auth'
import { usePreferences } from '@/hooks/use-preferences'
import { cn } from '@/utils/cn'

const NOTE_LABEL_OPTIONS = [
  { value: 'notes', label: 'Note names' },
  { value: 'fingers', label: 'Finger numbers' },
  { value: 'none', label: 'None' },
] as const satisfies ReadonlyArray<{ value: NoteLabelMode; label: string }>

const CUSTOM_TUNING = 'custom'

/**
 * A page's top bar, plus the Settings panel it opens. The bar is the popover's
 * ANCHOR, so the panel opens directly under it at exactly its width: the full
 * width of the page's centred container, integrated with the layout rather
 * than a narrow menu or a modal. Nothing navigates, so a lesson in progress
 * keeps its place, and every control applies immediately.
 *
 *   <SettingsBar start={<BackButton />} />
 *   <SettingsBar start={<Brand />} end={<AccountButtons />} />
 */
export function SettingsBar({
  start,
  end,
  size = 'md',
  className,
}: {
  start?: ReactNode
  end?: ReactNode
  /** The menu button's size: match the buttons beside it (`end`, or a Back button). */
  size?: ButtonSize
  className?: string
}) {
  // Every change saves the moment it's made; this only tracks whether this
  // visit changed anything, so the close button can say Save rather than Done.
  const [changed, setChanged] = useState(false)
  const markChanged = useCallback(() => setChanged(true), [])

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) setChanged(false)
      }}
    >
      <Popover.Anchor asChild>
        <div className={cn('flex w-full items-center justify-between gap-2', className)}>
          <div className="flex min-w-0 items-center">{start}</div>
          <div className="flex items-center gap-1">
            {end}
            <Popover.Trigger asChild>
              <Button
                variant="ghost"
                size={size}
                label="Settings"
                leftIcon={<MenuIcon />}
                hideLabel
              />
            </Popover.Trigger>
          </div>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={8}
          // The anchor's width: the container's, not the button's.
          style={{ width: 'var(--radix-popper-anchor-width)' }}
          className={cn(
            '@container z-50 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto',
            'rounded-xl border border-border bg-surface p-5 text-foreground shadow-xl outline-none sm:p-6',
          )}
        >
          <div className="mb-5 flex items-center justify-between">
            <Text as="h2" variant="heading-4">
              Settings
            </Text>
            <Popover.Close asChild>
              {/* Both just close: changes are already saved. Save (blue) once
                  something changed, so it confirms; Done (grey) otherwise. */}
              {changed ? (
                <Button size="sm" label="Save" />
              ) : (
                <Button variant="secondary" size="sm" label="Done" />
              )}
            </Popover.Close>
          </div>
          <SettingsSections onChange={markChanged} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/**
 * Signed in: Preferences and Account tabs. A guest has no account details, so
 * just the preferences, without a one-tab tab bar.
 */
function SettingsSections({ onChange }: { onChange: () => void }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <PreferencesForm onChange={onChange} />
  return (
    <Tabs
      label="Settings sections"
      items={[
        {
          value: 'preferences',
          label: 'Preferences',
          content: <PreferencesForm onChange={onChange} />,
        },
        { value: 'account', label: 'Account', content: <AccountPanel onChange={onChange} /> },
      ]}
    />
  )
}

function PreferencesForm({ onChange }: { onChange: () => void }) {
  const { preferences, update: save } = usePreferences()
  const update = (patch: Parameters<typeof save>[0]) => {
    save(patch)
    onChange()
  }
  const { instrument, handedness, guitarType, bassStringCount, tuning, showIntervals } = preferences
  const isBass = instrument === 'bass'
  const presets = tuningPresetsFor(instrument, stringCountFor(instrument, bassStringCount))
  const currentPreset = findTuningPreset(instrument, tuning)

  return (
    // One column in a narrow container (a lesson); columns when it's wide (home).
    <div className="grid gap-x-8 gap-y-6 @2xl:grid-cols-3 @lg:grid-cols-2">
      <SettingsGroup title="Instrument">
        <TwoSidedSwitch
          label="Instrument"
          left={{ value: 'guitar', label: 'Guitar' }}
          // Bass lessons don't exist yet: shown, not selectable. Someone
          // already on bass (saved before it was disabled) can switch back.
          right={{ value: 'bass', label: 'Bass', disabled: true, hint: '(coming soon)' }}
          value={instrument}
          onValueChange={(next) => update({ instrument: next })}
        />
        {isBass ? (
          <RadioGroup
            label="Number of strings"
            options={BASS_STRING_COUNTS.map((count) => ({
              value: String(count),
              label: String(count),
            }))}
            value={String(bassStringCount ?? 4)}
            onValueChange={(next) => update({ bassStringCount: Number(next) as 4 | 5 | 6 })}
          />
        ) : (
          <RadioGroup
            label="Guitar type"
            options={[
              { value: 'acoustic', label: 'Acoustic' },
              { value: 'electric', label: 'Electric' },
              { value: 'both', label: 'Both' },
            ]}
            value={guitarType}
            onValueChange={(next) => update({ guitarType: next })}
          />
        )}
        <Select
          label="Tuning"
          options={[
            ...presets.map((preset) => ({
              value: preset.id,
              label: preset.name,
              hint: preset.notes.join(' '),
            })),
            // A stored tuning that matches no preset still needs a value to show.
            ...(currentPreset ? [] : [{ value: CUSTOM_TUNING, label: 'Custom' }]),
          ]}
          value={currentPreset?.id ?? CUSTOM_TUNING}
          onValueChange={(id) => {
            const preset = presets.find((candidate) => candidate.id === id)
            if (preset) update({ tuning: [...preset.notes] })
          }}
          description={tuning.join(' ')}
        />
        {/* Last: it doesn't depend on the instrument, so it shouldn't sit
            between the instrument and the choices that follow from it
            (strings or guitar type, then tuning). */}
        <TwoSidedSwitch
          label="Handedness"
          left={{ value: 'left', label: 'Left' }}
          right={{ value: 'right', label: 'Right' }}
          value={handedness}
          onValueChange={(next) => update({ handedness: next })}
        />
      </SettingsGroup>

      <SettingsGroup title="Lesson">
        <AutoProgressControl
          seconds={preferences.autoProgressSeconds}
          onChange={(seconds) => update({ autoProgressSeconds: seconds })}
        />
      </SettingsGroup>

      <SettingsGroup title="Fretboard">
        {/* Exactly one value inside a note circle: a radio group, so note
            names and finger numbers together can't even be selected. */}
        <RadioGroup
          label="Inside each note"
          orientation="vertical"
          options={NOTE_LABEL_OPTIONS}
          value={noteLabelMode(preferences)}
          onValueChange={(mode) => update(displayForMode(mode))}
        />
        {/* Intervals sit under the note, independent of the above: a checkbox. */}
        <Checkbox
          label="Interval labels"
          description="Shown under each note, e.g. 1, ♭3, 5."
          checked={showIntervals}
          onCheckedChange={(checked) => update({ showIntervals: checked })}
        />
      </SettingsGroup>
    </div>
  )
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 border-t border-border pt-4">
      <Text
        as="h3"
        variant="accent-sm"
        weight="semibold"
        className="uppercase text-muted-foreground"
      >
        {title}
      </Text>
      {children}
    </section>
  )
}

/**
 * Seconds per chord, over a NON-linear set of stops (AUTO_PROGRESS_STEPS):
 * the slider moves over their index, so 3/4/5/6s are one keypress apart at
 * the fast end while the slow end jumps 20 → 25 → 30.
 */
function AutoProgressControl({
  seconds,
  onChange,
}: {
  seconds: number
  onChange: (seconds: number) => void
}) {
  const index = AUTO_PROGRESS_STEPS.indexOf(
    nearestAutoProgressStep(seconds) as (typeof AUTO_PROGRESS_STEPS)[number],
  )
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <Text variant="accent-sm" className="text-muted-foreground">
          Auto-progress speed
        </Text>
        <Text variant="accent-md" aria-hidden="true">
          {formatAutoProgress(seconds)}
        </Text>
      </div>
      <Slider
        aria-label="Time per chord"
        valueText={seconds === 0 ? 'Off' : `${seconds} seconds per chord`}
        min={0}
        max={AUTO_PROGRESS_STEPS.length - 1}
        value={Math.max(0, index)}
        onValueChange={(next) => onChange(AUTO_PROGRESS_STEPS[next] ?? 0)}
      />
      <div className="flex justify-between">
        <Text variant="accent-sm" weight="regular" className="text-muted-foreground">
          Faster changes
        </Text>
        <Text variant="accent-sm" weight="regular" className="text-muted-foreground">
          More time per chord
        </Text>
      </div>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg
      // Fills the button's icon box, which sets its size (unsized, it would collapse).
      className="size-full"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
    </svg>
  )
}
