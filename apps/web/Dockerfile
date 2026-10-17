# Build context: repository root
# Pinned by digest (Dependabot updates it): a rebuild of the same commit uses the same base
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS base
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

# Commit the image was built from (visible with `docker inspect` / in the service variables)
ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
