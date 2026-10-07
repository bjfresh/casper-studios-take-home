import { z } from 'zod'

/**
 * Structured musical qualifiers for a shape or voicing. The display text
 * ("6th-string root", "1st inversion · Strings 1–3") is DERIVED from these by
 * formatShapeQualifier and never stored. A qualifier lives in a field, not in
 * a title or subtitle string.
 *
 * Strings are numbered 1 = highest-pitched. No upper bound here: the string
 * count depends on the instrument, so validateShapeGeometry checks that with
 * the instrument in hand.
 */
export const shapeQualifiersSchema = z.object({
  /** The string carrying the root that anchors the shape (6 = 6th-string root). */
  rootString: z.number().int().positive().nullable(),
  /** 0 = root position, 1 = first inversion, … Null where inversion isn't meaningful. */
  inversion: z.number().int().nonnegative().nullable(),
  /** A contiguous string range, e.g. 1–3. Both set or both null. */
  stringSetStart: z.number().int().positive().nullable(),
  stringSetEnd: z.number().int().positive().nullable(),
})

export type ShapeQualifiers = z.infer<typeof shapeQualifiersSchema>

export const NO_QUALIFIERS: ShapeQualifiers = {
  rootString: null,
  inversion: null,
  stringSetStart: null,
  stringSetEnd: null,
}

const ORDINAL_SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st. */
export function formatOrdinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13
  return `${n}${teen ? 'th' : (ORDINAL_SUFFIX[n % 10] ?? 'th')}`
}

export function formatInversion(inversion: number): string {
  return inversion === 0 ? 'Root position' : `${formatOrdinal(inversion)} inversion`
}

/**
 * The one place qualifiers become text. Order: root string, inversion,
 * string set, joined with " · ".
 *
 *   { rootString: 6 }                                  → "6th-string root"
 *   { inversion: 1, stringSetStart: 1, stringSetEnd: 3 } → "1st inversion · Strings 1–3"
 *
 * Returns '' when there's nothing to say, so callers can skip the line.
 */
export function formatShapeQualifier(qualifiers: Partial<ShapeQualifiers>): string {
  const { rootString, inversion, stringSetStart, stringSetEnd } = qualifiers
  const parts: string[] = []
  if (rootString != null) parts.push(`${formatOrdinal(rootString)}-string root`)
  if (inversion != null) parts.push(formatInversion(inversion))
  if (stringSetStart != null && stringSetEnd != null) {
    parts.push(
      stringSetStart === stringSetEnd
        ? `String ${stringSetStart}`
        : `Strings ${stringSetStart}–${stringSetEnd}`,
    )
  }
  return parts.join(' · ')
}

/**
 * Checks qualifiers against the instrument they're played on, which is where
 * the string count is known (the database only checks shape-independent
 * rules). Returns problems in plain language; empty means valid.
 */
export function validateShapeGeometry(
  shape: ShapeQualifiers & { strings?: readonly number[] },
  { stringCount, noteCount }: { stringCount: number; noteCount?: number },
): string[] {
  const problems: string[] = []
  const { rootString, inversion, stringSetStart, stringSetEnd, strings } = shape

  if (rootString !== null && rootString > stringCount) {
    problems.push(`root string ${rootString} doesn't exist on a ${stringCount}-string instrument`)
  }
  if ((stringSetStart === null) !== (stringSetEnd === null)) {
    problems.push('a string set needs both a start and an end')
  }
  if (stringSetStart !== null && stringSetEnd !== null) {
    if (stringSetEnd < stringSetStart) problems.push('string set ends before it starts')
    if (stringSetEnd > stringCount) {
      problems.push(
        `string set reaches string ${stringSetEnd} on a ${stringCount}-string instrument`,
      )
    }
    if (strings) {
      const range = Array.from(
        { length: stringSetEnd - stringSetStart + 1 },
        (_, i) => stringSetStart + i,
      )
      const used = [...strings].sort((a, b) => a - b)
      if (used.join() !== range.join()) {
        problems.push(
          `string set ${stringSetStart}–${stringSetEnd} doesn't match the strings used (${used.join(', ')})`,
        )
      }
    }
  }
  if (inversion !== null && noteCount !== undefined && inversion >= noteCount) {
    problems.push(`a ${noteCount}-note chord has no inversion ${inversion}`)
  }
  if (strings?.some((string) => string < 1 || string > stringCount)) {
    problems.push(`uses a string outside 1–${stringCount}`)
  }
  return problems
}
