import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Tabs } from '../Tabs'

const ITEMS = [
  { value: 'one', label: 'One', content: <p>First panel</p> },
  { value: 'two', label: 'Two', content: <p>Second panel</p> },
] as const

describe('Tabs', () => {
  it('a named tablist; the first tab is selected and its panel shown', async () => {
    await render(<Tabs label="Sections" items={ITEMS} />)
    await expect.element(page.getByRole('tablist', { name: 'Sections' })).toBeVisible()
    await expect
      .element(page.getByRole('tab', { name: 'One' }))
      .toHaveAttribute('aria-selected', 'true')
    await expect
      .element(page.getByRole('tabpanel', { name: 'One' }))
      .toHaveTextContent('First panel')
    expect(page.getByText('Second panel').query()).toBeNull()
  })

  it('switches by click and by arrow key', async () => {
    await render(<Tabs label="Sections" items={ITEMS} />)
    await userEvent.click(page.getByRole('tab', { name: 'Two' }))
    await expect.element(page.getByText('Second panel')).toBeVisible()
    await userEvent.keyboard('{ArrowLeft}')
    await expect
      .element(page.getByRole('tab', { name: 'One' }))
      .toHaveAttribute('aria-selected', 'true')
  })

  it('every tab has the same weight and a 44px target, so switching never reflows', async () => {
    await render(<Tabs label="Sections" items={ITEMS} />)
    const tabs = page.getByRole('tab').elements()
    const weights = new Set(tabs.map((tab) => getComputedStyle(tab).fontWeight))
    expect(weights.size).toBe(1)
    for (const tab of tabs) expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
  })
})
