import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { useModalRegistry } from '../ModalProvider'

function Consumer() {
  useModalRegistry()
  return null
}

describe('useModalRegistry', () => {
  it('throws a clear error outside the provider', async () => {
    // React logs the thrown render error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<Consumer />)).rejects.toThrow(/inside <ModalProvider>/)
  })
})
