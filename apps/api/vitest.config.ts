import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
    // One test file at a time: they share one test database, and some change
    // shared reference data briefly (curriculum-service.test.ts re-syncs a
    // reordered curriculum, then restores it). In parallel, another file could
    // read mid-change and fail intermittently. Costs a few seconds (about 4s
    // to 8s for the whole suite); worth it for a suite that never flakes.
    fileParallelism: false,
    // See packages/db/vitest.config.ts: always the test DB, never a fallback.
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
  },
})
