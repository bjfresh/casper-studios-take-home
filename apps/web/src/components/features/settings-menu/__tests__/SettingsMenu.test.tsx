import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { guestPreferences } from '@/data/guest-preferences'
import { createFakeApi, TestProviders } from '@/test/api'
import { SettingsBar } from '../SettingsMenu'

// Guest mode (no Privy app id in tests): settings live in localStorage.
const api = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/hooks/use-api', () => ({ useApi: () => api.current }))

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.guestPreferences) ?? '{}')

async function openSettings() {
  api.current = createFakeApi({}).api
  await render(
    <TestProviders>
      <div style={{ width: 448 }}>
        <SettingsBar start={<span>Back</span>} />
      </div>
    </TestProviders>,
  )
  await userEvent.click(page.getByRole('button', { name: 'Settings' }))
  await expect.element(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

afterEach(() => localStorage.clear())

describe('Settings', () => {
  it('opens from a visible hamburger, as wide as the container it sits in', async () => {
    await openSettings()
    const icon = page.getByRole('button', { name: 'Settings' }).element().querySelector('svg')
    expect(icon?.getBoundingClientRect().width).toBeGreaterThanOrEqual(16)
    const panel = page.getByRole('dialog').element().getBoundingClientRect()
    expect(panel.width).toBeCloseTo(448, 0)
  })

  it('starts from beginner defaults', async () => {
    await openSettings()
    await expect.element(page.getByRole('switch', { name: 'Instrument: Bass' })).not.toBeChecked()
    await expect.element(page.getByRole('switch', { name: 'Handedness: Right' })).toBeChecked()
    await expect.element(page.getByRole('radio', { name: 'Note names' })).toBeChecked()
    await expect.element(page.getByRole('checkbox', { name: 'Interval labels' })).not.toBeChecked()
    await expect
      .element(page.getByRole('combobox', { name: 'Tuning' }))
      .toHaveTextContent('Standard')
  })

  it('bass is shown but not selectable yet: "coming soon"', async () => {
    await openSettings()
    const instrument = page.getByRole('switch', { name: 'Instrument: Bass' })
    await expect.element(instrument).toBeDisabled()
    await expect.element(instrument).not.toBeChecked()
    await expect
      .element(instrument)
      .toHaveAccessibleDescription('Off: Guitar. On: Bass (coming soon), unavailable.')
    await expect.element(page.getByText('(coming soon)')).toBeVisible()
    // Clicking the Bass label does nothing either.
    ;(page.getByText('Bass', { exact: true }).element() as HTMLElement).click()
    expect(stored().instrument ?? 'guitar').toBe('guitar')
  })

  it('a player already on bass can switch back to guitar, but not return', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestPreferences,
      JSON.stringify({ instrument: 'bass', bassStringCount: 4, tuning: ['E', 'A', 'D', 'G'] }),
    )
    await openSettings()
    const instrument = page.getByRole('switch', { name: 'Instrument: Bass' })
    await expect.element(instrument).toBeChecked()
    await expect.element(instrument).toBeEnabled()
    // Clicking a side's label selects THAT side (it doesn't toggle).
    await userEvent.click(page.getByText('Guitar', { exact: true }))
    expect(stored().instrument).toBe('guitar')
    await expect.element(instrument).toBeDisabled()
  })

  it('handedness: clicking a side selects it', async () => {
    await openSettings()
    await userEvent.click(page.getByText('Left', { exact: true }))
    await userEvent.click(page.getByText('Left', { exact: true }))
    expect(stored().handedness).toBe('left')
    await expect.element(page.getByRole('switch', { name: 'Handedness: Right' })).not.toBeChecked()
  })

  it('guitar type is one radio group: choosing Both deselects the others', async () => {
    await openSettings()
    await expect.element(page.getByRole('radiogroup', { name: 'Guitar type' })).toBeVisible()
    await userEvent.click(page.getByRole('radio', { name: 'Electric' }))
    await userEvent.click(page.getByRole('radio', { name: 'Both' }))
    await expect.element(page.getByRole('radio', { name: 'Both' })).toBeChecked()
    await expect.element(page.getByRole('radio', { name: 'Electric' })).not.toBeChecked()
    expect(stored().guitarType).toBe('both')
  })

  it('bass shows its string count as a radio group, and the tuning follows', async () => {
    localStorage.setItem(STORAGE_KEYS.guestPreferences, JSON.stringify({ instrument: 'bass' }))
    await openSettings()
    await userEvent.click(page.getByRole('radio', { name: '5' }))
    expect(stored()).toMatchObject({ bassStringCount: 5, tuning: ['B', 'E', 'A', 'D', 'G'] })
    await expect
      .element(page.getByRole('combobox', { name: 'Tuning' }))
      .toHaveAccessibleDescription('B E A D G')
  })

  it('tuning is a Radix Select (not a native <select>) that keeps the panel open', async () => {
    await openSettings()
    const tuning = page.getByRole('combobox', { name: 'Tuning' })
    expect(tuning.element().tagName).toBe('BUTTON')
    await userEvent.click(tuning)
    await userEvent.click(page.getByRole('option', { name: /Drop D/ }))
    expect(stored().tuning).toEqual(['D', 'A', 'D', 'G', 'B', 'E'])
    await expect.element(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect.element(tuning).toHaveTextContent('Drop D')
  })

  it('note labels: exactly one radio, so names and fingers together cannot be chosen', async () => {
    await openSettings()
    const group = page.getByRole('radiogroup', { name: 'Inside each note' })
    await userEvent.click(page.getByRole('radio', { name: 'Finger numbers' }))
    expect(stored()).toMatchObject({ showNoteNames: false, showFingerNumbers: true })
    const checked = group
      .getByRole('radio')
      .elements()
      .filter((radio) => radio.getAttribute('aria-checked') === 'true')
    expect(checked.map((radio) => radio.textContent || radio.getAttribute('value'))).toHaveLength(1)
    await userEvent.click(page.getByRole('radio', { name: 'None' }))
    expect(stored()).toMatchObject({ showNoteNames: false, showFingerNumbers: false })
  })

  it('interval labels are an independent checkbox', async () => {
    await openSettings()
    await userEvent.click(page.getByRole('radio', { name: 'Finger numbers' }))
    await userEvent.click(page.getByRole('checkbox', { name: 'Interval labels' }))
    expect(stored()).toMatchObject({ showFingerNumbers: true, showIntervals: true })
  })

  it('repairs an impossible stored combination rather than showing it', async () => {
    localStorage.setItem(
      STORAGE_KEYS.guestPreferences,
      JSON.stringify({ showNoteNames: true, showFingerNumbers: true }),
    )
    await openSettings()
    await expect.element(page.getByRole('radio', { name: 'Note names' })).toBeChecked()
    await expect.element(page.getByRole('radio', { name: 'Finger numbers' })).not.toBeChecked()
  })

  it('auto-progress: a keyboard slider named for time per chord, showing its value', async () => {
    await openSettings()
    const slider = page.getByRole('slider', { name: 'Time per chord' })
    await expect.element(slider).toHaveAttribute('aria-valuetext', 'Off')
    ;(slider.element() as HTMLElement).focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect.element(slider).toHaveAttribute('aria-valuetext', '3 seconds per chord')
    await userEvent.keyboard('{End}')
    expect(stored().autoProgressSeconds).toBe(30)
    await expect.element(page.getByText('30s', { exact: true })).toBeVisible()
  })

  it('keeps the instrument next to what depends on it: strings or type, then tuning, then handedness', async () => {
    await openSettings()
    const order = () => {
      const panel = page.getByRole('dialog').element()
      const named = [
        page.getByRole('switch', { name: 'Instrument: Bass' }).element(),
        panel.querySelector('[role="radiogroup"]') as Element,
        page.getByRole('combobox', { name: 'Tuning' }).element(),
        page.getByRole('switch', { name: 'Handedness: Right' }).element(),
      ]
      return named.every(
        (element, index) =>
          index === 0 ||
          Boolean(
            (named[index - 1]?.compareDocumentPosition(element) ?? 0) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      )
    }
    await expect.element(page.getByRole('radiogroup', { name: 'Guitar type' })).toBeVisible()
    expect(order()).toBe(true)
    // And for a player already on bass.
    act(() => guestPreferences.write({ ...guestPreferences.read(), instrument: 'bass' }))
    await expect.element(page.getByRole('radiogroup', { name: 'Number of strings' })).toBeVisible()
    expect(order()).toBe(true)
  })

  it('closes with a grey Done until something changes, then a blue Save; reopening starts at Done again', async () => {
    await openSettings()
    const done = page.getByRole('button', { name: 'Done' })
    await expect.element(done).toHaveClass(/bg-secondary/)
    expect(page.getByRole('button', { name: 'Save' }).query()).toBeNull()

    await userEvent.click(page.getByText('Left', { exact: true }))
    // Already saved: the button only confirms.
    expect(stored().handedness).toBe('left')
    const save = page.getByRole('button', { name: 'Save' })
    await expect.element(save).toHaveClass(/bg-control/)
    await userEvent.click(save)
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(page.getByRole('button', { name: 'Settings' }))
    await expect.element(page.getByRole('button', { name: 'Done' })).toBeVisible()
  })
})
