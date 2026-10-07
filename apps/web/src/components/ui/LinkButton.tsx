import type { Prettify } from '@repo/shared'
import Link from 'next/link'
import type { ComponentPropsWithRef } from 'react'
import { ButtonContent, type ButtonStyleProps, buttonClasses } from './button-variants'

export type LinkButtonProps = Prettify<
  // No children, as for Button: the label and icons are props.
  Omit<ComponentPropsWithRef<typeof Link>, 'children'> &
    ButtonStyleProps & {
      /**
       * Anchors have no disabled attribute: this renders a non-navigating,
       * non-focusable anchor with aria-disabled instead.
       */
      disabled?: boolean
    }
>

/**
 * A router link that looks and reads exactly like a Button: the same props
 * (`label`, `leftIcon`, `rightIcon`, `hideLabel`), the same classes and the
 * same content renderer.
 *
 *   <LinkButton href="/" label="Back to lessons" />
 *   <LinkButton href="/" label="Back" leftIcon={<BackArrow />} hideLabel variant="ghost" />
 */
export function LinkButton({
  label,
  hideLabel,
  leftIcon,
  rightIcon,
  variant,
  size = 'md',
  disabled = false,
  className,
  // Link-only props, pulled out so the disabled <a> doesn't receive them as
  // unknown DOM attributes.
  href,
  prefetch,
  replace,
  scroll,
  shallow,
  passHref,
  locale,
  onNavigate,
  legacyBehavior: _legacyBehavior,
  ...props
}: LinkButtonProps) {
  const classes = buttonClasses({ variant, size, hideLabel, className })
  // A hidden label still names the link; an explicit aria-label wins.
  const name = { 'aria-label': hideLabel ? label : undefined }
  const content = (
    <ButtonContent
      label={label}
      hideLabel={hideLabel}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      size={size}
    />
  )

  if (disabled) {
    return (
      // No href → no navigation. role="link" because an <a> without href loses
      // its link role; tabIndex -1 removes it from the tab order.
      <a {...name} {...props} role="link" aria-disabled="true" tabIndex={-1} className={classes}>
        {content}
      </a>
    )
  }

  return (
    <Link
      {...name}
      {...props}
      href={href}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      shallow={shallow}
      passHref={passHref}
      locale={locale}
      onNavigate={onNavigate}
      className={classes}
    >
      {content}
    </Link>
  )
}
