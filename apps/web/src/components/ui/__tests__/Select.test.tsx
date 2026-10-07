import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Select } from '../Select'

function Harness() {
  const [value, setValue] = useState('std')
  return (
    <Select
      label="Tuning"
      description="E A D G B E"
      value={value}
      onValueChange={setValue}
      options={[
        { value: 'std', label: 'Standard' },
        { value: 'dropd', label: 'Drop D', hint: 'D A D G B E' },
      ]}
    />
  )
}

describe('Select', () => {
  it('is a Radix combobox (a button, not a native select), named and described', async () => {
    await render(<Harness />)
    const trigger = page.getByRole('combobox', { name: 'Tuning' })
    expect(trigger.element().tagName).toBe('BUTTON')
    await expect.element(trigger).toHaveTextContent('Standard')
    await expect.element(trigger).toHaveAccessibleDescription('E A D G B E')
    expect(trigger.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
  })

  it('chooses an option by pointer and by keyboard', async () => {
    await render(<Harness />)
    await userEvent.click(page.getByRole('combobox'))
    await userEvent.click(page.getByRole('option', { name: /Drop D/ }))
    await expect.element(page.getByRole('combobox')).toHaveTextContent('Drop D')

    ;(page.getByRole('combobox').element() as HTMLElement).focus()
    await userEvent.keyboard('{Enter}')
    await expect.element(page.getByRole('listbox')).toBeVisible()
    await expect.element(page.getByRole('option', { name: /Drop D/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    await expect.element(page.getByRole('option', { name: 'Standard' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect.element(page.getByRole('combobox')).toHaveTextContent('Standard')
  })
})
