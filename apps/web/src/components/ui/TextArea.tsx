'use client'

import type { Prettify } from '@repo/shared'
import type { ComponentPropsWithRef, CSSProperties } from 'react'
import { useField } from '@/hooks/use-field'
import { cn } from '@/utils/cn'
import { controlBaseClasses, controlStateClasses, Field, type FieldControlOwnProps } from './Field'

export type TextAreaProps = Prettify<
  // `rows` is omitted on purpose: it has no effect under `field-sizing: content`,
  // so exposing it would be a prop that silently does nothing. Use minRows/maxRows.
  Omit<ComponentPropsWithRef<'textarea'>, 'rows' | 'className'> &
    FieldControlOwnProps & {
      /** Grow with content between minRows and maxRows (default). False: fixed height, user-resizable. */
      autoGrow?: boolean
      /** Height floor in lines. Without one an empty field collapses and reads as an input. */
      minRows?: number
      /** Height ceiling in lines; beyond it the field scrolls. Ignored when autoGrow is false. */
      maxRows?: number
      /** Styles the field WRAPPER (layout, spacing). */
      className?: string
      /** Styles the <textarea> element itself. */
      controlClassName?: string
    }
>

/**
 * Auto-grow is pure CSS (`field-sizing: content`), with no JS measuring loop.
 *
 * Fallback decision: browsers without field-sizing (it reached Baseline in June
 * 2026) get a fixed-height textarea at minRows that scrolls internally. The
 * field still works, so there's deliberately no JS path behind @supports.
 *
 * Bounds use `lh` so they track the type scale, plus the element's own vertical
 * padding (py-2 → 2 × 0.5rem) and borders (2 × 1px) for a true border-box height.
 * No `height`/`width` is set anywhere — either would reimpose fixed sizing.
 */
export function TextArea({
  label,
  description,
  error,
  hint,
  layout,
  reserveErrorSpace,
  autoGrow = true,
  minRows = 3,
  maxRows = 10,
  className,
  controlClassName,
  id,
  required,
  disabled,
  style,
  ...props
}: TextAreaProps) {
  const field = useField({ id, description, error, required, disabled })

  const bounds = {
    '--textarea-min-rows': minRows,
    '--textarea-max-rows': maxRows,
    ...style,
  } as CSSProperties

  return (
    <Field
      field={field}
      label={label}
      description={description}
      error={error}
      hint={hint}
      layout={layout}
      required={required}
      reserveErrorSpace={reserveErrorSpace}
      className={className}
    >
      <textarea
        {...props}
        {...field.controlProps}
        required={required}
        disabled={disabled}
        style={bounds}
        className={cn(
          controlBaseClasses,
          controlStateClasses(field.hasError),
          'py-2',
          'min-h-[calc(var(--textarea-min-rows)*1lh+1rem+2px)]',
          autoGrow
            ? // Past max-height the browser scrolls internally; no overflow bookkeeping.
              'field-sizing-content resize-none max-h-[calc(var(--textarea-max-rows)*1lh+1rem+2px)]'
            : 'field-sizing-fixed resize-y',
          controlClassName,
        )}
      />
    </Field>
  )
}
