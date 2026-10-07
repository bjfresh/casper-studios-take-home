'use client'

import { useState } from 'react'
import { ChordDiagram } from '@/components/features/chords/ChordDiagram'
import { EXAMPLE_FINGERINGS } from '@/components/features/chords/examples'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'

const SEQUENCE = [
  EXAMPLE_FINGERINGS.cMajorOpen,
  EXAMPLE_FINGERINGS.gMajorOpen,
  EXAMPLE_FINGERINGS.bMajorBarre7,
] as const

/**
 * Steps through chords in one diagram, as a lesson does: the grid stays put
 * and each chord's notes ripple in. Click quickly to check that a change
 * restarts the ripple cleanly.
 */
export function ChordRevealDemo() {
  const [step, setStep] = useState(0)
  const chord = SEQUENCE[step % SEQUENCE.length] ?? SEQUENCE[0]
  return (
    <div className="flex flex-col items-start gap-4">
      <ChordDiagram {...chord} labels="notes" showTuning revealKey={String(step)} />
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => setStep((current) => current + 1)}
          label="Next chord"
        />
        <Text variant="paragraph-sm" className="text-muted-foreground">
          {chord.title}
        </Text>
      </div>
    </div>
  )
}
