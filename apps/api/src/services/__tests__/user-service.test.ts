import { createDatabase, eq, sql } from '@repo/db'
import { users } from '@repo/db/schema'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { upsertUserFromIdentity } from '../user-service'

// Integration test against the real test database (migrated by
// test/global-setup.ts). Each test uses its own DID and cleans up after itself.
const { db, close } = createDatabase(undefined, { max: 4 })
const DID_PREFIX = 'did:privy:test-user-service-'
let counter = 0
const nextDid = () => `${DID_PREFIX}${Date.now()}-${counter++}`

afterEach(async () => {
  await db.delete(users).where(sql`${users.privyUserId} like ${`${DID_PREFIX}%`}`)
})
afterAll(() => close())

async function rowsFor(privyUserId: string) {
  return db.select().from(users).where(eq(users.privyUserId, privyUserId))
}

describe('upsertUserFromIdentity', () => {
  it('is idempotent: calling it twice yields one row with the same id', async () => {
    const did = nextDid()
    const first = await upsertUserFromIdentity({ privyUserId: did, email: 'a@x.test' }, db)
    const second = await upsertUserFromIdentity({ privyUserId: did, email: 'a@x.test' }, db)

    expect(second.id).toBe(first.id)
    expect(await rowsFor(did)).toHaveLength(1)
  })

  it('creates exactly one row under concurrent first requests', async () => {
    const did = nextDid()
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        upsertUserFromIdentity({ privyUserId: did, email: null }, db),
      ),
    )
    expect(new Set(results.map((user) => user.id)).size).toBe(1)
    expect(await rowsFor(did)).toHaveLength(1)
  })

  it('never erases a known email when a degraded lookup passes null', async () => {
    const did = nextDid()
    await upsertUserFromIdentity({ privyUserId: did, email: 'keep@x.test' }, db)
    const user = await upsertUserFromIdentity({ privyUserId: did, email: null }, db)
    expect(user.email).toBe('keep@x.test')
  })

  it('updates the email when a new one arrives, and defaults role to user', async () => {
    const did = nextDid()
    await upsertUserFromIdentity({ privyUserId: did, email: 'old@x.test' }, db)
    const user = await upsertUserFromIdentity({ privyUserId: did, email: 'new@x.test' }, db)
    expect(user).toMatchObject({ email: 'new@x.test', role: 'user' })
  })

  it('touches lastSeenAt on every call', async () => {
    const did = nextDid()
    await upsertUserFromIdentity({ privyUserId: did, email: null }, db)
    const [before] = await rowsFor(did)
    await new Promise((resolve) => setTimeout(resolve, 10))
    await upsertUserFromIdentity({ privyUserId: did, email: null }, db)
    const [after] = await rowsFor(did)
    expect(after?.lastSeenAt?.getTime()).toBeGreaterThan(before?.lastSeenAt?.getTime() ?? 0)
  })
})
