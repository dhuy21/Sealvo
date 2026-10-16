# Build context: repository root
FROM node:22-alpine AS base
WORKDIR /app
# No .git in the build context: skip the root `prepare: husky` script
ENV NEXT_TELEMETRY_DISABLED=1 \
    HUSKY=0

# ── Prune the monorepo to @sealvo/web and its workspace deps ─
FROM base AS prepare
# Keep in sync with the root package.json
ARG TURBO_VERSION=2.11.7
RUN npm install -g turbo@${TURBO_VERSION}
COPY . .
RUN turbo prune @sealvo/web --docker

# ── Build ────────────────────────────────────────────────────
FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN npm ci
COPY --from=prepare /app/out/full/ .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npx turbo build --filter=@sealvo/web

# ── Runtime (Next.js standalone output) ──────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/apps/web/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/apps/web/.next/static apps/web/.next/static
COPY --from=builder --chown=appuser:appgroup /app/apps/web/public apps/web/public

USER appuser
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
