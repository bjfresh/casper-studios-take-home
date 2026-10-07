import { createDatabase, sql } from '@repo/db'
import { users } from '@repo/db/schema'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { getAccount } from '../account-service'
import { saveSettings, updateSettings } from '../settings-service'
import { upsertUserFromIdentity } from '../user-service'

// Integration test against the real test database. Deleting the users
// cascades to user_settings.
const { db, close } = createDatabase(undefined, { max: 4 })
const DID_PREFIX = 'did:privy:test-settings-'
let counter = 0

async function newUser() {
  return upsertUserFromIdentity(
    { privyUserId: `${DID_PREFIX}${Date.now()}-${counter++}`, email: null },
    db,
  )
}

const SETTINGS = { displayName: 'Jaco', instrument: 'bass', handedness: 'right' } as const
/** What the profile alone saves as: defaults, normalized for a bass player. */
const SAVED = {
  ...SETTINGS,
  guitarType: null,
  bassStringCount: 4,
  tuning: ['E', 'A', 'D', 'G'],
  showNoteNames: true,
  showFingerNumbers: false,
  showIntervals: false,
  autoProgressSeconds: 0,
}

afterEach(async () => {
  await db.delete(users).where(sql`${users.privyUserId} like ${`${DID_PREFIX}%`}`)
})
afterAll(() => close())

describe('settings', () => {
  it('an account has no settings until they are saved', async () => {
    const user = await newUser()
    expect((await getAccount(user.id, db)).settings).toBeNull()
  })

  it('saveSettings creates the row, and getAccount returns it', async () => {
    const user = await newUser()
    expect(await saveSettings(user.id, SETTINGS, db)).toEqual(SAVED)
    expect((await getAccount(user.id, db)).settings).toEqual(SAVED)
  })

  it('saveSettings is idempotent, even when two syncs race', async () => {
    const user = await newUser()
    await Promise.all([
      saveSettings(user.id, SETTINGS, db),
      saveSettings(user.id, { ...SETTINGS, displayName: 'J' }, db),
    ])
    const rows = await db.execute(
      sql`select count(*)::int as n from user_settings where user_id = ${user.id}`,
    )
    expect(rows[0]?.n).toBe(1)
  })

  it('updateSettings changes one field and leaves the rest', async () => {
    const user = await newUser()
    await saveSettings(user.id, SETTINGS, db)
    expect(await updateSettings(user.id, { handedness: 'left' }, db)).toEqual({
      ...SAVED,
      handedness: 'left',
    })
  })

  it('saveSettings keeps the preferences a guest brings, normalized', async () => {
    const user = await newUser()
    const saved = await saveSettings(
      user.id,
      {
        ...SETTINGS,
        bassStringCount: 5,
        tuning: ['B', 'E', 'A', 'D', 'G'],
        showNoteNames: false,
        showFingerNumbers: true,
        showIntervals: true,
      },
      db,
    )
    expect(saved).toMatchObject({
      bassStringCount: 5,
      showFingerNumbers: true,
      showNoteNames: false,
      showIntervals: true,
    })
  })

  it('never stores note names AND finger numbers: the newly chosen one wins', async () => {
    const user = await newUser()
    await saveSettings(user.id, SETTINGS, db)
    const fingers = await updateSettings(user.id, { showFingerNumbers: true }, db)
    expect(fingers).toMatchObject({ showNoteNames: false, showFingerNumbers: true })
    const notes = await updateSettings(user.id, { showNoteNames: true }, db)
    expect(notes).toMatchObject({ showNoteNames: true, showFingerNumbers: false })
    // Even a write that bypasses the service can't store both.
    await expect(
      db.execute(
        sql`update user_settings set show_note_names = true, show_finger_numbers = true where user_id = ${user.id}`,
      ),
    ).rejects.toThrow()
  })

  it('switching instrument fixes the setup and keeps every other choice', async () => {
    const user = await newUser()
    await saveSettings(user.id, { ...SETTINGS, showIntervals: true }, db)
    const guitar = await updateSettings(user.id, { instrument: 'guitar' }, db)
    expect(guitar).toMatchObject({
      instrument: 'guitar',
      bassStringCount: null,
      tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
      showIntervals: true,
      displayName: 'Jaco',
    })
    const sixString = await updateSettings(user.id, { instrument: 'bass', bassStringCount: 6 }, db)
    expect(sixString).toMatchObject({
      bassStringCount: 6,
      tuning: ['B', 'E', 'A', 'D', 'G', 'C'],
      guitarType: null,
    })
  })

  it('updateSettings with nothing saved is a CONFLICT and creates nothing', async () => {
    const user = await newUser()
    await expect(updateSettings(user.id, { displayName: 'Early' }, db)).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    expect((await getAccount(user.id, db)).settings).toBeNull()
  })

  it('only ever touches the caller’s own settings', async () => {
    const alice = await newUser()
    const bob = await newUser()
    await saveSettings(alice.id, SETTINGS, db)
    await saveSettings(bob.id, { ...SETTINGS, displayName: 'Bob' }, db)
    await updateSettings(alice.id, { displayName: 'Alice' }, db)
    expect((await getAccount(bob.id, db)).settings?.displayName).toBe('Bob')
  })

  it('getAccount on a missing user is NOT_FOUND', async () => {
    await expect(getAccount('00000000-0000-4000-8000-000000000000', db)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
