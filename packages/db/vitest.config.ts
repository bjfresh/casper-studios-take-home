import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    env: {
      // Always replace DATABASE_URL, never fall back to it: .env also defines
      // the *development* URL, and tests must not run against dev data. If
      // TEST_DATABASE_URL is unset this becomes '', so any test that touches
      // the database fails loudly in getDatabaseUrl() instead of silently
      // using another database. No hardcoded host/port default for the same reason.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
    },
  },
})
