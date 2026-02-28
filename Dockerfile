# ============================================================
# Stage 1: install dependencies (production only)
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files first for better layer cache
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ============================================================
# Stage 2: runner image (slim, no dev deps, non-root)
# ============================================================
FROM node:20-alpine AS runner

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup \
  && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Copy application source (excluding dev artifacts via .dockerignore)
COPY . .

# Ensure app can write to uploads if needed (optional, appuser will own)
RUN mkdir -p app/uploads && chown -R appuser:appgroup /app

USER appuser

# App listens on process.env.PORT (mặc định 3000).
# Cổng host được map linh hoạt qua docker-compose (APP_HOST_PORT).
EXPOSE 3000

# Healthcheck uses PORT from runtime env (default 3000)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const p=process.env.APP_PORT||3000;require('http').get('http://127.0.0.1:'+p+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENV NODE_ENV=production
CMD ["node", "app.js"]
