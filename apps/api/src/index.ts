import { serve } from '@hono/node-server'
import { closeDb, getDatabaseUrl } from '@repo/db'
import { createApp } from './app'
import { createAuthClientFromEnv } from './auth/privy-auth-client'
import { loadEnv } from './env'

const env = loadEnv()
// Fail at boot, not on the first request, if the database URL is missing.
getDatabaseUrl()

const authClient = createAuthClientFromEnv(env)
if (!authClient) {
  console.warn(
    'PRIVY_APP_ID / PRIVY_APP_SECRET not set: every authenticated route will reject (503).',
  )
}

const port = env.PORT ?? env.API_PORT
const app = createApp({ webOrigin: env.WEB_ORIGIN, authClient })
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://localhost:${port}`)
})

// Stop accepting connections, let in-flight requests finish, then close the pool.
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`)
  server.close(async () => {
    await closeDb()
    process.exit(0)
  })
  // Don't hang forever on a stuck keep-alive connection.
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
