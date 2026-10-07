# Build context is the repo root (see docker-compose.yml).
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @repo/web...
# Inlined into the client bundle at build time — see src/env/public.ts.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_PUBLIC_PRIVY_APP_ID=${NEXT_PUBLIC_PRIVY_APP_ID}
RUN pnpm --filter @repo/web build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
# Standalone output mirrors the monorepo layout from outputFileTracingRoot.
COPY --from=build /repo/apps/web/.next/standalone ./
# Static assets aren't part of the standalone trace; they must be copied in.
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
