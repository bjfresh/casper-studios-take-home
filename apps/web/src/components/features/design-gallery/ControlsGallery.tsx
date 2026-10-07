'use client'

import { type ReactNode, useState } from 'react'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { RadioGroup } from '@/components/ui/RadioGroup'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { Text } from '@/components/ui/Text'
import { TextArea } from '@/components/ui/TextArea'
import { TwoSidedSwitch } from '@/components/ui/TwoSidedSwitch'

/** Every form control, live, in each state worth checking in both themes. */
export function ControlsGallery() {
  return (
    <div className="flex flex-col gap-10">
      <FieldControls />
      <ChoiceControls />
    </div>
  )
}

/** Text entry: Input and TextArea through their Field states. */
function FieldControls() {
  return (
    <div className="grid max-w-3xl gap-x-10 gap-y-6 sm:grid-cols-2">
      <Input label="Email" type="email" placeholder="you@example.com" required />
      <Input label="Display name" description="Shown on your profile." defaultValue="Paul" />
      <Input label="Broken field" error="This name is already taken." defaultValue="taken" />
      <Input label="Disabled" disabled defaultValue="Can’t edit" />
      <Input label="With a hint" hint="Optional" />
      <Input
        label="Reserved error space"
        description="The layout stays put when an error appears."
        reserveErrorSpace
      />
      <Input label="Small" size="sm" placeholder="h-8" />
      <Input label="Large" size="lg" placeholder="h-12" />
      <TextArea
        label="Notes"
        description="Grows as you type, up to 6 rows."
        minRows={3}
        maxRows={6}
      />
      <TextArea
        label="Fixed height"
        description="autoGrow off: drag the handle instead."
        autoGrow={false}
        minRows={3}
      />
    </div>
  )
}

/** Selection: switches, radios, checkboxes, select and slider. */
function ChoiceControls() {
  const [offSlider, setOffSlider] = useState(0)
  const [slider, setSlider] = useState(5)
  const [instrument, setInstrument] = useState<'guitar' | 'bass'>('guitar')
  const [hand, setHand] = useState<'left' | 'right'>('right')
  const [guitarType, setGuitarType] = useState<'acoustic' | 'electric' | 'both' | null>(null)
  const [labels, setLabels] = useState<'notes' | 'fingers' | 'none'>('notes')
  const [tuning, setTuning] = useState('standard')
  const [checked, setChecked] = useState(true)
  const [unchecked, setUnchecked] = useState(false)
  const [on, setOn] = useState(true)
  const [off, setOff] = useState(false)

  return (
    <div className="grid max-w-3xl gap-x-10 gap-y-8 sm:grid-cols-2">
      <Demo caption="Switch: on, off, disabled">
        <div className="flex flex-col gap-3">
          <Switch label="Metronome" checked={on} onCheckedChange={setOn} />
          <Switch label="Count-in" checked={off} onCheckedChange={setOff} />
          <Switch label="Unavailable" checked={false} disabled onCheckedChange={() => {}} />
        </div>
      </Demo>
      <Demo caption="Two-sided switch, and one with a side not available yet">
        <div className="flex flex-col gap-3">
          <TwoSidedSwitch
            label="Handedness"
            left={{ value: 'left', label: 'Left' }}
            right={{ value: 'right', label: 'Right' }}
            value={hand}
            onValueChange={setHand}
          />
          <TwoSidedSwitch
            label="Instrument"
            left={{ value: 'guitar', label: 'Guitar' }}
            right={{ value: 'bass', label: 'Bass', disabled: true, hint: '(coming soon)' }}
            value={instrument}
            onValueChange={setInstrument}
          />
        </div>
      </Demo>
      <Demo caption="Radio group: horizontal, nothing chosen yet">
        <RadioGroup
          label="Guitar type"
          options={[
            { value: 'acoustic', label: 'Acoustic' },
            { value: 'electric', label: 'Electric' },
            { value: 'both', label: 'Both' },
          ]}
          value={guitarType}
          onValueChange={setGuitarType}
        />
      </Demo>
      <Demo caption="Radio group: vertical">
        <RadioGroup
          label="Inside each note"
          orientation="vertical"
          options={[
            { value: 'notes', label: 'Note names' },
            { value: 'fingers', label: 'Finger numbers' },
            { value: 'none', label: 'None' },
          ]}
          value={labels}
          onValueChange={setLabels}
        />
      </Demo>
      <Demo caption="Checkbox: checked, unchecked">
        <div className="flex flex-col">
          <Checkbox
            label="Interval labels"
            description="Shown under each note, e.g. 1, ♭3, 5."
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Checkbox label="Show tuning" checked={unchecked} onCheckedChange={setUnchecked} />
        </div>
      </Demo>
      <Demo caption="Select, with hints in the list">
        <Select
          label="Tuning"
          description={tuning === 'standard' ? 'E A D G B E' : 'D A D G B E'}
          value={tuning}
          onValueChange={setTuning}
          options={[
            { value: 'standard', label: 'Standard', hint: 'E A D G B E' },
            { value: 'drop-d', label: 'Drop D', hint: 'D A D G B E' },
          ]}
        />
      </Demo>
      <Demo caption="Slider at its minimum (off)">
        <Slider
          aria-label="Off slider"
          valueText={offSlider === 0 ? 'Off' : String(offSlider)}
          min={0}
          max={10}
          value={offSlider}
          onValueChange={setOffSlider}
        />
      </Demo>
      <Demo caption="Slider mid-range">
        <Slider
          aria-label="Mid slider"
          valueText={String(slider)}
          min={0}
          max={10}
          value={slider}
          onValueChange={setSlider}
        />
      </Demo>
    </div>
  )
}

function Demo({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-3">
      {children}
      <Text as="figcaption" variant="accent-sm" weight="regular" className="text-muted-foreground">
        {caption}
      </Text>
    </figure>
  )
}
