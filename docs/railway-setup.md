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
lowercase). CI only pushes the immutable `:sha-<commit>` tag; the deploy workflow moves `:latest` /
`:staging` once the deploy is approved. GHCR packages are private by default: add registry credentials in Railway
(a GitHub token with `read:packages`) or make the packages public.

## Service Configuration

| Service   | Image      | Start command                           | Port | Health check |
| --------- | ---------- | --------------------------------------- | ---- | ------------ |
| API       | `…/api`    | _(image default — do not override)_     | 3000 | `/health`    |
| Worker    | `…/api`    | `node dist/worker.js`                   | —    | disabled     |
| Scheduler | `…/api`    | `node dist/scheduler.js`                | —    | disabled     |
| Web       | `…/web`    | _(image default)_                       | 3000 | `/health`    |
| Backup    | `…/backup` | _(image default — runs once and exits)_ | —    | —            |

Only the API runs migrations; Worker and Scheduler override the start command and skip them.
Keep the Worker restart policy on **On Failure**: when the RabbitMQ connection drops, the worker
exits with code 1 so that a fresh process re-subscribes the consumers (it does the same when a
consumer's own channel closes).
On a stop (redeploy), the Worker stops taking messages and waits up to 25 s for the ones in
progress. Give it that time: set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30` on the Worker service.
A message interrupted anyway is redelivered: an import goes through its retry queue (a job that
keeps crashing the worker ends in `import.failed`), an email is sent again unless it was already
marked as sent.
Worker and Scheduler need Redis (the same `REDIS_*` as the API) for the deploy check: they report
their commit there.
Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=60` on the API service too. Railway's default is 0: the
old container is killed right after SIGTERM, which cuts the requests in progress and, while the
API starts, can stop `prisma migrate deploy` in the middle of a migration (MySQL cannot roll back
DDL). See "A migration stopped half way" below.
Backup: set the cron schedule in the Railway dashboard (`0 2 * * *`, 02:00 UTC) — not in
config-as-code, which would also run it on every deploy.

## Environment Variables

Each process validates its own list at startup (`apps/api/src/config/env.validation.ts`): a
required variable that is missing **or empty** stops it before it listens or consumes anything.
Malformed values stop it too: `NODE_ENV` outside `development | test | staging | production`,
URLs without their protocol (`FRONTEND_URL`, `GOOGLE_REDIRECT_URI`, `SCHEDULER_API_URL`), non-email
addresses (`AWS_SES_FROM`, `FEEDBACK_RECIPIENT_EMAIL`, `STAGING_EMAIL_INTERCEPT`), non-numeric ports, or only
some of the three `GOOGLE_TTS_*` variables. All problems are listed at once. For the API and the
Web service, whose health check path is set, Railway keeps the previous deployment running; the
Worker and the Scheduler have no HTTP health check, so a failed start replaces them, and the deploy
workflow fails because they never report the new commit. Railway shared variables are the simplest way to give all three what they need.

| Process   | Module            | Required (non-empty)                                                                                                                                                                                           |
| --------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | `AppModule`       | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FEEDBACK_RECIPIENT_EMAIL` |
| Worker    | `WorkerModule`    | `DATABASE_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_FROM`                                                                                                                     |
| Scheduler | `SchedulerModule` | `SCHEDULER_API_URL`, `CRON_SECRET`                                                                                                                                                                             |

In staging and production also: `FRONTEND_URL` and `CRON_SECRET` (API), `STAGING_EMAIL_INTERCEPT` (API and Worker, staging only), and secrets (`JWT_ACCESS_SECRET`, `CRON_SECRET`) of at least 32 characters. Swagger (`/api/docs`) is only served in development.

Everything else is optional at boot (its default is declared in the validation schema), but see the notes below.
Token lifetimes, rate limits and timeouts are constants in the code, not variables.

| Variable                                                                     | Required                        | Example / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                   | set it                          | `production` or `staging` (secure cookies, `trust proxy`, staging email intercept)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `DATABASE_URL`                                                               | API, Worker                     | `mysql://user:pass@host:3306/db?connection_limit=8` — use 8 (api), 4 (worker)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `JWT_ACCESS_SECRET`                                                          | API                             | random 64 chars (`openssl rand -hex 32`); the API refuses to start in staging and production with fewer than 32. Changing it signs every user out                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `AWS_REGION`                                                                 | API, Worker                     | `eu-north-1`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `AWS_ACCESS_KEY_ID`                                                          | API, Worker                     | SES credentials                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `AWS_SECRET_ACCESS_KEY`                                                      | API, Worker                     | SES credentials                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `AWS_SES_FROM`                                                               | API, Worker                     | `no-reply@sealvo.it.com`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `FRONTEND_URL`                                                               | API (required)                  | `https://www.sealvo.it.com` — CORS origin and links in emails. The API refuses to start without it in staging and production (`http://localhost:3000` is only the development default); a trailing `/` is removed                                                                                                                                                                                                                                                                                                                                                            |
| `CRON_SECRET`                                                                | Scheduler                       | random string of at least 32 characters in staging and production (`openssl rand -hex 32`), sent by the scheduler as `X-Cron-Secret`. The API needs the same value: in staging and production it does not start without it (in development it starts and answers `503` to the scheduler). Declare it once as a **Shared Variable** and share it with the API and Scheduler services, so the two can never differ                                                                                                                                                             |
| `SCHEDULER_API_URL`                                                          | Scheduler                       | API base URL (scheduler calls `/api/reminder`). Use the private network with a **Reference Variable** to the API service: `http://${{API.RAILWAY_PRIVATE_DOMAIN}}:${{API.PORT}}` (`API` = the service name). Set `PORT=3000` on the API service yourself so that the reference resolves and both sides agree on the port. The calls then never leave Railway, and the value follows a rename. The API listens on `::`, which the private network needs                                                                                                                       |
| `FEEDBACK_RECIPIENT_EMAIL`                                                   | API                             | where feedback emails are sent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `REDIS_URL`                                                                  | recommended                     | `redis://user:pass@host:6379` (or `REDIS_HOST`/`REDIS_PORT`/`REDIS_USER`/`REDIS_PASSWORD`). Without Redis everything still starts and password reset still works (its tokens are in MySQL), but: no cache (dashboard, TTS audio); no background imports (large word imports run inside the request, no progress stream); level progress is not kept between games, so a level that needs several games never completes; rate limits are per process instead of shared between instances; the scheduler forgets its last runs and cannot catch up missed ones after a restart |
| `RABBITMQ_URL`                                                               | recommended                     | `amqp://user:pass@host:5672` (or `RABBITMQ_HOST`/`RABBITMQ_PORT`/`RABBITMQ_USER`/`RABBITMQ_PASS`). Without it the API sends emails directly and the Worker exits                                                                                                                                                                                                                                                                                                                                                                                                             |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                   | API                             | OAuth client from Google Cloud Console                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `GOOGLE_REDIRECT_URI`                                                        | API                             | `https://api.sealvo.it.com/auth/google/callback` — must be **exactly** a URI registered on the OAuth client in Google Cloud Console (scheme, host, path). The old app built it as `http://${DOMAIN}/auth/google/callback`, so the registered URI may still be that `http://` one: add the new value there before the deploy, otherwise Google login fails with `redirect_uri_mismatch`                                                                                                                                                                                       |
| `GEMINI_API_KEY`                                                             | recommended                     | API **and Worker**: enriches word examples with `**word**` markup (needed by Phrase Completion). Without it words are saved unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `GOOGLE_TTS_PROJECT_ID`, `GOOGLE_TTS_CLIENT_EMAIL`, `GOOGLE_TTS_PRIVATE_KEY` | optional                        | all three or none; TTS is disabled when none is set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `STAGING_EMAIL_INTERCEPT`                                                    | staging: API, Worker (required) | every email is redirected to this address; both refuse to start in staging without it, so staging never emails real users                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `PORT`                                                                       | API: set it (`3000`)            | injected by Railway when not set; the images default to `3000`. Set it explicitly on the API service: `SCHEDULER_API_URL` references it                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `TZ`                                                                         | —                               | `Europe/Paris`, set by the API image: Railway services inherit the image environment, so API, Worker and Scheduler run in this zone without a service variable. Do not override it: the day boundaries (spaced repetition, streak, cleanup retention) and the scheduler cron (`0 6,12,18,23 * * *`, Paris time) depend on it                                                                                                                                                                                                                                                 |
| `GIT_SHA`                                                                    | —                               | set by the images from the CI build arg; `GET /health` reports it as `version`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

The Web service has **one runtime variable**, `API_URL`: the public API URL the browser calls
(e.g. `https://${{API.RAILWAY_PUBLIC_DOMAIN}}` or the API custom domain). It is read when the
container starts, not at build time, so the same web image runs in staging and production. Without
it the site fails to load (`/env.js` and `/health` return errors) instead of calling the wrong API.

### Backup service variables

Set these on the Backup service only (never put `AWS_ENDPOINT_URL` in the shared variables:
the AWS SDK reads it globally and would redirect SES email):

| Variable                                                                                                     | Notes                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                               | `${{MySQL.MYSQL_URL}}`                                                                                                                                                                                                                                                                                                                                           |
| `AWS_S3_BUCKET_NAME`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` | S3-compatible bucket (Railway "AWS SDK Generic" naming). Railway's plain bucket names also work: `BUCKET`, `ENDPOINT`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `REGION`; the keys are always read from the same set as the bucket name. A bucket name without its endpoint and keys fails the backup. Without a bucket the dump stays in the container and is lost |
| `BACKUP_RETENTION`                                                                                           | number of dumps kept, default 7                                                                                                                                                                                                                                                                                                                                  |

Restore (manual): `npm run restore:db -w @sealvo/api` — see `apps/api/scripts/restore-db.mjs` for options.

## First deploy on the existing production database

The production schema was created by the old app, so Prisma has no migration history there.
Run this **once** before the first deploy, otherwise `prisma migrate deploy` fails with `P3005`
and the API restarts in a loop:

```bash
DATABASE_URL="<production url>" npx prisma migrate resolve --applied 001_baseline \
  --schema=apps/api/prisma/schema.prisma
```

Migrations `002` to `006` are applied automatically by the API on startup. `002` adds the
`refresh_sessions` and `password_reset_tokens` tables, `003` the `email_verification.new_email`
column, `004` the `applied_jobs` table (import idempotency), `005` the old schema's CHECK
constraints (avatar 1–11, email format, language code) on databases that lack them — a no-op on
production, which already has them. `006` makes `words.word` and `words.subject` case- and
accent-sensitive (`utf8mb4_0900_as_cs`), so "résumé" no longer reuses the "resume" row.

On staging and production, and on any other database with existing data (a restored copy), run
these first. Every row returned would make `005` or `006` fail and the API restart in a loop; the
failed `ALTER` changes nothing, so fix the rows and redeploy.

```sql
SELECT id, ava FROM users WHERE ava NOT BETWEEN 1 AND 11;
SELECT id, email FROM users WHERE email NOT REGEXP '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
SELECT word_id, language_code FROM words WHERE language_code NOT IN ('en-US', 'en-GB', 'fr-FR',
  'es-ES', 'de-DE', 'it-IT', 'ja-JP', 'zh-CN', 'zh-HK', 'zh-TW', 'pt-PT', 'ru-RU', 'vi-VN',
  'ko-KR', 'id-ID', 'hi-IN', 'pl-PL', 'nl-NL');
-- 006: words the new collation would merge (they differ only by invisible characters such as a
-- zero-width space); merge their word_details onto one word_id, then delete the others
SELECT GROUP_CONCAT(word_id) AS word_ids, MIN(word) AS word, MIN(subject) AS subject, language_code
FROM words
GROUP BY word COLLATE utf8mb4_0900_as_cs, subject COLLATE utf8mb4_0900_as_cs, language_code
HAVING COUNT(*) > 1;
```

Refresh tokens are now server-side sessions, so refresh cookies issued before this release
are rejected: **every user logs in once again** after the deploy.

The local dev database has the same history problem: see [local-dev.md](local-dev.md).

### Baseline checksum (once, on every database that recorded `001_baseline` before commit `6c513fe`)

Commit `6c513fe` edited `001_baseline/migration.sql` (table collation `utf8mb4_unicode_ci` →
`utf8mb4_general_ci`, the collation the old app's tables really have). Prisma stores the SHA-256
of each migration file in `_prisma_migrations.checksum`; on a database where the baseline was
already recorded, the stored value is the old file's (`ef971abd…`). `migrate deploy` and
`migrate status` (Prisma 5) do not compare checksums, so deploys keep working; but `migrate dev`
on that database, or on a copy of it (restored backup), reports the migration as modified and asks
to reset the database. The SQL itself never ran there (the baseline was marked applied), so only
the stored checksum must change. Run once on staging and on production:

```sql
UPDATE _prisma_migrations SET checksum = 'cb69922c3c6ad43bef3697b1f8add161aeb4c79250f6eb72afdb2a205bc3290d' WHERE migration_name = '001_baseline';
```

The value is `sha256sum apps/api/prisma/migrations/001_baseline/migration.sql`; recompute it if the
file differs from the one in this repository. Check with
`SELECT migration_name, checksum FROM _prisma_migrations WHERE migration_name = '001_baseline';`.

## GitHub Secrets (for CI/CD workflow)

| Secret                         | Description                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RAILWAY_TOKEN`                | Railway **project token** of the matching Railway environment (Project Settings → Tokens: a project token is scoped to one environment, so create one for `staging` and one for `production`)                      |
| `RAILWAY_API_SERVICE_ID`       | Service ID for API                                                                                                                                                                                                 |
| `RAILWAY_WEB_SERVICE_ID`       | Service ID for Web                                                                                                                                                                                                 |
| `RAILWAY_WORKER_SERVICE_ID`    | Service ID for Worker                                                                                                                                                                                              |
| `RAILWAY_SCHEDULER_SERVICE_ID` | Service ID for Scheduler                                                                                                                                                                                           |
| `RAILWAY_BACKUP_SERVICE_ID`    | Service ID for the Backup cron (production environment only)                                                                                                                                                       |
| `E2E_USERNAME`, `E2E_PASSWORD` | optional, E2E workflow: account created by `apps/api/prisma/seed.mjs` (see [local-dev.md](local-dev.md)). When unset, the protected-page specs are skipped, so production runs without a seeded account still pass |

Tokens and service IDs differ between staging and production: define all of them as
**environment secrets** on the `staging` and `production` GitHub environments (Settings →
Environments), not as repository secrets. The deploy fails before moving any tag when one of
them (or `API_URL`, or the environment's frontend URL) is missing: a skipped check would end green
and leave E2E testing the previous deployment.

## GitHub Variables

Define these as **environment variables** on both the `production` and `staging` GitHub
environments (Settings → Environments), so each environment gets its own values:

| Variable         | Description                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_URL`        | API base URL for the post-deploy checks: CI polls `$API_URL/health` (up to 10 min per service) until its `version` (and then `processes.worker` / `processes.scheduler`) equals the deployed commit, so a 200 from the previous deployment does not count. Required |
| `STAGING_URL`    | Staging frontend URL (staging environment only): web health check after a deploy, E2E                                                                                                                                                                               |
| `PRODUCTION_URL` | Production frontend URL (default `https://www.sealvo.it.com`): web health check after a deploy, E2E                                                                                                                                                                 |

## Deploy Order

1. **MySQL + Redis + RabbitMQ** — must be healthy first
2. **API** — runs `prisma migrate deploy` on startup → then listens on port 3000
3. **Web** — depends on API being available
4. **Worker** — connects to RabbitMQ queues
5. **Scheduler** — triggers API endpoints via HTTP

## Pipeline

`.github/workflows/ci-cd.yml`, on a push to `staging` or `main`:

1. Lint, tests, build, and the migrations check.
2. Images, tagged only `:sha-<commit>` (never overwritten): when that tag already exists, it is
   reused as is (a registry error other than "not found" fails the job instead of rebuilding). On
   `main`, a commit that is on `staging` goes on only once **E2E Staging passed for that commit**,
   whether its image exists yet or not (the build job fails otherwise: re-run it after a green
   staging run); it then runs the exact images tested on staging. A commit that is not on `staging`
   (hotfix pushed to `main`, merge commit) is built here and gated by the production approver.
   The `api` and `web` images are pushed only when the Trivy scan passes. A reused
   image is scanned again (it was scanned when built, maybe weeks ago). Two runs building the same
   commit (staging, then `main` fast-forwarded to it) take turns: the second reuses the first's
   image. `backup` is only built for `main` (staging has no backup cron). Pull requests build and
   scan all three images without pushing them.
3. `.github/workflows/deploy.yml`, once approved (see below): points `:latest` (production) or
   `:staging` at the commit's images, redeploys the services one after the other, and waits for each
   to run the commit: the API and the web app report it on `/health` (`version`); the Worker and
   the Scheduler, which have no HTTP server, write it to Redis every 15 s and the API lists it on
   `/health` (`processes.worker`, `processes.scheduler`), which must keep reporting it for 60 s (a
   heartbeat outlives a crashed process by its 45 s TTL). The Backup cron is redeployed without a
   check (it only runs at its schedule). Two deploys of one environment never interleave, and a
   commit the branch has already moved past is not deployed (a newer push follows). When a step
   fails, or the deploy is cancelled or times out, the environment tag is put back on the previous
   images, so a later redeploy does not pull the failed commit; services already redeployed keep
   running it until a Rollback.
4. On `staging`, the E2E workflow then runs against the staging URL (not after a skipped deploy).
   It checks that the web app and the API report the commit before and after the tests: a newer
   deploy during the run fails it instead of passing for the wrong commit.

Runs on `staging` and `main` do not wait for each other: every commit gets its lint/test feedback
and its images (a later rollback target) even while a deploy waits for approval.

Releasing staging to production: fast-forward `main`, so that it points at the very commit
staging built. GitHub's merge button cannot do this ("Create a merge commit", "Squash" and
"Rebase and merge" all create new commits, which get rebuilt):

```bash
git fetch origin
git checkout main
git merge --ff-only origin/staging   # fails when main has commits staging lacks: merge main into staging first
git push origin main
```

If `main` is protected by a rule requiring pull requests, allow yourself to bypass it, or the
push is rejected.

Production approval: in GitHub Settings → Environments → `production`, add **Required reviewers**.
The production deploy (and a production rollback) then waits until one of them approves it.

### Rollback

Actions → **Rollback** → run workflow, with the environment and the full SHA of an earlier deploy
of that environment (a commit of `main` for production, of `staging` for staging: the workflow
refuses a commit that was never on that branch). It runs the same deploy workflow with that commit
(one approval): its images are put back, nothing is rebuilt. Commits built before the web `/health`
endpoint or the Worker/Scheduler heartbeat existed fail that check after 10 minutes, although the
rollback itself took effect. A failed rollback leaves the tag on the rollback target (the previous
images are the release being rolled back): fix the cause and run it again.

A rollback puts the code back, **not the database**: the old images start against the schema the
newer migrations left. The workflow lists those migrations in its summary. So every migration must
stay compatible with the code of the previous release (expand/contract):

- **Expand** (safe to roll back over): add a table, a nullable column or a column with a default,
  an index; widen a type.
- **Contract** (breaks the previous code): drop or rename a column or table, add `NOT NULL` without a
  default, narrow a type. Ship it in a later release, once no deployed or rollback-target code uses
  the old shape; a rename is add, copy, switch the code, then drop.

Migrations `002` to `004` are expand. `005` adds CHECK constraints the previous code already
respected. `006` makes `word`/`subject` case- and accent-sensitive: code rolled back over it keeps
working, but treats `Run` and `run` as two words, like the current code.

### A migration stopped half way (P3009)

When the API stops during `prisma migrate deploy` (a deploy killed without draining time, a crash,
a timeout), MySQL keeps the statements already run: it cannot roll back DDL. Prisma records the
migration as failed, and every later start fails with `P3009` (the API never listens).

1. Find the migration: `npx prisma migrate status --schema=apps/api/prisma/schema.prisma` with the
   environment's `DATABASE_URL`.
2. Read its `migration.sql` and check, statement by statement, which ones ran (`SHOW CREATE TABLE`,
   `SHOW INDEX`). Undo them by hand, so the database is as before the migration.
3. Mark it rolled back: `npx prisma migrate resolve --rolled-back <name> --schema=apps/api/prisma/schema.prisma`.
4. Redeploy the API: the migration runs again from the start.

Never edit an applied migration file to get past it: Prisma compares its checksum.
