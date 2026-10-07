import { type ReactNode, useId } from 'react'

export type UseFieldOptions = {
  /** Explicit id, for callers that reference the field from outside (a counter, a custom message). */
  id?: string
  description?: ReactNode
  error?: ReactNode
  required?: boolean
  disabled?: boolean
}

export type FieldControlAria = {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  'aria-required': true | undefined
}

export type UseFieldResult = {
  fieldId: string
  descriptionId: string
  errorId: string
  hasError: boolean
  hasDescription: boolean
  /** Spread onto the control: the complete ARIA wiring. */
  controlProps: FieldControlAria
  disabled: boolean
}

function hasContent(node: ReactNode): boolean {
  return node != null && node !== false && node !== ''
}

export function useField({
  id,
  description,
  error,
  required = false,
  disabled = false,
}: UseFieldOptions = {}): UseFieldResult {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = `${fieldId}-description`
  const errorId = `${fieldId}-error`
  const hasError = hasContent(error)
  const hasDescription = hasContent(description)

  // Error first: screen readers read describedby in order, so the problem is
  // announced before the standing hint. Ids are only referenced when their
  // element has content — never point at an empty node.
  const describedBy =
    [hasError ? errorId : null, hasDescription ? descriptionId : null].filter(Boolean).join(' ') ||
    undefined

  return {
    fieldId,
    descriptionId,
    errorId,
    hasError,
    hasDescription,
    controlProps: {
      id: fieldId,
      'aria-describedby': describedBy,
      'aria-invalid': hasError || undefined,
      'aria-required': required || undefined,
    },
    disabled,
  }
}
