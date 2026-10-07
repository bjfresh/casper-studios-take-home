'use client'

import { SettingsBar } from '@/components/features/settings-menu/SettingsMenu'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/hooks/use-auth'
import { MODAL_KEY, useModalRegistry } from '@/providers/ModalProvider'

/** Minimal: the name, then Sign In (or Sign out), then Settings. */
export function HomeHeader() {
  const { isReady, isAuthenticated, logout } = useAuth()
  const { openModal } = useModalRegistry()

  return (
    <header>
      <SettingsBar
        // Small, like the account buttons beside it.
        size="sm"
        start={
          <Text as="span" variant="accent-lg" weight="semibold">
            TabShredder
          </Text>
        }
        end={
          // Nothing until auth settles, so the wrong buttons never flash.
          isReady && (
            <nav aria-label="Account" className="flex items-center gap-2">
              {isAuthenticated ? (
                // Account details are in the Settings menu's Account tab.
                <Button variant="ghost" size="sm" onClick={() => void logout()} label="Sign out" />
              ) : (
                // Both returning and new players start here; the modal splits them.
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openModal(MODAL_KEY.SIGN_IN)}
                  label="Sign In"
                />
              )}
            </nav>
          )
        }
      />
    </header>
  )
}
