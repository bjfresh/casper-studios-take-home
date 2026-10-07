import type { Prettify } from '@repo/shared'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { UseFieldResult } from '@/hooks/use-field'
import { cn } from '@/utils/cn'
import { Label } from './Label'
import { Text, textVariants } from './Text'

/**
 * The focus ring every form control shares. Its colour comes from the state
 * (ring-ring normally, ring-danger with an error), so it isn't fixed here.
 */
export const focusRingClasses =
  'outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background'

/**
 * Shared by every control so borders, focus rings, placeholder color and
 * disabled treatment are identical. Typography comes from the Text scale
 * (16px on mobile — below that, iOS Safari zooms the page on focus).
 */
export const controlBaseClasses = cn(
  'w-full rounded-md border bg-surface px-3 text-foreground transition-colors',
  focusRingClasses,
  textVariants({ variant: 'paragraph-md' }),
  'md:text-sm/6',
  'placeholder:text-muted-foreground',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

export function controlStateClasses(hasError: boolean): string {
  return hasError
    ? 'border-danger focus-visible:ring-danger'
    : 'border-input hover:border-input-hover focus-visible:ring-ring disabled:hover:border-input'
}

/** Props every Field-backed control (Input, TextArea…) accepts. */
export type FieldControlOwnProps = {
  label: ReactNode
  description?: ReactNode
  /** Validation message. Pass RHF's `errors.x?.message` straight in. */
  error?: ReactNode
  hint?: ReactNode
  layout?: FieldLayout
  reserveErrorSpace?: boolean
}

export type FieldLayout = 'stacked' | 'inline'

export type FieldProps = Prettify<
  // `error` is omitted from the div props: here it's a ReactNode message,
  // unrelated to any DOM attribute.
  Omit<ComponentPropsWithoutRef<'div'>, 'error'> &
    Omit<FieldControlOwnProps, 'error'> & {
      field: UseFieldResult
      error?: ReactNode
      required?: boolean
      children: ReactNode
    }
>

/**
 * Label, control, then description and error — the wrapper every labelled
 * control shares. `stacked` puts the label above (text inputs); `inline` puts
 * the control before the label (checkbox, switch).
 */
export function Field({
  field,
  label,
  description,
  error,
  hint,
  required = false,
  layout = 'stacked',
  reserveErrorSpace = false,
  className,
  children,
  ...props
}: FieldProps) {
  const { fieldId, descriptionId, errorId, hasError, hasDescription, disabled } = field
  const isInline = layout === 'inline'
  // Its own slot, separate from the description: reserving space only when
  // there's no description would still shift layout when an error replaces it.
  const showErrorSlot = hasError || reserveErrorSpace

  const labelNode = (
    <Label
      htmlFor={fieldId}
      required={required}
      hint={hint}
      className={cn(disabled && 'opacity-50')}
    >
      {label}
    </Label>
  )

  const messages = (
    <>
      {hasDescription && (
        <Text id={descriptionId} variant="paragraph-sm" className="text-muted-foreground">
          {description}
        </Text>
      )}
      {showErrorSlot && (
        <Text
          id={errorId}
          variant="paragraph-sm"
          // role="alert" only with a message — an empty live region is noise.
          role={hasError ? 'alert' : undefined}
          className={cn('text-danger', reserveErrorSpace && 'min-h-[1lh]')}
        >
          {hasError ? error : null}
        </Text>
      )}
    </>
  )

  if (isInline) {
    return (
      <div
        className={cn('grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-1', className)}
        {...props}
      >
        <div className="flex min-h-5 items-center">{children}</div>
        {labelNode}
        <div className="col-start-2 flex flex-col gap-1">{messages}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...props}>
      {labelNode}
      {children}
      {messages}
    </div>
  )
}
