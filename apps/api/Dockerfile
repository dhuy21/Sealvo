# ── Stage 1: Install all dependencies ────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

# ── Stage 2: Build ───────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY package.json turbo.json ./
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/
RUN npx turbo build --filter=@sealvo/api
# Generate Prisma client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# ── Stage 3: Production dependencies only ────────────────────
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev
# Re-generate Prisma client in prod node_modules
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# ── Stage 4: Production runner ───────────────────────────────
FROM node:22-alpine AS runner

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app/apps/api

# Production node_modules
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./node_modules
COPY --from=prod-deps /app/packages/shared/node_modules /app/packages/shared/node_modules 2>/dev/null || true

# Built output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist

# Prisma CLI (devDependency, needed for migrate deploy at startup)
COPY --from=deps /app/node_modules/prisma /app/node_modules/prisma
COPY --from=deps /app/node_modules/.bin/prisma /app/node_modules/.bin/prisma

# Package files for module resolution
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/package.json

# Prisma schema + migrations (for prisma migrate deploy)
COPY apps/api/prisma ./prisma

# Email templates (resolved from ../../src/app/views/mails/)
COPY src/app/views/mails /app/src/app/views/mails

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "import('http').then(h=>h.default.get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1)))"

ENV NODE_ENV=production

# Default: API process. Override CMD for worker/scheduler:
#   worker:    CMD ["node", "dist/worker.js"]
#   scheduler: CMD ["node", "dist/scheduler.js"]
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && exec node dist/main.js"]
