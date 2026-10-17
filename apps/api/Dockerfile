# Build context: repository root. One image runs three processes:
#   api:       default CMD (runs migrations first)
#   worker:    node dist/worker.js
#   scheduler: node dist/scheduler.js

# Prisma engines on Alpine need OpenSSL
# Pinned by digest (Dependabot updates it): a rebuild of the same commit uses the same base
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS base
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
# Day boundaries (spaced repetition, streak, cleanup) use the process local time.
# Node's bundled ICU resolves the zone: no tzdata package needed.
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Europe/Paris
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY --from=prod-deps --chown=appuser:appgroup /app ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder --chown=appuser:appgroup /app/packages/shared/dist packages/shared/dist
COPY --from=builder --chown=appuser:appgroup /app/apps/api/dist apps/api/dist
COPY --chown=appuser:appgroup apps/api/prisma apps/api/prisma
COPY --chown=appuser:appgroup apps/api/templates apps/api/templates

# Commit the image was built from, reported as `version` by GET /health
ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}

WORKDIR /app/apps/api
USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

# sh is PID 1 during the migration and would ignore SIGTERM: the trap lets the migration go on, then
# exits instead of starting the server. Only within the platform's draining time: Railway kills the
# container after it (default 0 s, docs/railway-setup.md), which can leave a migration half applied
CMD ["sh", "-c", "trap 'exit 143' TERM INT; npx --no prisma migrate deploy --schema=./prisma/schema.prisma && exec node dist/main.js"]
