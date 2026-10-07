import { defineConfig } from 'drizzle-kit'
import { getDatabaseUrl } from './src/env'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  // Generated migrations. Review every file before committing — see README.
  out: './drizzle',
  dbCredentials: { url: getDatabaseUrl() },
  strict: true,
  verbose: true,
})
