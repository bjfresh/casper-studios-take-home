import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.WEB_PORT ?? 3000)
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI tests the production build; locally, reuse a running `pnpm dev`.
    command: isCI ? 'pnpm start' : 'pnpm dev',
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
  },
})
