'use client'

import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/Spinner'
import { Text } from '@/components/ui/Text'
import { useApi } from '@/hooks/use-api'
import { useLessonPlayRecords } from '@/hooks/use-lesson-progress'
import { usePreferences } from '@/hooks/use-preferences'
import { toApiError } from '@/services/api-errors'
import { LessonCard } from './LessonCard'

/**
 * The home page: every lesson as a card, ordered by sortOrder. One column on
 * phones, three from `sm` up, as many rows as needed. Works the same for guests
 * (progress from this browser) and signed-in players (progress from the
 * account).
 */
export function LessonGrid() {
  const api = useApi()
  const { instrument } = usePreferences().preferences
  // Only guitar has lessons so far: bass players see the guitar path, with a note.
  const lessons = useQuery(
    api.publicQuery.lessons.list.queryOptions({ input: { instrument: 'guitar' } }),
  )
  const { records, isReady } = useLessonPlayRecords('guitar')

  if (lessons.isPending || !isReady) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground" aria-busy="true">
        <Spinner />
        <Text variant="paragraph-sm">Loading lessons…</Text>
      </div>
    )
  }
  if (lessons.isError) {
    return (
      <Text variant="paragraph-md" role="alert" className="py-12 text-danger">
        {toApiError(lessons.error).message}
      </Text>
    )
  }

  // sortOrder, never lessonNumber or response order.
  const ordered = [...lessons.data].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="flex flex-col gap-4">
      {instrument === 'bass' && (
        <Text variant="paragraph-sm" className="text-muted-foreground">
          Bass lessons are coming soon. These are the guitar lessons.
        </Text>
      )}
      <ol aria-label="Lessons" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ordered.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} record={records.get(lesson.slug)} />
        ))}
      </ol>
    </div>
  )
}
