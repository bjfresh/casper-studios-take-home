import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  clean: true,
  // Bundle everything, including the @repo/* workspace packages (which ship
  // TypeScript source) and their dependencies. pnpm's strict node_modules means
  // apps/api can't resolve drizzle-orm/postgres at runtime — they're @repo/db's
  // deps — so a self-contained bundle is what lets the Docker image run with
  // just dist/.
  noExternal: [/.*/],
  // Some bundled CJS deps call require(); ESM output has no `require` global.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
})
