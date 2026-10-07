import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { RadioGroup } from '../RadioGroup'

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
] as const

function Harness() {
  const [value, setValue] = useState<'a' | 'b' | 'c'>('a')
  return <RadioGroup label="Letter" options={options} value={value} onValueChange={setValue} />
}

describe('RadioGroup', () => {
  it('is a named radiogroup with exactly one checked option', async () => {
    await render(<Harness />)
    await expect.element(page.getByRole('radiogroup', { name: 'Letter' })).toBeVisible()
    await userEvent.click(page.getByRole('radio', { name: 'Charlie' }))
    const checked = page
      .getByRole('radio')
      .elements()
      .filter((radio) => radio.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    await expect.element(page.getByRole('radio', { name: 'Charlie' })).toBeChecked()
  })

  it('selects from the label text and moves with arrow keys', async () => {
    await render(<Harness />)
    await userEvent.click(page.getByText('Bravo'))
    await expect.element(page.getByRole('radio', { name: 'Bravo' })).toBeChecked()
    ;(page.getByRole('radio', { name: 'Bravo' }).element() as HTMLElement).focus()
    // Held, as a real keypress is: Radix moves focus a tick later and only
    // checks the newly focused radio while an arrow key is down.
    await userEvent.keyboard('{ArrowDown>}')
    await expect.element(page.getByRole('radio', { name: 'Charlie' })).toBeChecked()
    await userEvent.keyboard('{/ArrowDown}')
  })

  it('each option row is a 44px touch target', async () => {
    await render(<Harness />)
    for (const radio of page.getByRole('radio').elements()) {
      const row = radio.closest('label') as Element
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    }
  })
})
