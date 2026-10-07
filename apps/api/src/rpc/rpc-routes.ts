import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import type { AuthClient } from '../auth/auth-client'
import type { AppEnv } from '../context/app-env'
import { getAuthUser, requireAuth } from '../middleware/auth'
import { AppError } from '../utils/app-error'
import { rpcErrorResponse, toRpcError } from './errors'
import { type PublicRpcContext, publicRouter } from './public-router'
import { type RpcContext, router } from './router'

export const RPC_PREFIX = '/rpc'
export const PUBLIC_RPC_PREFIX = '/public-rpc'

/**
 * The unauthenticated oRPC endpoint, mounted at its own prefix so it can't be
 * mistaken for part of the protected group. Reference data only (see
 * public-router.ts). Same error format as /rpc.
 */
export function createPublicRpcRoutes() {
  const handler = new RPCHandler<PublicRpcContext>(publicRouter, {
    clientInterceptors: [
      async ({ next, context }) => {
        try {
          return await next()
        } catch (error) {
          throw toRpcError(error, context.requestId)
        }
      },
    ],
  })

  return new Hono<AppEnv>()
    .all('*', async (c) => {
      const { matched, response } = await handler.handle(c.req.raw, {
        prefix: PUBLIC_RPC_PREFIX,
        context: { requestId: c.get('requestId') },
      })
      if (!matched) throw new AppError('NOT_FOUND', 'Procedure not found')
      return c.newResponse(response.body, response)
    })
    .onError((error, c) => rpcErrorResponse(c, toRpcError(error, c.get('requestId'))))
}

/**
 * The oRPC endpoint as a Hono route group. requireAuth guards the whole group,
 * so every procedure is authenticated by structure; there's no per-procedure
 * flag to forget. A public procedure would need its own handler, mounted
 * separately and on purpose.
 */
export function createRpcRoutes(authClient: AuthClient | null) {
  const handler = new RPCHandler<RpcContext>(router, {
    clientInterceptors: [
      async ({ next, context }) => {
        try {
          return await next()
        } catch (error) {
          throw toRpcError(error, context.requestId)
        }
      },
    ],
  })

  return (
    new Hono<AppEnv>()
      .use('*', requireAuth(authClient))
      .all('*', async (c) => {
        const { matched, response } = await handler.handle(c.req.raw, {
          prefix: RPC_PREFIX,
          context: { user: getAuthUser(c), requestId: c.get('requestId') },
        })
        if (!matched) throw new AppError('NOT_FOUND', 'Procedure not found')
        return c.newResponse(response.body, response)
      })
      // This group answers in oRPC's error format, not the REST envelope (see
      // rpcErrorResponse); the payload carries the same codes and reasons.
      .onError((error, c) => rpcErrorResponse(c, toRpcError(error, c.get('requestId'))))
  )
}
