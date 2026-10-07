import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

// Component tests run in real Chromium (browser mode), not jsdom: the behaviour
// worth testing here — a button not resizing while loading, a textarea growing
// with its content — depends on real layout and real CSS, which jsdom doesn't do.
// Tailwind runs through the Vite plugin so classes actually apply.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // next/link reads process.env.__NEXT_* flags, and env/public.ts reads
  // NEXT_PUBLIC_*. Next's compiler inlines those at build time; Vite doesn't,
  // and browsers have no `process`. No Privy app id here: tests run in the
  // unconfigured mode by default and mock the auth boundary where they need more.
  define: {
    'process.env': JSON.stringify({ NODE_ENV: 'test', NEXT_PUBLIC_API_URL: 'http://api.test' }),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Pre-bundled up front. Otherwise, on a cold cache (every CI run, a fresh
  // clone), Vite discovers these partway through the browser run, re-bundles
  // and reloads, and the test files loading at that moment fail. Add a
  // dependency here when a test first imports it.
  optimizeDeps: {
    include: [
      '@hookform/resolvers/zod',
      '@orpc/client',
      '@orpc/client/fetch',
      '@orpc/client/standard',
      '@orpc/contract',
      '@orpc/contract/plugins',
      '@orpc/tanstack-query',
      '@privy-io/react-auth',
      '@tanstack/react-query',
      'class-variance-authority',
      'clsx',
      'next/font/google',
      'next/link',
      'radix-ui',
      'react',
      'react-dom',
      'react-hook-form',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      'tailwind-merge',
      'vitest-browser-react',
      'zod',
    ],
  },
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
