'use client'

import { useState } from 'react'
import { BUTTON_SIZES, BUTTON_VARIANTS, Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { ROUTES } from '@/constants/routes'

/** Every Button variant and size, icons, and each state. */
export function ButtonGallery() {
  const [isLoading, setIsLoading] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} label={variant} />
        ))}
      </div>

      {/* Each size with its hidden-label (icon-only) twin: the same height, side by side. */}
      <div className="flex flex-wrap items-center gap-3">
        {BUTTON_SIZES.map((size) => (
          <span key={size} className="flex items-center gap-2">
            <Button size={size} label={size} />
            <Button
              size={size}
              variant="secondary"
              label={`Add (${size})`}
              leftIcon={<PlusIcon />}
              hideLabel
            />
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button leftIcon={<PlusIcon />} label="Left icon" />
        <Button variant="secondary" rightIcon={<CheckIcon />} label="Right icon" />
        <Button disabled label="Disabled" />
        {/* Same label while loading: changing it would resize the button. */}
        <Button
          loading={isLoading}
          onClick={() => {
            setIsLoading(true)
            window.setTimeout(() => setIsLoading(false), 1500)
          }}
          label="Click to load"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <LinkButton href={ROUTES.home} variant="secondary" label="LinkButton" />
        <LinkButton href={ROUTES.home} variant="link" label="Link variant" />
        <LinkButton href={ROUTES.home} disabled label="Disabled link" />
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  )
}
