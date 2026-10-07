import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (apps/web/Dockerfile).
  output: 'standalone',
  // In a monorepo, file tracing must start at the repo root or workspace
  // packages are left out of the standalone bundle.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // @repo/shared ships TypeScript source, not compiled JS.
  transpilePackages: ['@repo/shared'],
}

export default nextConfig
