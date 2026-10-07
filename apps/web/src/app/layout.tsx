import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AccountSync } from '@/components/layout/AccountSync'
import { RegisteredModals } from '@/components/layout/RegisteredModals'
import { FONT_VARIABLES } from '@/constants/fonts'
import { AppProviders } from '@/providers/AppProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'TabShredder',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={FONT_VARIABLES}>
      <body>
        <AppProviders>
          {children}
          <RegisteredModals />
          <AccountSync />
        </AppProviders>
      </body>
    </html>
  )
}
