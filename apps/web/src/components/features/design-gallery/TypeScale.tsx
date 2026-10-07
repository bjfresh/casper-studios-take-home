import { TEXT_VARIANT_NAMES, TEXT_WEIGHT_NAMES, Text, type TextVariant } from '@/components/ui/Text'
import { FONT_BY_ROLE } from '@/constants/fonts'

/** The variant families, in reading order, with the face behind each. */
const FAMILIES = [
  ['display', FONT_BY_ROLE.display],
  ['heading', FONT_BY_ROLE.heading],
  ['paragraph', FONT_BY_ROLE.paragraph],
  ['accent', FONT_BY_ROLE.accent],
  ['field', 'Poppins (form fields)'],
  ['mono', FONT_BY_ROLE.mono],
] as const

/** Every Text variant, grouped by family, then every weight. */
export function TypeScale() {
  return (
    <div className="flex flex-col gap-8">
      {FAMILIES.map(([family, face]) => (
        <section key={family} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2 border-b border-border pb-1">
            <Text as="h3" variant="accent-sm" weight="bold">
              {family}
            </Text>
            <Text variant="mono-sm" className="text-muted-foreground">
              {face}
            </Text>
          </div>
          {TEXT_VARIANT_NAMES.filter((variant) => variant.startsWith(`${family}-`)).map(
            (variant) => (
              <div
                key={variant}
                // A fixed name column, so samples share a left edge and the
                // size steps read down the page.
                className="grid grid-cols-[8rem_1fr] items-baseline gap-3 border-b border-border pb-2"
              >
                <Text variant="mono-sm" className="text-muted-foreground">
                  {variant}
                </Text>
                <Sample variant={variant} />
              </div>
            ),
          )}
        </section>
      ))}

      <section className="flex flex-col gap-2">
        <div className="border-b border-border pb-1">
          <Text as="h3" variant="accent-sm" weight="bold">
            weights
          </Text>
        </div>
        {TEXT_WEIGHT_NAMES.map((weight) => (
          <div key={weight} className="grid grid-cols-[8rem_1fr_1fr] items-baseline gap-3">
            <Text variant="mono-sm" className="text-muted-foreground">
              {weight}
            </Text>
            <Text as="span" variant="heading-4" weight={weight}>
              Headline
            </Text>
            <Text as="span" variant="paragraph-md" weight={weight}>
              Paragraph
            </Text>
          </div>
        ))}
      </section>
    </div>
  )
}

function Sample({ variant }: { variant: TextVariant }) {
  // field-inline has zero line-height by design: give it a line to sit in.
  if (variant === 'field-inline') {
    return (
      <div className="py-2">
        <Text variant={variant}>E A D G B E</Text>
      </div>
    )
  }
  return (
    <Text as="p" variant={variant}>
      Play the G chord, then C, then D.
    </Text>
  )
}
