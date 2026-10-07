'use client'

import type { Prettify } from '@repo/shared'
import type { ComponentPropsWithRef, MouseEvent } from 'react'
import { cn } from '@/utils/cn'
import {
  BUTTON_ICON_CLASSES,
  ButtonContent,
  type ButtonStyleProps,
  buttonClasses,
} from './button-variants'
import { Spinner } from './Spinner'

// Re-exported so callers keep importing button styling from one place.
export {
  BUTTON_ICON_CLASSES,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  type ButtonContentProps,
  type ButtonSize,
  type ButtonStyleProps,
  type ButtonVariant,
  buttonClasses,
  buttonVariants,
} from './button-variants'

export type ButtonProps = Prettify<
  // No children: the label and icons are props, so every button renders its
  // content the same way.
  Omit<ComponentPropsWithRef<'button'>, 'children'> &
    ButtonStyleProps & {
      /** Spinner, aria-busy, and activation blocked. Stays focusable; width doesn't change. */
      loading?: boolean
      /** Screen-reader text announced while loading. */
      loadingLabel?: string
    }
>

/**
 * An action. Everything it shows comes from props:
 *
 *   <Button label="Got it" />
 *   <Button label="Add chord" leftIcon={<PlusIcon />} />
 *   <Button label="Settings" leftIcon={<MenuIcon />} hideLabel variant="ghost" />
 *
 * `label` is the visible text and the accessible name; with `hideLabel` it's
 * only the accessible name, and the button is a square at its size's height.
 * For navigation use LinkButton, which takes the same props.
 */
export function Button({
  label,
  hideLabel,
  leftIcon,
  rightIcon,
  variant,
  size = 'md',
  loading = false,
  loadingLabel = 'Loading',
  className,
  type,
  onClick,
  ...props
}: ButtonProps) {
  const hasLeftIcon = leftIcon != null
  // With a left icon the spinner swaps into the icon's box; otherwise it
  // overlays the label. Either way the button's width is unchanged.
  const showIconSpinner = loading && hasLeftIcon
  const showOverlaySpinner = loading && !hasLeftIcon

  // aria-busy instead of `disabled` keeps the button focusable while loading,
  // so focus isn't lost mid-submit; activation is blocked here instead.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      // A hidden label still names the button; an explicit aria-label wins.
      aria-label={hideLabel ? label : undefined}
      {...props}
      type={type ?? 'button'}
      className={buttonClasses({ variant, size, hideLabel, className })}
      aria-busy={loading || undefined}
      onClick={handleClick}
    >
      {/* `invisible`, not `hidden`: the label keeps reserving its width under the overlay. */}
      <span className={cn('inline-flex items-center gap-2', showOverlaySpinner && 'invisible')}>
        <ButtonContent
          label={label}
          hideLabel={hideLabel}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          size={size}
          leftIconSlot={showIconSpinner ? <Spinner className="size-full" /> : undefined}
        />
      </span>
      {showOverlaySpinner && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <Spinner className={BUTTON_ICON_CLASSES[size]} />
        </span>
      )}
      {loading && <span className="sr-only">{loadingLabel}</span>}
    </button>
  )
}
