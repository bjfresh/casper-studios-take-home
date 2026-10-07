# components/modals/

Specific dialogs composed from `ui/Modal`. A modal here supplies title,
description, body and footer, never its own `<dialog>`, focus or backdrop logic.

- `ConfirmModal`: replaces `window.confirm` for destructive actions. It doesn't
  close itself; the caller closes it on success.

Opening: `useDisclosure()` locally. Use `providers/ModalProvider` only for
modals opened from far away. Conventions: `.agents/rules/modals.md`.
