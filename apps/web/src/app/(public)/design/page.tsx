import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ChordButton, type ChordButtonStatus } from '@/components/features/chords/ChordButton'
import { ChordDiagram } from '@/components/features/chords/ChordDiagram'
import { EXAMPLE_FINGERINGS } from '@/components/features/chords/examples'
import { BrandPalette } from '@/components/features/design-gallery/BrandPalette'
import { ButtonGallery } from '@/components/features/design-gallery/ButtonGallery'
import { ChordRevealDemo } from '@/components/features/design-gallery/ChordRevealDemo'
import { ControlsGallery } from '@/components/features/design-gallery/ControlsGallery'
import { LessonStepsDemo } from '@/components/features/design-gallery/LessonStepsDemo'
import { ModalGallery } from '@/components/features/design-gallery/ModalGallery'
import { TypeScale } from '@/components/features/design-gallery/TypeScale'
import { BADGE_VARIANTS, Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Text } from '@/components/ui/Text'

/**
 * Living design-system reference: every UI primitive and chord component,
 * rendered together, so token and visual changes can be eyeballed in both
 * themes without a Storybook install. Development only: 404 in production.
 */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const { cMajorOpen, gMajorOpen, bMajorBarre7, bassCRootFifthOctave, bass5FRootFifthOctave } =
    EXAMPLE_FINGERINGS

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <Text as="h1" variant="heading-1">
          Design system
        </Text>
        <Text variant="paragraph-md" className="text-muted-foreground">
          Every UI primitive and chord component, rendered together.
        </Text>
      </div>

      <Panel
        title="Brand palette"
        description="Painted from the CSS variables, so this is the live theme: switch to dark mode and the theme tokens re-resolve."
      >
        <BrandPalette />
      </Panel>

      <Panel title="Typography" description="Every Text variant by family, then every weight.">
        <TypeScale />
      </Panel>

      <Panel title="Buttons">
        <ButtonGallery />
      </Panel>

      <Panel title="Form controls">
        <ControlsGallery />
      </Panel>

      <Panel title="Badges">
        <div className="flex flex-col gap-3">
          {(['sm', 'md'] as const).map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-2">
              {BADGE_VARIANTS.map((variant) => (
                <Badge key={variant} variant={variant} size={size}>
                  {variant}
                </Badge>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Modals">
        <ModalGallery />
      </Panel>

      <Panel title="Feedback">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner className="size-5" />
          <Text variant="paragraph-sm">Spinner</Text>
        </div>
      </Panel>

      <Panel title="Lesson progress" description="Pagination dots: tap one to jump.">
        <LessonStepsDemo />
      </Panel>

      <Panel
        title="Chord reveal"
        description="Step through chords: the grid stays put and each chord's notes ripple in."
      >
        <ChordRevealDemo />
      </Panel>

      <Panel title="Chord diagrams">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          <Example caption="Open C major (nut)">
            <ChordDiagram {...cMajorOpen} showTuning />
          </Example>
          <Example caption="B major barre, 7th fret">
            <ChordDiagram {...bMajorBarre7} showTuning />
          </Example>
          <Example caption="4-string bass, root–5th–octave">
            <ChordDiagram {...bassCRootFifthOctave} showTuning />
          </Example>
          <Example caption="5-string bass, 6th fret">
            <ChordDiagram {...bass5FRootFifthOctave} showTuning />
          </Example>
          <Example caption="Left-handed G major">
            <ChordDiagram {...gMajorOpen} handedness="left" showTuning />
          </Example>
          <Example caption="Overlay: finger numbers">
            <ChordDiagram {...cMajorOpen} labels="fingers" />
          </Example>
          <Example caption="Overlay: note names">
            <ChordDiagram {...bMajorBarre7} labels="notes" />
          </Example>
          <Example caption="Note names + intervals">
            <ChordDiagram {...gMajorOpen} labels="notes" showIntervals showTuning />
          </Example>
        </div>
      </Panel>

      <Panel title="Chord buttons">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-x-4 border-spacing-y-3">
            <thead>
              <tr>
                <th />
                {['G', 'Am', 'D7', 'Cmaj7'].map((label) => (
                  <th key={label} className="sr-only">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUTTON_ROWS.map(({ name, status, selected }) => (
                <tr key={name}>
                  <th scope="row" className="pr-4 text-left">
                    <Text as="span" variant="accent-sm" className="text-muted-foreground">
                      {name}
                    </Text>
                  </th>
                  {['G', 'Am', 'D7', 'Cmaj7'].map((label) => (
                    <td key={label}>
                      <ChordButton label={label} status={status} selected={selected} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <ChordButton label="E7" size="sm" caption="sm" />
          <ChordButton label="E7" size="md" caption="md" />
          <ChordButton label="E7" size="lg" caption="lg" />
          <ChordButton label="Bm7♭5" size="lg" secondaryLabel="ii" caption="secondary label" />
        </div>
      </Panel>
    </main>
  )
}

const BUTTON_ROWS: Array<{ name: string; status: ChordButtonStatus; selected?: boolean }> = [
  { name: 'Default', status: 'default' },
  { name: 'Active', status: 'default', selected: true },
  { name: 'Completed', status: 'completed' },
  { name: 'Learning', status: 'learning' },
  { name: 'Learning + active', status: 'learning', selected: true },
  { name: 'Locked', status: 'locked' },
]

/** A titled panel on the surface colour, one per part of the system. */
function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <Text as="h2" variant="heading-3">
          {title}
        </Text>
        {description && (
          <Text variant="paragraph-sm" className="text-muted-foreground">
            {description}
          </Text>
        )}
      </div>
      {children}
    </section>
  )
}

function Example({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      {children}
      <Text
        as="figcaption"
        variant="accent-sm"
        weight="regular"
        className="text-center text-muted-foreground"
      >
        {caption}
      </Text>
    </figure>
  )
}
