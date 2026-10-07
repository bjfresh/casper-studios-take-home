import { describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useBeforeUnload } from '../use-before-unload'

function fireBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('useBeforeUnload', () => {
  it('warns only while there are unsaved changes', async () => {
    const { rerender, unmount } = await renderHook(
      (dirty?: boolean) => useBeforeUnload(dirty ?? false),
      {
        initialProps: true,
      },
    )
    expect(fireBeforeUnload()).toBe(true)

    // After a successful save the form is reset, isDirty goes false, and the warning stops.
    await rerender(false)
    expect(fireBeforeUnload()).toBe(false)

    await rerender(true)
    await unmount()
    expect(fireBeforeUnload()).toBe(false)
  })
})
