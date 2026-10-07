'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import { readStorage } from '@/data/local-storage'
import { useAuth } from '@/hooks/use-auth'
import { MODAL_KEY, useModalRegistry } from '@/providers/ModalProvider'

/** True when the guest has finished exactly one lesson, once, ever: this one. */
function isFirstFinish(): boolean {
  const progress = readStorage(STORAGE_KEYS.guestProgress)
  const finishes = Object.values(progress?.groups ?? {}).reduce(
    (total, group) => total + group.playCount,
    0,
  )
  return finishes === 1
}

/**
 * Whether to invite a guest to sign up on the lesson-complete screen: after
 * their FIRST finished lesson, when there's something worth keeping. Their
 * progress moves into the new account (AccountSync), so the promise is true.
 *
 * Only for a signed-out guest who can sign up (auth configured), and only the
 * first time, so it never nags. Decided once, when the screen appears, so it
 * can't vanish while they're reading it.
 */
export function useSignUpPrompt(): boolean {
  const { isReady, isAuthenticated, isConfigured } = useAuth()
  const [isFirst] = useState(isFirstFinish)
  return isReady && !isAuthenticated && isConfigured && isFirst
}

/** The invitation itself. Render it only when useSignUpPrompt says to. */
export function SignUpPrompt() {
  const { openModal } = useModalRegistry()
  return (
    <section
      aria-labelledby="sign-up-prompt"
      className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-left"
    >
      <Text as="h3" id="sign-up-prompt" variant="heading-4">
        Keep your progress
      </Text>
      <Text variant="paragraph-md" className="text-muted-foreground">
        Create an account to track your progress, practice what you’ve learned, and level up!
      </Text>
      <Button
        onClick={() => openModal(MODAL_KEY.ONBOARDING)}
        label="Sign up for free"
        className="self-end"
      />
    </section>
  )
}
