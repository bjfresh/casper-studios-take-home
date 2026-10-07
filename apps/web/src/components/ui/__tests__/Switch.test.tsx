import { Controller, useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Switch } from '../Switch'

function thumbOffset(control: Element) {
  const thumb = control.firstElementChild
  if (!thumb) throw new Error('no thumb')
  return thumb.getBoundingClientRect().left - control.getBoundingClientRect().left
}

describe('Switch', () => {
  it('is associated with its label: found by it, and toggled by clicking it', async () => {
    await render(<Switch label="Email notifications" />)
    const control = page.getByLabelText('Email notifications')
    await expect.element(control).toHaveAttribute('role', 'switch')

    await userEvent.click(page.getByText('Email notifications'))
    await expect.element(control).toHaveAttribute('aria-checked', 'true')
  })

  it('exposes role="switch" with aria-checked in both states, and moves the thumb', async () => {
    await render(<Switch label="Wi-Fi" />)
    const control = page.getByRole('switch', { name: 'Wi-Fi' })
    await expect.element(control).toHaveAttribute('aria-checked', 'false')
    const offOffset = thumbOffset(control.element())

    await userEvent.click(control)
    await expect.element(control).toHaveAttribute('aria-checked', 'true')
    // State isn't carried by colour alone: the thumb moves (after its transition).
    await expect.poll(() => thumbOffset(control.element())).toBeGreaterThan(offOffset + 15)
  })

  it.each(['{Space}', '{Enter}'])('toggles from the keyboard with %s', async (key) => {
    await render(<Switch label="Wi-Fi" />)
    const control = page.getByRole('switch')
    ;(control.element() as HTMLElement).focus()

    await userEvent.keyboard(key)
    await expect.element(control).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard(key)
    await expect.element(control).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onCheckedChange with the new value', async () => {
    const onCheckedChange = vi.fn()
    await render(<Switch label="Wi-Fi" onCheckedChange={onCheckedChange} />)
    await userEvent.click(page.getByRole('switch'))
    await userEvent.click(page.getByRole('switch'))
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]])
  })

  it('does not toggle when disabled, by click or by key', async () => {
    const onCheckedChange = vi.fn()
    await render(<Switch label="Wi-Fi" disabled onCheckedChange={onCheckedChange} />)
    const control = page.getByRole('switch')

    // force: Playwright won't click disabled targets on its own; we want to
    // prove the click itself does nothing.
    await userEvent.click(control, { force: true })
    await userEvent.click(page.getByText('Wi-Fi'), { force: true })
    ;(control.element() as HTMLElement).focus()
    await userEvent.keyboard('{Space}{Enter}')

    expect(onCheckedChange).not.toHaveBeenCalled()
    await expect.element(control).toHaveAttribute('aria-checked', 'false')
    await expect.element(control).toBeDisabled()
  })

  it('links an error, marks it invalid, and SHOWS it', async () => {
    await render(
      <div>
        <Switch id="valid" label="Valid" />
        <Switch id="invalid" label="Invalid" description="Hint" error="Required to continue" />
      </div>,
    )
    const valid = page.getByRole('switch', { name: 'Valid' })
    const invalid = page.getByRole('switch', { name: 'Invalid' })

    await expect.element(invalid).toHaveAttribute('aria-invalid', 'true')
    await expect
      .element(invalid)
      .toHaveAttribute('aria-describedby', 'invalid-error invalid-description')
    await expect.element(invalid).toHaveAccessibleDescription('Required to continue Hint')
    // Not just announced: it looks different from a valid switch.
    expect(getComputedStyle(invalid.element()).borderTopColor).not.toBe(
      getComputedStyle(valid.element()).borderTopColor,
    )
  })

  it('stays on the controlled value when no onCheckedChange is given', async () => {
    await render(<Switch label="Wi-Fi" checked={false} />)
    const control = page.getByRole('switch')
    await userEvent.click(control)
    await userEvent.click(control)
    await expect.element(control).toHaveAttribute('aria-checked', 'false')
  })

  it('applies className to the wrapper and controlClassName to the track', async () => {
    await render(<Switch label="Wi-Fi" className="wrapper-x" controlClassName="control-x" />)
    const control = page.getByRole('switch').element()
    expect(control.classList.contains('control-x')).toBe(true)
    expect(control.closest('.wrapper-x')).not.toBeNull()
  })

  it('drives a React Hook Form value through Controller', async () => {
    const onSubmit = vi.fn()

    function Form() {
      const form = useForm<{ notifications: boolean }>({ defaultValues: { notifications: false } })
      return (
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            control={form.control}
            name="notifications"
            render={({ field, fieldState }) => (
              <Switch
                label="Email notifications"
                checked={field.value}
                onCheckedChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <button type="submit">Save</button>
        </form>
      )
    }

    await render(<Form />)
    await userEvent.click(page.getByRole('switch'))
    await userEvent.click(page.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ notifications: true })
  })
})
