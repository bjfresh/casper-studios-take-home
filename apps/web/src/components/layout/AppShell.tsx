'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { SettingsBar } from '@/components/features/settings-menu/SettingsMenu'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { Text } from '@/components/ui/Text'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/use-auth'

/** Signed-in chrome. Rendered only inside AuthGate, so signed-out visitors never see it. */
export function AppShell({ children }: { children: ReactNode }) {
  const { email, logout } = useAuth()

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border py-3">
        {/* Same centred container as the page, so the Settings panel (which
            takes its anchor's width) lines up with the content below. */}
        <SettingsBar
          // Small, like the account buttons beside it.
          size="sm"
          className="mx-auto max-w-3xl px-6"
          start={
            <div className="flex items-center gap-4">
              <Text asChild variant="accent-lg" weight="semibold">
                <Link href={ROUTES.home}>TabShredder</Link>
              </Text>
              <nav aria-label="Main" className="flex items-center gap-1">
                <LinkButton href={ROUTES.home} variant="ghost" size="sm" label="Lessons" />
              </nav>
            </div>
          }
          end={
            <>
              {email && (
                <Text
                  variant="accent-md"
                  weight="regular"
                  truncate
                  className="hidden max-w-48 text-muted-foreground sm:block"
                >
                  {email}
                </Text>
              )}
              <Button variant="ghost" size="sm" onClick={() => void logout()} label="Sign out" />
            </>
          }
        />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  )
}
