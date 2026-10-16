# Build context: repository root. One image runs three processes:
#   api:       default CMD (runs migrations first)
#   worker:    node dist/worker.js
#   scheduler: node dist/scheduler.js

# Prisma engines on Alpine need OpenSSL
FROM node:22-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app
# No .git in the build context: skip the root `prepare: husky` script
ENV HUSKY=0

# ── Prune the monorepo to @sealvo/api and its workspace deps ─
FROM base AS prepare
# Keep in sync with the root package.json
ARG TURBO_VERSION=2.11.7
RUN npm install -g turbo@${TURBO_VERSION}
COPY . .
RUN turbo prune @sealvo/api --docker

# ── Build ────────────────────────────────────────────────────
FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN npm ci
COPY --from=prepare /app/out/full/ .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npx turbo build --filter=@sealvo/api

# ── Production dependencies only ─────────────────────────────
FROM base AS prod-deps
COPY --from=prepare /app/out/json/ .
# husky is a devDependency: drop the root `prepare` hook before a production install.
# Do not run `prisma generate` here: it falls back to a full `npm install` (devDependencies
# included); the generated client is copied from the builder instead.
RUN npm pkg delete scripts.prepare \
 && npm ci --omit=dev

# ── Runtime ──────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY --from=prod-deps --chown=appuser:appgroup /app ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder --chown=appuser:appgroup /app/packages/shared/dist packages/shared/dist
COPY --from=builder --chown=appuser:appgroup /app/apps/api/dist apps/api/dist
COPY --chown=appuser:appgroup apps/api/prisma apps/api/prisma
# EmailService resolves templates from <cwd>/../../src/app/views/mails
COPY --chown=appuser:appgroup src/app/views/mails src/app/views/mails

WORKDIR /app/apps/api
USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["sh", "-c", "npx --no prisma migrate deploy --schema=./prisma/schema.prisma && exec node dist/main.js"]
