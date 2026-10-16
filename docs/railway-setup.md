# Railway Setup Guide — Sealvo Monorepo

## Architecture

```
Railway Project
├── API service        (apps/api/Dockerfile, CMD: prisma migrate + node dist/main.js)
├── Web service        (apps/web/Dockerfile, CMD: node apps/web/server.js)
├── Worker service     (apps/api/Dockerfile, CMD: node dist/worker.js)
├── Scheduler service  (apps/api/Dockerfile, CMD: node dist/scheduler.js)
├── MySQL (plugin)
├── Redis (plugin)
└── RabbitMQ (plugin or external)
```

## Service Configuration

### 1. API Service

- **Source:** Root of repo
- **Dockerfile:** `apps/api/Dockerfile`
- **Start Command:** _(use Dockerfile CMD — do not override)_
- **Port:** 3000
- **Health Check:** `/health`
- **Watch Paths:** `apps/api/**`, `packages/shared/**`

### 2. Web Service

- **Source:** Root of repo
- **Dockerfile:** `apps/web/Dockerfile`
- **Start Command:** `node apps/web/server.js`
- **Port:** 3000
- **Health Check:** `/`
- **Watch Paths:** `apps/web/**`, `packages/shared/**`

### 3. Worker Service

- **Source:** Root of repo
- **Dockerfile:** `apps/api/Dockerfile`
- **Start Command (override):** `node dist/worker.js`
- **Port:** _(none — no HTTP)_
- **Health Check:** _(disable)_
- **Watch Paths:** `apps/api/**`, `packages/shared/**`

### 4. Scheduler Service

- **Source:** Root of repo
- **Dockerfile:** `apps/api/Dockerfile`
- **Start Command (override):** `node dist/scheduler.js`
- **Port:** _(none — no HTTP)_
- **Health Check:** _(disable)_
- **Watch Paths:** `apps/api/**`, `packages/shared/**`

## Environment Variables

The API, Worker and Scheduler all boot the same `AppModule`, so they need the **same variables**
(use Railway shared variables). A missing "required" variable stops the process at startup.

| Variable | Required | Example / notes |
|---|---|---|
| `NODE_ENV` | yes | `production` or `staging` (secure cookies, `trust proxy`, staging email intercept) |
| `DATABASE_URL` | yes | `mysql://user:pass@host:3306/db?connection_limit=8` — use 8 (api), 4 (worker), 2 (scheduler) |
| `JWT_ACCESS_SECRET` | yes | random 64 chars |
| `JWT_REFRESH_SECRET` | yes | random 64 chars, different from the access secret |
| `AWS_REGION` | yes | `eu-north-1` |
| `AWS_ACCESS_KEY_ID` | yes | SES credentials |
| `AWS_SECRET_ACCESS_KEY` | yes | SES credentials |
| `AWS_SES_FROM` | yes | `no-reply@sealvo.it.com` |
| `FRONTEND_URL` | yes | `https://www.sealvo.it.com` — CORS origin and links in emails |
| `CRON_SECRET` | yes | random string, sent by the scheduler as `X-Cron-Secret` |
| `SCHEDULER_API_URL` | scheduler | API base URL, e.g. `https://api.sealvo.it.com` (scheduler calls `/api/reminder`) |
| `FEEDBACK_RECIPIENT_EMAIL` | for `/feedback` | where feedback emails are sent |
| `REDIS_URL` | recommended | `redis://user:pass@host:6379` (or `REDIS_HOST`/`REDIS_PORT`/`REDIS_USER`/`REDIS_PASSWORD`). Without Redis: no cache, password reset is unavailable |
| `RABBITMQ_URL` | recommended | `amqp://user:pass@host:5672` (or `RABBITMQ_HOST`/`RABBITMQ_PORT`/`RABBITMQ_USER`/`RABBITMQ_PASS`). Without it the API sends emails directly and the Worker exits |
| `GOOGLE_TTS_PROJECT_ID`, `GOOGLE_TTS_CLIENT_EMAIL`, `GOOGLE_TTS_PRIVATE_KEY` | optional | TTS is disabled when missing |
| `STAGING_EMAIL_INTERCEPT` | staging | every email is redirected to this address |
| `PORT` | — | injected by Railway; the images default to `3000` |

The Web service has **no runtime variables**: `NEXT_PUBLIC_API_URL` is baked in at build time
(GitHub environment variable → Docker build arg).

## First deploy on the existing production database

The production schema was created by the old app, so Prisma has no migration history there.
Run this **once** before the first deploy, otherwise `prisma migrate deploy` fails with `P3005`
and the API restarts in a loop:

```bash
DATABASE_URL="<production url>" npx prisma migrate resolve --applied 001_baseline \
  --schema=apps/api/prisma/schema.prisma
```

## GitHub Secrets (for CI/CD workflow)

| Secret | Description |
|---|---|
| `RAILWAY_TOKEN` | Railway API token |
| `RAILWAY_API_SERVICE_ID` | Service ID for API |
| `RAILWAY_WEB_SERVICE_ID` | Service ID for Web |
| `RAILWAY_WORKER_SERVICE_ID` | Service ID for Worker |
| `RAILWAY_SCHEDULER_SERVICE_ID` | Service ID for Scheduler |

## GitHub Variables

Define these as **environment variables** on both the `production` and `staging` GitHub
environments (Settings → Environments), so each environment gets its own values:

| Variable | Description |
|---|---|
| `API_URL` | API base URL, used for the post-deploy health check (`$API_URL/health`) |
| `NEXT_PUBLIC_API_URL` | API URL baked into the Next.js build |
| `STAGING_URL` | Staging frontend URL (staging environment only) |
| `PRODUCTION_URL` | Production frontend URL, used by the manual E2E workflow |

## Deploy Order

1. **MySQL + Redis + RabbitMQ** — must be healthy first
2. **API** — runs `prisma migrate deploy` on startup → then listens on port 3000
3. **Web** — depends on API being available
4. **Worker** — connects to RabbitMQ queues
5. **Scheduler** — triggers API endpoints via HTTP
