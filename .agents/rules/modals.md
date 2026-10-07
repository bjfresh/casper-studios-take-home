---
paths: ["apps/web/src/components/**", "apps/web/src/providers/**"]
---
# Modals

- Every modal composes `ui/Modal` (native `<dialog>`). A specific modal supplies
  title, description, body and footer, never its own dialog element, focus
  handling or backdrop logic.
- Destructive or irreversible confirmations use `modals/ConfirmModal`, never
  `window.confirm`. It doesn't close itself: close on success, stay open with
  the error in the body on failure.
- Local modals use `useDisclosure()`. Register in `ModalProvider` only when
  something far away must open it, and follow the three steps in that file.
  Registered modals render in `components/layout/RegisteredModals.tsx`, which
  the root layout mounts once.
- Most modals are not forms: no `formId`, no `onSubmit`, and often no footer
  (the default is a Close button).
- Form modals are built ONE way: `formId={`${useId()}-<name>-form`}` +
  `onSubmit={form.handleSubmit(...)}`, with the footer's
  `<Button type="submit" form={formId}>`. Never a `<form>` inside `children`
  with an onClick submit.
- Submission errors go in the modal body, not a toast.
- Width via `className` at the call site; no width variants on the base.
