# SealVo

Vocabulary learning in 18 languages: personal word packages, flashcards scheduled by spaced
repetition, seven mini-games (pronunciation practice included, with Google Text-to-Speech and the
browser's speech recognition), Excel import with AI enrichment (Gemini), and reminder emails.

## Architecture

A Turborepo monorepo (npm workspaces):

| Path | What it is |
|---|---|
| `apps/api` | NestJS API, Prisma (MySQL), Redis (cache, rate limits, job progress), RabbitMQ (email and import queues). The same image runs three processes: the API (`dist/main.js`), the queue worker (`dist/worker.js`) and the scheduler (`dist/scheduler.js`, reminders at 6:00, 12:00, 18:00 and 23:00). |
| `apps/web` | Next.js 16 front end (App Router). Runtime configuration through `/env.js`, security headers and a per-request CSP nonce in `src/proxy.ts`. |
| `packages/shared` | Types, constants and resilience helpers shared by both apps. |
| `src/` | The previous Express application, kept read-only as the reference for behaviour and visuals. |

```
browser ──► web (Next.js) ──► API (NestJS) ──► MySQL
                                 │    └──────► Redis
                                 └──► RabbitMQ ──► worker ──► SES email, imports
scheduler ──► POST /api/reminder (4 times a day)
```

## Run it locally

Node 22 (`nvm use`) and Docker:

```bash
cp .env.example .env      # fill the secrets, see the comments in the file
npm ci
npm run infra:up          # MySQL, Redis, RabbitMQ
npm run db:migrate
npm run dev               # API :3001, web :3000
```

Details (existing databases, E2E account, production images on your machine):
[docs/local-dev.md](docs/local-dev.md).

## Tests

```bash
npx turbo lint test build                 # what CI runs
npx turbo test:e2e --filter=@sealvo/web   # Playwright, see docs/local-dev.md
```

API and web unit tests use Vitest. CI also checks that the Prisma migrations match
`apps/api/prisma/schema.prisma`.

## Deployment

GitHub Actions (`.github/workflows/ci-cd.yml`) builds immutable `:sha-<commit>` images on GHCR;
`deploy.yml` moves the `:staging` / `:latest` tag after approval and redeploys the Railway
services, `rollback.yml` redeploys an earlier commit. Service setup, environment variables and
the first deploy on the existing database: [docs/railway-setup.md](docs/railway-setup.md).

## Reference

- [BUSINESS_RULES.md](BUSINESS_RULES.md): the product rules (spaced repetition, games, limits).
- [MIGRATION_AUDIT.md](MIGRATION_AUDIT.md): the migration from the old app and the audit log.
- `docs/legacy/`: notes written for the previous application, kept for history.
