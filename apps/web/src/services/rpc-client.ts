import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'
import { ResponseValidationPlugin } from '@orpc/contract/plugins'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { type Contract, contract, type PublicContract, publicContract } from '@repo/shared'

export type RpcClient = ContractRouterClient<Contract>
export type PublicRpcClient = ContractRouterClient<PublicContract>

export type Api = {
  /** Plain async calls: `await api.client.account.me()`. */
  client: RpcClient
  /**
   * TanStack Query helpers: `useQuery(api.query.account.me.queryOptions())`.
   * Query keys are generated from the procedure path, so they never need
   * hand-writing (the "keys live in constants/" rule is satisfied by
   * construction).
   */
  query: ReturnType<typeof createTanstackQueryUtils<RpcClient>>
  /** Unauthenticated reference data (lesson content), usable by guests. */
  publicClient: PublicRpcClient
  publicQuery: ReturnType<typeof createTanstackQueryUtils<PublicRpcClient>>
}

/**
 * A client for the PUBLIC endpoint: no token is ever attached, so nothing
 * user-specific can leak into a cacheable, shareable request. Also used
 * server-side (services/server-api.ts).
 */
export function createPublicClient({
  baseUrl,
  fetch,
}: {
  baseUrl: string
  fetch?: typeof globalThis.fetch
}): PublicRpcClient {
  const link = new RPCLink({
    url: new URL('/public-rpc', baseUrl).toString(),
    ...(fetch ? { fetch: (request, init) => fetch(request, init) } : {}),
    plugins: [new ResponseValidationPlugin(publicContract)],
  })
  return createORPCClient(link)
}

/**
 * Framework-free oRPC client for the API's /rpc endpoint. `getToken` is called
 * per request, so the bearer token is always fresh and never held in state.
 */
export function createApi({
  baseUrl,
  getToken,
  fetch,
}: {
  baseUrl: string
  getToken: () => Promise<string | null>
  /** Test seam; defaults to the global fetch. */
  fetch?: typeof globalThis.fetch
}): Api {
  const link = new RPCLink({
    url: new URL('/rpc', baseUrl).toString(),
    headers: async () => {
      const token = await getToken()
      return token ? { authorization: `Bearer ${token}` } : {}
    },
    ...(fetch ? { fetch: (request, init) => fetch(request, init) } : {}),
    // Our own API is still a boundary (client and server deploy separately), so
    // every response is validated against the shared contract.
    plugins: [new ResponseValidationPlugin(contract)],
  })

  const client: RpcClient = createORPCClient(link)
  const publicClient = createPublicClient({ baseUrl, fetch })
  return {
    client,
    query: createTanstackQueryUtils(client),
    publicClient,
    // A distinct path prefix keeps public and authenticated query keys apart.
    publicQuery: createTanstackQueryUtils(publicClient, { path: ['public'] }),
  }
}
