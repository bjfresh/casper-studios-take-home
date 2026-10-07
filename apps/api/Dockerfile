# Build context is the repo root (see docker-compose.yml).
FROM node:24-alpine AS base
# Corepack reads "packageManager" from package.json, so the image uses the same
# pnpm version as everyone else.
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @repo/api... --filter @repo/db...
RUN pnpm --filter @repo/api build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# The bundle is self-contained (see tsup.config.ts), so no node_modules needed.
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
