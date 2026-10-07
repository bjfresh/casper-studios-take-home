import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Checkbox } from '../Checkbox'

function Harness() {
  const [checked, setChecked] = useState(false)
  return (
    <Checkbox
      label="Metronome"
      description="Clicks on each beat."
      checked={checked}
      onCheckedChange={setChecked}
    />
  )
}

describe('Checkbox', () => {
  it('is named by its label and described by its help text', async () => {
    await render(<Harness />)
    const box = page.getByRole('checkbox', { name: 'Metronome' })
    await expect.element(box).toHaveAccessibleName('Metronome')
    await expect.element(box).toHaveAccessibleDescription('Clicks on each beat.')
  })

  it('toggles from the label text and from Space', async () => {
    await render(<Harness />)
    await userEvent.click(page.getByText('Metronome'))
    await expect.element(page.getByRole('checkbox')).toBeChecked()
    ;(page.getByRole('checkbox').element() as HTMLElement).focus()
    await userEvent.keyboard(' ')
    await expect.element(page.getByRole('checkbox')).not.toBeChecked()
  })

  it('has a 44px touch target', async () => {
    await render(<Harness />)
    const row = page.getByRole('checkbox').element().closest('label') as Element
    expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
  })
})
