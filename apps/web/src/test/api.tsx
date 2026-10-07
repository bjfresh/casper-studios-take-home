import { ORPCError } from '@orpc/client'
import { StandardRPCJsonSerializer, StandardRPCSerializer } from '@orpc/client/standard'
import { DEFAULT_PREFERENCES, normalizePlayerPreferences, type PlayerSettings } from '@repo/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { vi } from 'vitest'
import { ModalProvider } from '@/providers/ModalProvider'
import { type Api, createApi } from '@/services/rpc-client'

const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer())

/** One fake procedure: receives the decoded input, returns data or throws an ORPCError. */
export type FakeProcedure = (input: unknown) => unknown | Promise<unknown>

/**
 * A real oRPC client (real link, real response validation) whose fetch is
 * answered in-process by `procedures`, keyed by path ('account.me', or
 * 'public.lessons.list' for the public endpoint). Bodies
 * use oRPC's own serializer, so tests speak the actual wire format.
 */
export function createFakeApi(procedures: Record<string, FakeProcedure>) {
  const calls: Array<{ path: string; input: unknown }> = []
  const fetch = vi.fn<typeof globalThis.fetch>(async (request) => {
    const req = request as Request
    const pathname = new URL(req.url).pathname
    // Public procedures are keyed 'public.lessons.list'; authenticated ones 'lessons.progress'.
    const prefix = pathname.startsWith('/public-rpc/') ? 'public.' : ''
    const path = prefix + pathname.replace(/^\/(public-)?rpc\//, '').replaceAll('/', '.')
    const body = req.method === 'GET' ? undefined : await req.text()
    const input = body ? serializer.deserialize(JSON.parse(body)) : undefined
    calls.push({ path, input })

    const procedure = procedures[path]
    let status = 200
    let payload: unknown
    try {
      if (!procedure)
        throw new ORPCError('NOT_FOUND', { status: 404, message: `No fake for ${path}` })
      payload = await procedure(input)
    } catch (error) {
      if (!(error instanceof ORPCError)) throw error
      status = error.status
      payload = error.toJSON()
    }
    return new Response(JSON.stringify(serializer.serialize(payload)), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  })

  const api: Api = createApi({ baseUrl: 'http://api.test', getToken: async () => 'token', fetch })
  return { api, calls }
}

/** Query + modal providers for feature tests; retries off so failures surface immediately. */
export function TestProviders({ children }: { children: ReactNode }) {
  // useState: one client per mount, so a re-render can't wipe the cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // gcTime Infinity: no cache-cleanup timers, which would otherwise show
        // up in tests that count the timers a component leaves behind.
        defaultOptions: {
          queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
          mutations: { retry: false },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>{children}</ModalProvider>
    </QueryClientProvider>
  )
}

/** A fake `settings.save` that behaves like the server: defaults, then normalization. */
export function fakeSaveSettings(input: unknown): PlayerSettings {
  return normalizePlayerPreferences({
    ...DEFAULT_PREFERENCES,
    ...(input as object),
  } as PlayerSettings)
}
