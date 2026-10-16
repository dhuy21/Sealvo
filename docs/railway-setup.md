# Railway Setup Guide — Sealvo Monorepo

## Architecture

CI builds the images and pushes them to GHCR; every Railway service uses a **Docker image
source** (not the GitHub repo), and CI triggers `railway redeploy` so the service pulls the new tag.

```
Railway Project
├── API        ghcr.io/<owner>/<repo>/api     (default CMD: prisma migrate deploy + dist/main.js)
├── Worker     ghcr.io/<owner>/<repo>/api     (start command: node dist/worker.js)
├── Scheduler  ghcr.io/<owner>/<repo>/api     (start command: node dist/scheduler.js)
├── Web        ghcr.io/<owner>/<repo>/web     (default CMD: node apps/web/server.js)
├── Backup     ghcr.io/<owner>/<repo>/backup  (cron, production only)
├── MySQL
├── Redis
└── RabbitMQ
```

Tags: `:latest` for production services, `:staging` for staging services (`<owner>/<repo>` is
lowercase). GHCR packages are private by default: add registry credentials in Railway
(a GitHub token with `read:packages`) or make the packages public.

## Service Configuration

| Service | Image | Start command | Port | Health check |
|---|---|---|---|---|
| API | `…/api` | _(image default — do not override)_ | 3000 | `/health` |
| Worker | `…/api` | `node dist/worker.js` | — | disabled |
| Scheduler | `…/api` | `node dist/scheduler.js` | — | disabled |
| Web | `…/web` | _(image default)_ | 3000 | `/` |
| Backup | `…/backup` | _(image default — runs once and exits)_ | — | — |

Only the API runs migrations; Worker and Scheduler override the start command and skip them.
Keep the Worker restart policy on **On Failure**: when the RabbitMQ connection drops, the worker
exits with code 1 so that a fresh process re-subscribes the consumers.
Backup: set the cron schedule in the Railway dashboard (`0 2 * * *`, 02:00 UTC) — not in
config-as-code, which would also run it on every deploy.

## Environment Variables

The API, Worker and Scheduler all boot the same `AppModule`, so they need the **same variables**
(use Railway shared variables). A missing "required" variable stops the process at startup.

| Variable | Required | Example / notes |
|---|---|---|
| `NODE_ENV` | yes | `production` or `staging` (secure cookies, `trust proxy`, staging email intercept) |
| `DATABASE_URL` | yes | `mysql://user:pass@host:3306/db?connection_limit=8` — use 8 (api), 4 (worker), 2 (scheduler) |
| `JWT_ACCESS_SECRET` | yes | random 64 chars |
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
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google login | OAuth client from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | for Google login | `https://api.sealvo.it.com/auth/google/callback` — must match the URI registered in Google Cloud exactly |
| `GEMINI_API_KEY` | recommended | API **and Worker**: enriches word examples with `**word**` markup (needed by Phrase Completion). Without it words are saved unchanged. Optional tuning: `GEMINI_MODIFY_TIMEOUT_MS`, `GEMINI_GENERATE_TIMEOUT_MS`, `GEMINI_RETRIES`, `GEMINI_RETRY_DELAY_MS`, `GEMINI_BREAKER_THRESHOLD`, `GEMINI_BREAKER_RESET_MS` |
| `GOOGLE_TTS_PROJECT_ID`, `GOOGLE_TTS_CLIENT_EMAIL`, `GOOGLE_TTS_PRIVATE_KEY` | optional | TTS is disabled when missing |
| `STAGING_EMAIL_INTERCEPT` | staging | every email is redirected to this address |
| `PORT` | — | injected by Railway; the images default to `3000` |
| `TZ` | — | `Europe/Paris`, set by the API image: Railway services inherit the image environment, so API, Worker and Scheduler run in this zone without a service variable. Do not override it: the day boundaries (spaced repetition, streak, cleanup retention) and the scheduler cron (`0 6,12,18,23 * * *`, Paris time) depend on it |
| `GIT_SHA` | — | set by the images from the CI build arg; `GET /health` reports it as `version` |

The Web service has **no runtime variables**: `NEXT_PUBLIC_API_URL` is baked in at build time
(GitHub environment variable → Docker build arg).

### Backup service variables

Set these on the Backup service only (never put `AWS_ENDPOINT_URL` in the shared variables:
the AWS SDK reads it globally and would redirect SES email):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` |
| `AWS_S3_BUCKET_NAME`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` | S3-compatible bucket (Railway "AWS SDK Generic" naming; the old `BUCKET_*` names also work). Without a bucket the dump stays in the container and is lost |
| `BACKUP_RETENTION` | number of dumps kept, default 7 |

Restore (manual): `npm run restore:db -w @sealvo/api` — see `apps/api/scripts/restore-db.mjs` for options.

## First deploy on the existing production database

The production schema was created by the old app, so Prisma has no migration history there.
Run this **once** before the first deploy, otherwise `prisma migrate deploy` fails with `P3005`
and the API restarts in a loop:

```bash
DATABASE_URL="<production url>" npx prisma migrate resolve --applied 001_baseline \
  --schema=apps/api/prisma/schema.prisma
```

Migrations `002` and `003` (applied automatically by the API on startup) are additive: `002` adds
the `refresh_sessions` and `password_reset_tokens` tables, `003` the `email_verification.new_email`
column. Refresh tokens are now server-side sessions, so refresh cookies issued before this release
are rejected: **every user logs in once again** after the deploy.

The local dev database has the same history problem: see [local-dev.md](local-dev.md).

## GitHub Secrets (for CI/CD workflow)

| Secret | Description |
|---|---|
| `RAILWAY_TOKEN` | Railway **project token** of the matching Railway environment (Project Settings → Tokens: a project token is scoped to one environment, so create one for `staging` and one for `production`) |
| `RAILWAY_API_SERVICE_ID` | Service ID for API |
| `RAILWAY_WEB_SERVICE_ID` | Service ID for Web |
| `RAILWAY_WORKER_SERVICE_ID` | Service ID for Worker |
| `RAILWAY_SCHEDULER_SERVICE_ID` | Service ID for Scheduler |
| `RAILWAY_BACKUP_SERVICE_ID` | Service ID for the Backup cron (production environment only) |
| `E2E_USERNAME`, `E2E_PASSWORD` | optional, E2E workflow: account created by `apps/api/prisma/seed.mjs` (see [local-dev.md](local-dev.md)). When unset, the protected-page specs are skipped, so production runs without a seeded account still pass |

Tokens and service IDs differ between staging and production: define all of them as
**environment secrets** on the `staging` and `production` GitHub environments (Settings →
Environments), not as repository secrets. Without `RAILWAY_TOKEN` the deploy steps and the
health check are skipped.

## GitHub Variables

Define these as **environment variables** on both the `production` and `staging` GitHub
environments (Settings → Environments), so each environment gets its own values:

| Variable | Description |
|---|---|
| `API_URL` | API base URL for the post-deploy health check: CI polls `$API_URL/health` (up to 10 min) until its `version` equals the deployed commit, so a 200 from the previous deployment does not count. Skipped when unset |
| `NEXT_PUBLIC_API_URL` | API URL baked into the Next.js build (the web image build fails when it is empty) |
| `STAGING_URL` | Staging frontend URL (staging environment only) |
| `PRODUCTION_URL` | Production frontend URL, used by the manual E2E workflow |

## Deploy Order

1. **MySQL + Redis + RabbitMQ** — must be healthy first
2. **API** — runs `prisma migrate deploy` on startup → then listens on port 3000
3. **Web** — depends on API being available
4. **Worker** — connects to RabbitMQ queues
5. **Scheduler** — triggers API endpoints via HTTP
