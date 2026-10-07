---
paths: ["apps/web/src/**/*.tsx"]
---
# Forms

- Any form with validation, multiple fields or meaningful submission state uses
  React Hook Form. No hand-rolled `useState` form state.
- No `<Form>` wrapper component. Compose `useForm`, a native `<form noValidate>`,
  and the `ui/` controls.
- Zod via `zodResolver`; the value type is inferred, never declared twice:
  `useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues })`.
  Prefer the shared domain schema; write a form-specific one only when
  browser-only values or interaction constraints genuinely differ.
- `register()` for native-compatible inputs; `Controller` for Radix Select,
  switches, pickers and uploads. `register()` on a `Switch` renders fine and
  silently never updates the value; map `field.value`/`field.onChange` to
  `checked`/`onCheckedChange`.
- A switch in a form only when the form auto-saves or the toggle fires its own
  mutation. Otherwise use a checkbox.
- Errors go through each control's `error` prop
  (`error={formState.errors.x?.message}`). Never render error text by hand.
- RHF owns values, errors, dirty/valid/submitting state. Read `formState`; don't
  mirror it in `useState`. Local state only for things outside the form model.
- Read `watch`ed values into named variables above the JSX.
- Use `setValue`/`reset`/`setError`, not shadow state. A parent mutation may own
  async persistence state; pass it in rather than duplicating it.
- Map API `issues` onto fields with `setError(issue.path, { message })`.
- Unsaved work: `useBeforeUnload(formState.isDirty)`, and `reset(savedValues)`
  after a successful submit so the warning clears.
