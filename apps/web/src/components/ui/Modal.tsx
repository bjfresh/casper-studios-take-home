'use client'

import type { FormEventHandler, ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import { cn } from '@/utils/cn'
import { Button } from './Button'
import { Text } from './Text'

type ModalBaseProps = {
  isOpen: boolean
  /** Called for every dismissal: Close button, Escape, backdrop click. The caller sets isOpen. */
  onClose: () => void
  /** Required: a dialog without an accessible name is unusable with a screen reader. */
  title: string
  description?: string
  children?: ReactNode
  /** Defaults to a single Close button. */
  footer?: ReactNode
  /** Width overrides at the call site (e.g. `max-w-2xl`) — the base has no width variants. */
  className?: string
}

/**
 * `formId` and `onSubmit` come as a pair, only for a modal whose body is a form.
 * The footer sits outside the body, so its submit button can't be inside the
 * <form>; it references it instead with `<Button type="submit" form={formId} label="Save" />`.
 * This is the ONE way to build a form modal — see Modal's doc comment.
 */
type ModalFormProps =
  | { formId: string; onSubmit: FormEventHandler<HTMLFormElement> }
  | { formId?: never; onSubmit?: never }

export type ModalProps = ModalBaseProps & ModalFormProps

/** True when the pointer is outside the dialog's box, i.e. on the ::backdrop. */
function isOutsideDialog(dialog: HTMLDialogElement, event: MouseEvent): boolean {
  // The backdrop is a pseudo-element, so a click on it reports the dialog as
  // its target. So does a click on the dialog's OWN padding — same box. Only
  // the pointer position tells them apart.
  const rect = dialog.getBoundingClientRect()
  // An all-zero rect means the dialog isn't laid out (e.g. mid-frame). Treat
  // as inside, so an unrendered frame can never dismiss it.
  if (rect.top === 0 && rect.left === 0 && rect.width === 0 && rect.height === 0) return false

  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
}

/**
 * The modal shell, on the native <dialog> + showModal(): focus trapping,
 * Escape, background inertness, focus restoration and top-layer stacking all
 * come from the platform. Specific modals compose this — they never render
 * their own dialog, focus handling or backdrop logic.
 *
 * Form modals pass `formId` + `onSubmit`, and the body becomes a real <form>.
 * That's what makes Enter in a text field submit (implicit submission needs a
 * form element). Don't render a <form> inside `children` and wire the footer
 * button with onClick instead: Enter and click would then take two different
 * submit paths, and modals built each way would quietly behave differently.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  formId,
  onSubmit,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const hasDescription = Boolean(description)

  // Latest values for the native listeners below, so they don't re-register
  // (and drop an in-progress mousedown) every time the caller re-renders.
  const onCloseRef = useRef(onClose)
  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    onCloseRef.current = onClose
    isOpenRef.current = isOpen
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    // Guard on the element's own state: showModal() on an open dialog throws.
    if (isOpen && !dialog.open) dialog.showModal()
    else if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    // Close only when the press STARTED and ENDED on the backdrop. Otherwise
    // selecting text in a field and releasing past the edge would dismiss the
    // modal and lose the user's work.
    let pressStartedOutside = false

    const handleMouseDown = (event: MouseEvent) => {
      pressStartedOutside = event.target === dialog && isOutsideDialog(dialog, event)
    }
    const handleMouseUp = (event: MouseEvent) => {
      const shouldClose =
        pressStartedOutside && event.target === dialog && isOutsideDialog(dialog, event)
      pressStartedOutside = false
      if (shouldClose) onCloseRef.current()
    }

    // Native listeners, not React onClick: a click handler on a non-interactive
    // element draws an a11y lint demanding a keyboard equivalent, which <dialog>
    // already provides (Escape).
    dialog.addEventListener('mousedown', handleMouseDown)
    dialog.addEventListener('mouseup', handleMouseUp)
    return () => {
      dialog.removeEventListener('mousedown', handleMouseDown)
      dialog.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Escape fires `cancel` before the browser closes the dialog. Prevent that
  // default and ask the caller instead, so isOpen stays the single source of
  // truth — a caller holding the modal open (e.g. mid-delete) keeps it open.
  // (Chromium ignores preventDefault on a second Escape without user
  // activation; the close handler below still reports that one.)
  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault()
    onCloseRef.current()
  }

  // Programmatic and browser-forced closes take the same path as a button
  // click. Skipped when the caller already set isOpen=false — that close came
  // from our own effect, and reporting it would call onClose twice.
  const handleClose = () => {
    if (isOpenRef.current) onCloseRef.current()
  }

  const bodyClasses = 'flex flex-col gap-4'
  const body = formId ? (
    // noValidate: browser bubbles would compete with Field's announced errors.
    <form id={formId} onSubmit={onSubmit} noValidate className={bodyClasses}>
      {children}
    </form>
  ) : (
    <div className={bodyClasses}>{children}</div>
  )

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Only when a description exists: pointing at an absent node is worse than nothing.
      aria-describedby={hasDescription ? descriptionId : undefined}
      onCancel={handleCancel}
      onClose={handleClose}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-border bg-surface p-6 text-foreground shadow-xl',
        'max-h-[calc(100dvh-2rem)] overflow-y-auto',
        'backdrop:bg-black/50',
        className,
      )}
    >
      {/* Layout lives on an inner wrapper: `flex` on the <dialog> itself would
          override the UA's display:none and show it while closed. */}
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <Text as="h2" id={titleId} variant="heading-4">
            {title}
          </Text>
          {hasDescription && (
            <Text id={descriptionId} variant="paragraph-sm" className="text-muted-foreground">
              {description}
            </Text>
          )}
        </header>
        {children != null && body}
        <footer className="flex flex-wrap justify-end gap-2">
          {footer ?? <Button variant="secondary" size="sm" onClick={onClose} label="Close" />}
        </footer>
      </div>
    </dialog>
  )
}
