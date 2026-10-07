import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import type { AuthClient } from './auth/auth-client'
import type { AppEnv } from './context/app-env'
import { errorHandler, notFoundHandler } from './middleware/error-handler'
import { healthRoutes } from './routes/health'
import {
  createPublicRpcRoutes,
  createRpcRoutes,
  PUBLIC_RPC_PREFIX,
  RPC_PREFIX,
} from './rpc/rpc-routes'

/**
 * Builds the app without binding a port, so tests can call `app.request()`.
 * `authClient` is the auth seam: production passes the Privy client (or null
 * when unconfigured, which fails closed); tests pass a fake.
 */
export function createApp({
  webOrigin,
  authClient,
}: {
  webOrigin: string
  authClient: AuthClient | null
}) {
  return new Hono<AppEnv>()
    .use(requestId())
    .use(cors({ origin: webOrigin, credentials: true }))
    .route('/health', healthRoutes)
    .route(PUBLIC_RPC_PREFIX, createPublicRpcRoutes())
    .route(RPC_PREFIX, createRpcRoutes(authClient))
    .notFound(notFoundHandler)
    .onError(errorHandler)
}

export type App = ReturnType<typeof createApp>
