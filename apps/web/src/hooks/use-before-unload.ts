import { useEffect } from 'react'

/**
 * Warns before the tab is closed or reloaded while `when` is true. Pass a
 * form's `formState.isDirty` and `reset()` to saved values after a successful
 * submit, so the warning disappears once the work is persisted.
 *
 * Covers unload/reload/external navigation only. App Router client-side
 * navigations don't fire `beforeunload`.
 */
export function useBeforeUnload(when: boolean): void {
  useEffect(() => {
    if (!when) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Legacy browsers only show the prompt when returnValue is set.
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [when])
}
