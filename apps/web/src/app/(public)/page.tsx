import { LessonGrid } from '@/components/features/lessons/LessonGrid'
import { HomeHeader } from '@/components/layout/HomeHeader'
import { Text } from '@/components/ui/Text'

/** The home page is the curriculum: a lesson launcher, not a dashboard. */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <HomeHeader />
      {/* The page's heading for assistive tech; visually, the grid speaks for itself. */}
      <Text as="h1" className="sr-only">
        Lessons
      </Text>
      <LessonGrid />
    </main>
  )
}
