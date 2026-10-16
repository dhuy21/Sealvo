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
- **Start Command:** _(use Dockerfile CMD — runs prisma migrate then main.js)_
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

All 4 services need these variables (shared via Railway shared variables or per-service):

| Variable | Example | Services |
|---|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/db` | api, worker, scheduler |
| `REDIS_URL` | `redis://host:6379` | api, worker, scheduler |
| `RABBITMQ_URL` | `amqp://user:pass@host:5672` | api, worker, scheduler |
| `JWT_SECRET` | random 64 chars | api |
| `JWT_REFRESH_SECRET` | random 64 chars | api |
| `SESSION_SECRET` | random 64 chars | api |
| `FRONTEND_URL` | `https://www.sealvo.it.com` | api |
| `NEXT_PUBLIC_API_URL` | `https://api.sealvo.it.com` | web |
| `AWS_ACCESS_KEY_ID` | ... | api, worker |
| `AWS_SECRET_ACCESS_KEY` | ... | api, worker |
| `AWS_REGION` | `eu-west-3` | api, worker |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | JSON string | api |
| `GEMINI_API_KEY` | ... | api |
| `USER_GMAIL` | email address | api |
| `CRON_SECRET` | random string | api, scheduler |
| `SCHEDULER_API_URL` | `https://api.sealvo.it.com` | scheduler |
| `NODE_ENV` | `production` | all |

## GitHub Secrets (for CI/CD workflow)

| Secret | Description |
|---|---|
| `RAILWAY_TOKEN` | Railway API token |
| `RAILWAY_API_SERVICE_ID` | Service ID for API |
| `RAILWAY_WEB_SERVICE_ID` | Service ID for Web |
| `RAILWAY_WORKER_SERVICE_ID` | Service ID for Worker |
| `RAILWAY_SCHEDULER_SERVICE_ID` | Service ID for Scheduler |

## GitHub Variables

| Variable | Description |
|---|---|
| `API_URL` | Production API URL (e.g. `https://api.sealvo.it.com`) |
| `STAGING_URL` | Staging URL |

## Deploy Order

1. **MySQL + Redis + RabbitMQ** — must be healthy first
2. **API** — runs `prisma migrate deploy` on startup → then listens on port 3000
3. **Web** — depends on API being available
4. **Worker** — connects to RabbitMQ queues
5. **Scheduler** — triggers API endpoints via HTTP
