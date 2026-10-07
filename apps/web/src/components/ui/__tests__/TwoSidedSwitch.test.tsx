import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { TwoSidedSwitch } from '../TwoSidedSwitch'

function Harness({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState<'tea' | 'coffee'>('tea')
  return (
    <TwoSidedSwitch
      label="Drink"
      left={{ value: 'tea', label: 'Tea' }}
      right={{ value: 'coffee', label: 'Coffee' }}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('TwoSidedSwitch', () => {
  it('is a real switch (generic: any two values), named for the right-hand option', async () => {
    await render(<Harness />)
    const toggle = page.getByRole('switch', { name: 'Drink: Coffee' })
    await expect.element(toggle).not.toBeChecked()
    await expect.element(toggle).toHaveAccessibleDescription('Off: Tea. On: Coffee.')
  })

  it('toggles from the keyboard like any switch', async () => {
    const onChange = vi.fn()
    await render(<Harness onChange={onChange} />)
    ;(page.getByRole('switch').element() as HTMLElement).focus()
    await userEvent.keyboard(' ')
    expect(onChange).toHaveBeenLastCalledWith('coffee')
    await expect.element(page.getByRole('switch')).toBeChecked()
  })

  it('clicking a side label selects that side, and clicking it again keeps it', async () => {
    const onChange = vi.fn()
    await render(<Harness onChange={onChange} />)
    await userEvent.click(page.getByText('Coffee'))
    await userEvent.click(page.getByText('Coffee'))
    await expect.element(page.getByRole('switch')).toBeChecked()
    await userEvent.click(page.getByText('Tea'))
    await expect.element(page.getByRole('switch')).not.toBeChecked()
  })

  it('keeps the switch centred between labels of different lengths', async () => {
    await render(
      <div style={{ width: 400 }}>
        <TwoSidedSwitch
          label="X"
          left={{ value: 'a', label: 'A' }}
          right={{ value: 'b', label: 'A much longer label' }}
          value="a"
          onValueChange={() => {}}
        />
      </div>,
    )
    const box = page.getByRole('switch').element().getBoundingClientRect()
    expect(box.left + box.width / 2).toBeCloseTo(200, 0)
  })

  it('side labels are hidden from assistive tech and out of the tab order', async () => {
    await render(<Harness />)
    const label = page.getByText('Tea').element().closest('button') as HTMLElement
    expect(label.getAttribute('aria-hidden')).toBe('true')
    expect(label.getAttribute('tabindex')).toBe('-1')
  })

  it('a disabled side is shown with its hint but can never be chosen', async () => {
    const onChange = vi.fn()
    await render(
      <TwoSidedSwitch
        label="Drink"
        left={{ value: 'tea', label: 'Tea' }}
        right={{ value: 'coffee', label: 'Coffee', disabled: true, hint: '(sold out)' }}
        value="tea"
        onValueChange={onChange}
      />,
    )
    await expect.element(page.getByText('(sold out)')).toBeVisible()
    await expect.element(page.getByRole('switch')).toBeDisabled()
    await expect
      .element(page.getByRole('switch'))
      .toHaveAccessibleDescription('Off: Tea. On: Coffee (sold out), unavailable.')
    ;(page.getByText('Coffee', { exact: true }).element() as HTMLElement).click()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('already on a disabled side: the switch still moves off it', async () => {
    const onChange = vi.fn()
    await render(
      <TwoSidedSwitch
        label="Drink"
        left={{ value: 'tea', label: 'Tea' }}
        right={{ value: 'coffee', label: 'Coffee', disabled: true }}
        value="coffee"
        onValueChange={onChange}
      />,
    )
    await expect.element(page.getByRole('switch')).toBeEnabled()
    await userEvent.click(page.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith('tea')
  })

  it('side labels are vertically centred on the switch', async () => {
    await render(
      <TwoSidedSwitch
        label="Drink"
        left={{ value: 'tea', label: 'Tea' }}
        right={{ value: 'coffee', label: 'Coffee', disabled: true, hint: '(sold out)' }}
        value="tea"
        onValueChange={() => {}}
      />,
    )
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect()
      return box.top + box.height / 2
    }
    const toggle = middle(page.getByRole('switch').element())
    expect(Math.abs(middle(page.getByText('Tea').element()) - toggle)).toBeLessThan(2)
    expect(
      Math.abs(middle(page.getByText('Coffee', { exact: true }).element()) - toggle),
    ).toBeLessThan(2)
  })

  it('both side labels keep the same (heavier) weight, whichever side is chosen', async () => {
    await render(<Harness />)
    const weight = (text: string) =>
      getComputedStyle(page.getByText(text, { exact: true }).element()).fontWeight
    expect([weight('Tea'), weight('Coffee')]).toEqual(['600', '600'])
    await userEvent.click(page.getByRole('switch'))
    expect([weight('Tea'), weight('Coffee')]).toEqual(['600', '600'])
  })
})
