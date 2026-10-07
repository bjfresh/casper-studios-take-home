import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createStorageItem } from '../storage'

const item = createStorageItem({
  key: 'test:prefs',
  schema: z.object({ theme: z.enum(['light', 'dark']) }),
  fallback: { theme: 'light' as const },
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('createStorageItem', () => {
  it('round-trips a valid value', () => {
    item.write({ theme: 'dark' })
    expect(item.read()).toEqual({ theme: 'dark' })
  })

  it('falls back when nothing is stored', () => {
    expect(item.read()).toEqual({ theme: 'light' })
  })

  it('falls back and logs the issue path when stored data fails validation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    window.localStorage.setItem('test:prefs', JSON.stringify({ theme: 'purple' }))

    expect(item.read()).toEqual({ theme: 'light' })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('test:prefs'),
      expect.stringContaining('theme'),
    )
  })

  it('falls back on malformed JSON and on storage that throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    window.localStorage.setItem('test:prefs', '{not json')
    expect(item.read()).toEqual({ theme: 'light' })

    const blocked = createStorageItem({
      key: 'k',
      schema: z.string(),
      fallback: 'default',
      storage: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    expect(blocked.read()).toBe('default')
    expect(() => blocked.write('x')).not.toThrow()
  })
})
