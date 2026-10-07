import { Hono } from 'hono'
import type { AppEnv } from '../context/app-env'
import { checkReadiness } from '../services/health-service'
import { ok } from '../utils/response'

export const healthRoutes = new Hono<AppEnv>()
  // Liveness: the process is up. Deliberately touches no dependency, so a
  // database outage doesn't get the container restarted in a loop.
  .get('/', (c) => c.json(ok({ status: 'ok' as const, checks: {} })))
  // Readiness: 503 while a dependency is down, so a load balancer stops routing here.
  .get('/ready', async (c) => c.json(ok(await checkReadiness())))
