import { useApiContext } from '@/providers/ApiProvider'
import type { Api } from '@/services/rpc-client'

/**
 * The typed API client, with a fresh bearer token attached to every request.
 *
 *   const api = useApi()
 *   const me = useQuery(api.query.account.me.queryOptions())
 */
export function useApi(): Api {
  return useApiContext()
}
