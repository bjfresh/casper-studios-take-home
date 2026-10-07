import { describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useDisclosure } from '../use-disclosure'

describe('useDisclosure', () => {
  it('opens, closes and toggles with stable callbacks', async () => {
    const { result, act } = await renderHook(() => useDisclosure())
    const { close } = result.current

    await act(() => result.current.open())
    expect(result.current.isOpen).toBe(true)
    await act(() => result.current.toggle())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.close).toBe(close)
  })
})
