import type { PlayerProfile } from '@repo/shared'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { PlayerSettingsFields } from '../PlayerSettingsFields'
import { usePlayerSettingsForm } from '../use-player-settings-form'

function SubmitForm({ onSave }: { onSave: (settings: PlayerProfile) => void }) {
  const form = usePlayerSettingsForm()
  return (
    <form noValidate onSubmit={form.handleSubmit(onSave)}>
      <PlayerSettingsFields form={form} />
      <button type="submit">Continue</button>
    </form>
  )
}

describe('PlayerSettingsFields (submit mode)', () => {
  it('labels every control, with the Settings menu’s two-sided switches', async () => {
    await render(<SubmitForm onSave={() => {}} />)
    await expect.element(page.getByRole('textbox', { name: 'Your name' })).toBeVisible()
    await expect.element(page.getByRole('switch', { name: 'Instrument: Bass' })).toBeVisible()
    await expect.element(page.getByRole('switch', { name: 'Handedness: Right' })).toBeVisible()
    for (const side of ['Guitar', 'Bass', 'Left', 'Right']) {
      await expect.element(page.getByText(side, { exact: true })).toBeVisible()
    }
  })

  it('bass is shown but not selectable yet: "coming soon"', async () => {
    await render(<SubmitForm onSave={() => {}} />)
    const instrument = page.getByRole('switch', { name: 'Instrument: Bass' })
    await expect.element(instrument).toBeDisabled()
    await expect.element(instrument).not.toBeChecked()
    await expect.element(page.getByText('(coming soon)')).toBeVisible()
  })

  it('maps the switches onto the shared enums, defaulting to right-handed guitar', async () => {
    const onSave = vi.fn()
    await render(<SubmitForm onSave={onSave} />)
    await userEvent.fill(page.getByRole('textbox', { name: 'Your name' }), '  Jaco  ')
    // A side's label selects that side.
    await userEvent.click(page.getByText('Left', { exact: true }))
    await userEvent.click(page.getByRole('button', { name: 'Continue' }))

    // Trimmed by the shared schema; the instrument left at its default.
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      displayName: 'Jaco',
      instrument: 'guitar',
      handedness: 'left',
    })
  })

  it('requires a name, through the Field wiring', async () => {
    const onSave = vi.fn()
    await render(<SubmitForm onSave={onSave} />)
    await userEvent.click(page.getByRole('button', { name: 'Continue' }))

    const name = page.getByRole('textbox', { name: 'Your name' })
    await expect.element(name).toHaveAttribute('aria-invalid', 'true')
    await expect.element(name).toHaveAccessibleDescription('Enter your name')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('caps the name at the shared limit', async () => {
    await render(<SubmitForm onSave={() => {}} />)
    const name = page.getByRole('textbox', { name: 'Your name' })
    await userEvent.fill(name, 'x'.repeat(80))
    expect((name.element() as HTMLInputElement).value).toHaveLength(50)
  })
})
