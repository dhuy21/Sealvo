# SealVo

Vocabulary learning in 18 languages. You keep word packages, review them with spaced
repetition and flashcards, and practice in seven games. Excel import can be enriched by
Gemini. Reminder and account mail go out through Amazon SES. Pronunciation audio comes
from Google Cloud Text-to-Speech.

Production: [www.sealvo.it.com](https://www.sealvo.it.com). The API is
[api.sealvo.it.com](https://api.sealvo.it.com).

## Architecture

Turborepo monorepo (npm workspaces). One codebase, several processes:

| Path | What it is |
| --- | --- |
| `apps/api` | NestJS API, Prisma and MySQL. The same image also runs the queue worker (`node dist/worker.js`), the scheduler (`node dist/scheduler.js`) and the database backup. |
| `apps/web` | Next.js 16 (App Router, React, CSS Modules). |
| `packages/shared` | Types, constants and the retry / circuit-breaker helpers used by the API. |
| `infra/railway-production` | Production services on Railway, written in Terraform. |
| `infra/dns` | DNS for `sealvo.it.com` on AWS Route 53, written in Terraform. |

```
browser ──► web (Next.js) ──► API (NestJS) ──► MySQL
                                 │    └──────► Redis
                                 └──► RabbitMQ ──► 3 workers ──► imports, SES
scheduler ──► POST /api/reminder (06:00, 12:00, 18:00, 23:00 Europe/Paris)
backup    ──► nightly MySQL dump ──► AWS S3
```

Redis holds cache, rate limits, job progress and TTS audio. RabbitMQ has two flows,
import and email. Each flow has a work queue, a retry queue and a dead-letter queue
(6 queues). A job row is written to MySQL (outbox) before it is published. The worker
acks the message only after it has finished. Each worker takes one message at a time
(prefetch 1). An import already stored in MySQL is not run again after a crash.

The access token stays in memory. The refresh token is an httpOnly cookie. Google
sign-in is OAuth on the API. Passwords are bcrypt. Helmet, a Redis rate limit and a
same-origin check sit on the sensitive account routes.

## Run it locally

Node 22 (`nvm use`) and Docker.

```bash
cp .env.example .env      # fill the secrets; the file comments say which
npm ci
npm run infra:up          # MySQL, Redis, RabbitMQ, API, web, worker, scheduler
```

The web is on [http://localhost:3000](http://localhost:3000). The API is on
[http://localhost:3001](http://localhost:3001). Stop a host `npm run dev` first if it
is using those ports.

`npm run infra:down` stops the stack.

## Tests

```bash
npx turbo lint test build                 # what CI runs before the image
npx turbo test:e2e --filter=@sealvo/web   # Playwright
```

Unit tests use Vitest. CI also checks that the Prisma migrations match
`apps/api/prisma/schema.prisma`.

## CI/CD

A push to `main` runs one pipeline (`.github/workflows/ci-cd.yml`):

1. Lint, Vitest, dependency-cruiser, and the production `npm audit` gate.
2. Semgrep.
3. Prisma migration check.
4. Docker build of the API, web and backup images, Trivy scan, push to GHCR (`:sha-<commit>`).
5. Deploy that image to the staging environment.
6. Playwright against staging.
7. Deploy the same image to production (`:latest`).

Staging and production are environments, not branches. Deploys wait for approval.
`rollback.yml` redeploys an earlier commit that is still on `main`.

Railway and DNS are applied from Terraform on your machine. CI does not run
`terraform apply`.
