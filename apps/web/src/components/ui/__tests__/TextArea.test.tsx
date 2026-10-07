import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { TextArea } from '../TextArea'

function heightOf(element: Element) {
  return element.getBoundingClientRect().height
}

function lineHeightOf(element: Element) {
  return Number.parseFloat(getComputedStyle(element).lineHeight)
}

// py-2 (16px total) + 1px top and bottom border.
const CHROME = 16 + 2

describe('TextArea', () => {
  it('has a floor of minRows when empty', async () => {
    const screen = await render(<TextArea label="Notes" minRows={3} />)
    const textarea = screen.getByRole('textbox').element()
    expect(heightOf(textarea)).toBeCloseTo(3 * lineHeightOf(textarea) + CHROME, 0)
  })

  it('grows with content and stops at maxRows', async () => {
    const screen = await render(<TextArea label="Notes" minRows={2} maxRows={4} />)
    const textarea = screen.getByRole('textbox')
    const element = textarea.element()
    const lineHeight = lineHeightOf(element)

    await userEvent.fill(textarea, 'one\ntwo\nthree')
    expect(heightOf(element)).toBeCloseTo(3 * lineHeight + CHROME, 0)

    await userEvent.fill(textarea, Array.from({ length: 12 }, (_, i) => `line ${i}`).join('\n'))
    expect(heightOf(element)).toBeCloseTo(4 * lineHeight + CHROME, 0)
    expect(element.scrollHeight).toBeGreaterThan(element.clientHeight)
  })

  it('stays fixed and user-resizable when autoGrow is off', async () => {
    const screen = await render(<TextArea label="Notes" autoGrow={false} minRows={3} />)
    const textarea = screen.getByRole('textbox')
    const before = heightOf(textarea.element())

    await userEvent.fill(textarea, Array.from({ length: 8 }, (_, i) => `line ${i}`).join('\n'))
    expect(heightOf(textarea.element())).toBe(before)
    expect(getComputedStyle(textarea.element()).resize).toBe('vertical')
  })
})
