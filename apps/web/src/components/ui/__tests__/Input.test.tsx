import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { z } from 'zod'
import { Input } from '../Input'

describe('Input', () => {
  it('orders aria-describedby with the error before the description', async () => {
    const screen = await render(
      <Input id="email" label="Email" description="We never share it." error="Enter an email" />,
    )
    await expect
      .element(screen.getByRole('textbox'))
      .toHaveAttribute('aria-describedby', 'email-error email-description')
  })

  it('only references messages that exist', async () => {
    const screen = await render(<Input id="email" label="Email" description="Hint" />)
    await expect
      .element(screen.getByRole('textbox'))
      .toHaveAttribute('aria-describedby', 'email-description')
    expect(screen.container.querySelector('[role="alert"]')).toBeNull()
  })

  it('reserves error space without rendering an empty live region', async () => {
    const screen = await render(<Input label="Name" reserveErrorSpace />)
    const input = screen.getByRole('textbox').element() as HTMLElement
    const before = input.getBoundingClientRect().top

    expect(screen.container.querySelector('[role="alert"]')).toBeNull()
    await screen.rerender(<Input label="Name" reserveErrorSpace error="Required" />)
    // The control didn't move, and the field's total height is unchanged.
    expect(input.getBoundingClientRect().top).toBe(before)
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Required')
  })

  it('names the control from its label and marks it required', async () => {
    const screen = await render(<Input label="Email" required />)
    const input = screen.getByRole('textbox', { name: /Email/ })
    await expect.element(input).toHaveAttribute('aria-required', 'true')
    await expect.element(input).toBeRequired()
  })

  it('applies className to the wrapper and controlClassName to the input', async () => {
    const screen = await render(
      <Input label="X" className="wrapper-x" controlClassName="control-x" />,
    )
    const input = screen.getByRole('textbox').element()
    expect(input.classList.contains('control-x')).toBe(true)
    expect(input.closest('.wrapper-x')).not.toBeNull()
  })

  it('surfaces React Hook Form + Zod errors through the Field wiring', async () => {
    const schema = z.object({ email: z.email('Enter a valid email') })

    function Form() {
      const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: '' },
      })
      return (
        <form noValidate onSubmit={form.handleSubmit(() => {})}>
          <Input
            label="Email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <button type="submit">Submit</button>
        </form>
      )
    }

    const screen = await render(<Form />)
    await userEvent.fill(screen.getByRole('textbox'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))

    const input = screen.getByRole('textbox')
    await expect.element(input).toHaveAttribute('aria-invalid', 'true')
    await expect.element(input).toHaveAccessibleDescription('Enter a valid email')
  })
})
