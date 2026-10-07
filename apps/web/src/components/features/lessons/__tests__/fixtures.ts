import type { LessonContent, LessonItem } from '@repo/shared'

let n = 0
export const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`

const TUNING = ['E', 'A', 'D', 'G', 'B', 'E']

export function chordItem(name: string, slug: string, withDiagram = true): LessonItem {
  return {
    type: 'chord',
    id: uuid(),
    slug,
    title: name,
    subtitle: null,
    rootString: null,
    inversion: null,
    stringSetStart: null,
    stringSetEnd: null,
    role: 'introduces',
    tuning: TUNING,
    diagram: withDiagram
      ? {
          positions: [
            { string: 5, fret: 3, isRoot: true },
            { string: 1, fret: 0 },
          ],
          mutedStrings: [6],
        }
      : null,
  }
}

export function lessonFixture(overrides: Partial<LessonContent> = {}): LessonContent {
  return {
    id: uuid(),
    slug: 'first-chords',
    name: 'First Chords',
    description: '',
    lessonNumber: 1,
    sortOrder: 10,
    focus: 'chords',
    instrument: 'guitar',
    items: [chordItem('G', 'g-major'), chordItem('C', 'c-major'), chordItem('D', 'd-major')],
    ...overrides,
  }
}

export function shapeItem(
  title: string,
  slug: string,
  qualifiers: Partial<
    Pick<LessonItem, 'rootString' | 'inversion' | 'stringSetStart' | 'stringSetEnd' | 'subtitle'>
  > = {},
): LessonItem {
  return { ...chordItem(title, slug), type: 'shape', ...qualifiers }
}
