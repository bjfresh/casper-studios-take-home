import type { ReactNode } from 'react'
import { AuthGate } from '@/components/features/auth/AuthGate'
import { OnboardingGate } from '@/components/features/onboarding/OnboardingGate'
import { AppShell } from '@/components/layout/AppShell'

/**
 * Every page in this group needs a signed-in player (AuthGate) with saved
 * settings (OnboardingGate), in that order. Registered modals, including
 * sign-in, are mounted once in the root layout.
 */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <OnboardingGate>
        <AppShell>{children}</AppShell>
      </OnboardingGate>
    </AuthGate>
  )
}
