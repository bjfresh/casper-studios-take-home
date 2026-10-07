import { EMPTY_GUEST_PROGRESS } from '@repo/shared'
import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { TestProviders } from '@/test/api'
import {
  localStorageQueryKey,
  readStorage,
  updateLocalStorage,
  useLocalStorage,
  writeStorage,
} from '../local-storage'

const KEY = STORAGE_KEYS.guestProgress
const PLAYED = {
  version: 1,
  groups: { 'first-chords': { completedAt: null, lastPlayedAt: 1, playCount: 1 } },
  items: {},
} as const

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('local-storage', () => {
  it('reads null for unset, malformed or invalid values: storage is untrusted', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(readStorage(KEY)).toBeNull()
    localStorage.setItem(KEY, '{not json')
    expect(readStorage(KEY)).toBeNull()
    localStorage.setItem(KEY, JSON.stringify({ version: 2 }))
    expect(readStorage(KEY)).toBeNull()
  })

  it('round-trips a valid value, and null removes the key', () => {
    expect(writeStorage(KEY, PLAYED)).toBe(true)
    expect(readStorage(KEY)).toEqual(PLAYED)
    writeStorage(KEY, null)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('an updater reads the stored value, not a stale cache, and updates the cache', () => {
    const client = new QueryClient()
    client.setQueryData(localStorageQueryKey(KEY), EMPTY_GUEST_PROGRESS)
    localStorage.setItem(KEY, JSON.stringify(PLAYED))
    updateLocalStorage(client, KEY, (current) => ({
      ...(current ?? EMPTY_GUEST_PROGRESS),
      items: {
        'chord:g-major': { learnedAt: 2, lastPlayedAt: 2, lastSkippedAt: null, playCount: 1 },
      },
    }))
    expect(readStorage(KEY)?.groups).toEqual(PLAYED.groups)
    expect(client.getQueryData(localStorageQueryKey(KEY))).toEqual(readStorage(KEY))
  })

  it('throws (rather than silently losing a play) when the device can’t store it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => updateLocalStorage(new QueryClient(), KEY, PLAYED)).toThrow(/Could not save/)
  })

  it('useLocalStorage: every observer re-renders on a write, and follows other tabs', async () => {
    function Count({ label }: { label: string }) {
      const [progress, set] = useLocalStorage(KEY)
      return (
        <button type="button" onClick={() => void set(PLAYED)}>
          {label}: {Object.keys(progress?.groups ?? {}).length}
        </button>
      )
    }
    await render(
      <TestProviders>
        <Count label="A" />
        <Count label="B" />
      </TestProviders>,
    )
    await page.getByText('A: 0').click()
    await expect.element(page.getByText('B: 1')).toBeVisible()

    // Another tab clears it: only a `storage` event tells this one.
    localStorage.removeItem(KEY)
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    await expect.element(page.getByText('A: 0')).toBeVisible()
    await expect.element(page.getByText('B: 0')).toBeVisible()
  })
})
