import type { LessonContent } from '@repo/shared'
import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/LinkButton'
import { Text } from '@/components/ui/Text'
import { lessonRoute } from '@/constants/routes'
import type { LessonPlayRecord } from '@/hooks/use-lesson-progress'
import { formatLastPlayed } from '@/utils/relative-time'

export type LessonCardProps = {
  lesson: Pick<LessonContent, 'id' | 'slug' | 'name' | 'lessonNumber'>
  record: LessonPlayRecord | undefined
}

/** Lesson number (secondary), name, when it was last played, and Play. */
export function LessonCard({ lesson, record }: LessonCardProps) {
  const lastPlayed = formatLastPlayed(record?.lastPlayedAt)
  const hasPlayed = Boolean(record?.lastPlayedAt)
  const headingId = `lesson-${lesson.id}`

  return (
    <li
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex flex-col gap-1">
        {lesson.lessonNumber !== null && (
          <Text variant="accent-sm" className="text-muted-foreground">
            Lesson {lesson.lessonNumber}
          </Text>
        )}
        <Text as="h2" id={headingId} variant="heading-4">
          {lesson.name}
        </Text>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        {/* "3 days ago" alone is ambiguous to a screen reader, so say what it's
            about. "Never played" already does, so it needs no label (a label
            equal to the text would be read twice). */}
        <Badge
          variant={hasPlayed ? 'success' : 'outline'}
          aria-label={hasPlayed ? `Last played ${lastPlayed.toLowerCase()}` : undefined}
        >
          {lastPlayed}
        </Badge>
        <LinkButton
          href={lessonRoute(lesson.slug)}
          size="sm"
          aria-label={`Play ${lesson.name}`}
          label="Play"
        />
      </div>
    </li>
  )
}
