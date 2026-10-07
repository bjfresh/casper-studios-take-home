'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/hooks/use-auth'
import { MODAL_KEY, useModalRegistry } from '@/providers/ModalProvider'

/**
 * Gates the authenticated shell. This is UX, not security: hiding a page
 * protects nothing. Every API operation behind it authenticates and
 * authorizes on the server independently.
 *
 * - Nothing signed-out renders until `isReady`. Otherwise a restored session
 *   flashes the sign-in prompt for a frame.
 * - Signed out, the prompt renders IN PLACE instead of redirecting, so the URL
 *   the user was trying to reach is still the one they land on.
 * - Product chrome is passed as children, so signed-out visitors never see
 *   private navigation or feature names.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isReady, isConfigured, isAuthenticated } = useAuth()

  if (!isReady) {
    return (
      <GateFrame>
        <Spinner className="size-6 text-muted-foreground" />
        <span className="sr-only">Checking your session</span>
      </GateFrame>
    )
  }
  if (!isConfigured) return <AuthUnavailable />
  if (!isAuthenticated) return <SignInPrompt />
  return children
}

function GateFrame({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </main>
  )
}

function SignInPrompt() {
  const { openModal } = useModalRegistry()
  return (
    <GateFrame>
      <Text as="h1" variant="heading-2">
        Sign in to continue
      </Text>
      <Text variant="paragraph-md" className="text-muted-foreground">
        You need to be signed in to see this page.
      </Text>
      {/* One button: the sign-in modal offers both Sign In and Sign Up. */}
      <Button onClick={() => openModal(MODAL_KEY.SIGN_IN)} label="Sign In" />
    </GateFrame>
  )
}

function AuthUnavailable() {
  return (
    <GateFrame>
      <Text as="h1" variant="heading-2">
        Sign-in unavailable
      </Text>
      <Text variant="paragraph-md" className="text-muted-foreground">
        Authentication isn’t configured in this environment, so signed-in pages can’t be shown.
      </Text>
    </GateFrame>
  )
}
