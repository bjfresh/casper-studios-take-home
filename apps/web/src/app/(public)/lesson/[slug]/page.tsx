import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LessonPage } from '@/components/features/lessons/LessonPage'
import { getLessonBySlug } from '@/services/server-api'

type Props = { params: Promise<{ slug: string }> }

/**
 * /lesson/<slug>: the stable curriculum slug, never a name or a database id.
 * Resolved on the server so an unknown slug gets a real 404 (notFound() only
 * works server-side).
 */
export default async function LessonRoute({ params }: Props) {
  const { slug } = await params
  const lesson = await getLessonBySlug(slug)
  if (!lesson) notFound()
  return <LessonPage lesson={lesson} />
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lesson = await getLessonBySlug(slug)
  if (!lesson) return { title: 'Lesson not found · TabShredder' }
  const prefix = lesson.lessonNumber === null ? '' : `Lesson ${lesson.lessonNumber}: `
  return { title: `${prefix}${lesson.name} · TabShredder` }
}
