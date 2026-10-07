import 'server-only'
import { ORPCError } from '@orpc/client'
import type { LessonContent } from '@repo/shared'
import { publicEnv } from '@/env/public'
import { serverEnv } from '@/env/server'
import { createPublicClient } from './rpc-client'

const publicClient = createPublicClient({
  baseUrl: serverEnv.API_INTERNAL_URL ?? publicEnv.NEXT_PUBLIC_API_URL,
})

/**
 * A lesson by slug, for server rendering, or null if it doesn't exist (the
 * page then calls notFound(), which only works on the server). Any other
 * failure throws to the route's error boundary: "the API is down" must not
 * masquerade as "no such lesson".
 */
export async function getLessonBySlug(slug: string): Promise<LessonContent | null> {
  try {
    return await publicClient.lessons.get({ slug })
  } catch (error) {
    if (error instanceof ORPCError && error.code === 'NOT_FOUND') return null
    throw error
  }
}
