import { useSyncExternalStore } from 'react'
import type { StorageItem } from './storage'

/**
 * Makes a StorageItem observable, so every component reading it re-renders on
 * a write in this tab (a custom event) or another tab (the `storage` event,
 * which only fires in OTHER tabs). Snapshots are cached by the raw stored
 * string: useSyncExternalStore needs the same object back until it changes.
 */
export function createLiveStorage<T>(item: StorageItem<T>, key: string, serverValue: T) {
  const event = `live-storage:${key}`
  let cachedRaw: string | null | undefined
  let cachedValue: T = serverValue

  function snapshot(): T {
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(key)
    } catch {
      // Storage blocked: item.read() falls back too.
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedValue = item.read()
    }
    return cachedValue
  }

  function subscribe(onChange: () => void) {
    window.addEventListener(event, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(event, onChange)
      window.removeEventListener('storage', onChange)
    }
  }

  return {
    read: () => item.read(),
    write(value: T) {
      item.write(value)
      window.dispatchEvent(new Event(event))
    },
    remove() {
      item.remove()
      window.dispatchEvent(new Event(event))
    },
    // The server has no localStorage: render `serverValue`, then the client fills in.
    useValue: () => useSyncExternalStore(subscribe, snapshot, () => serverValue),
  }
}
