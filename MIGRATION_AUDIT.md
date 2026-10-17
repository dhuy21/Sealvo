# Sealvo Migration Audit — Express → NestJS + Next.js

> **16 rounds | 105 issues | 220+ files | Complete codebase analysis**
> Generated: Oct 12, 2026

---

## Table of Contents

1. [Migration Overview](#1-migration-overview)
2. [Architecture Target](#2-architecture-target)
3. [All 105 Issues](#3-all-105-issues)
4. [Prisma Schema](#4-prisma-schema)
5. [Module Dependency Graph](#5-module-dependency-graph)
6. [API Endpoints Mapping](#6-api-endpoints-mapping)
7. [Security Checklist](#7-security-checklist)
8. [Frontend Decomposition](#8-frontend-decomposition)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Phase 0 Plan](#10-phase-0-plan) ✅ DONE
11. [Phase 1 Plan — Database + Health](#11-phase-1-plan--database--health) ✅ DONE
12. [Phase 2 Plan — Auth + Core Guards](#12-phase-2-plan--auth--core-guards) ✅ DONE
13. [Phase 3 Plan — Business Modules](#13-phase-3-plan--business-modules) ✅ DONE
14. [Phase 4 Plan — Workers + Queues](#14-phase-4-plan--workers--queues)
15. [Phase 5 Plan — Frontend Migration](#15-phase-5-plan--frontend-migration)
16. [Phase 6 Plan — CI/CD + Deploy](#16-phase-6-plan--cicd--deploy)
17. [Migration Progress Tracker](#17-migration-progress-tracker)

---

## 1. Migration Overview

### Current Stack

- **Backend**: Express.js 5, Handlebars SSR, mysql2/promise
- **Frontend**: Vanilla JS (22 files, ~11 200 lines in `src/public/js`), CSS (20 files)
- **DB**: MySQL 8.0 (raw SQL)
- **Cache/Session**: Redis 7 (connect-redis, custom cache module)
- **Queue**: RabbitMQ (amqplib, NOT BullMQ)
- **AI**: Google Gemini (2.5-flash + 2.5-flash-lite)
- **TTS**: Google Cloud Text-to-Speech (Wavenet)
- **Email**: AWS SES via nodemailer
- **Auth**: Session-based (express-session + bcryptjs)
- **Deploy**: Railway (3 services: web, worker, scheduler)

### Target Stack

- **Backend**: NestJS 12 (TypeScript)
- **Frontend**: Next.js 16 App Router + React 19 TypeScript
- **DB**: MySQL 8.0 via Prisma ORM
- **Cache**: Redis (same; `redis` client, custom `RedisService` + `CacheService`)
- **Queue**: RabbitMQ (amqplib direct, NOT @nestjs/microservices transport)
- **Auth**: JWT (access token in memory + refresh token in httpOnly cookie)
- **CSS**: Tailwind CSS + CSS Modules + CSS variables
- **Docs**: OpenAPI 3.0 via @nestjs/swagger (Swagger UI at /api/docs)
- **Monorepo**: Turborepo (apps/api, apps/web, packages/shared)

### Key Decisions

- ✅ Keep RabbitMQ (do NOT replace with BullMQ)
- ✅ Keep 3-process architecture (api, worker, scheduler)
- ✅ Keep level progress in Redis (3 h TTL kept: product decision, #24)
- ✅ Shared NestJS codebase for api/worker/scheduler (separate entry points, same Docker image)
- ✅ Session → JWT with rotation (access 15min, refresh 7d)
- ✅ CSRF removed (JWT-based auth doesn't need it)
- ✅ Prisma introspect → baseline → migrate strategy
- ✅ OpenAPI/Swagger for API documentation + contract

### Migration Principles

1. **NO DELETE Old Code** — Không được xóa bất kỳ code cũ nào (src/) cho đến khi toàn bộ migration hoàn tất và verified. Code cũ là source of truth để tham khảo, đảm bảo migration không lạc hướng.
   - Nếu code cũ và code mới nằm cùng file → **comment out** code cũ, KHÔNG xóa, để đó làm reference.
   - Chỉ xóa src/ sau khi Phase 6 hoàn tất + production verified.

2. **Strangler Fig Pattern** — Build hệ thống mới song song, feature-by-feature. App cũ vẫn tồn tại trong repo.

3. **Database First, UI Last** — Prisma schema ổn định trước → API contracts fixed → Frontend cuối cùng.

4. **Contract-Driven Development** — Backend/Frontend giao tiếp qua typed API contracts (DTOs trong packages/shared) + OpenAPI/Swagger documentation.

5. **Zero Data Loss** — KHÔNG thay đổi DB schema destructively. Backup trước mỗi migration.

6. **Verify Before Moving On** — Mỗi phase có acceptance criteria. KHÔNG bắt đầu phase N+1 nếu phase N chưa pass ALL criteria.

7. **OpenAPI/Swagger** — Mọi endpoint phải có Swagger decorator (@ApiTags, @ApiOperation, @ApiResponse, @ApiBody, @ApiBearerAuth). Swagger UI chạy ở /api/docs trong development. API contract là hợp đồng chính thức giữa backend ↔ frontend.

8. **GitFlow** — Tuân thủ GitFlow branching model:
   - `main` — production-ready code only
   - `staging` — pre-production, test trước khi lên main
   - `develop` — integration branch cho development
   - `feature/*` — mỗi phase/feature một branch từ develop
   - `release/*` — chuẩn bị release (merge vào staging → test → merge vào main)
   - `hotfix/*` — fix production bugs
   - Flow: feature/* → develop → release/* → staging → main
   - Migration bắt đầu trên `feature/phase-0-monorepo-init` từ develop
   - Mỗi phase hoàn tất → merge vào develop qua PR
   - KHÔNG push trực tiếp vào main, staging, hay develop

---

## 2. Architecture Target

### Monorepo Structure

```
sealvo/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts         # HTTP server entry
│   │   │   ├── worker.ts       # RabbitMQ consumer entry
│   │   │   ├── scheduler.ts    # Cron scheduler entry
│   │   │   ├── app.module.ts
│   │   │   ├── worker.module.ts, scheduler.module.ts  # modules booted by worker / scheduler
│   │   │   ├── config/         # env.validation.ts (one schema per process) + one registerAs factory per domain
│   │   │   ├── auth/           # AuthModule (JWT, refresh sessions, Google OAuth, email verification and change, guards)
│   │   │   ├── account/        # AccountModule (PATCH /account/profile)
│   │   │   ├── packages/       # PackagesModule
│   │   │   ├── words/          # WordsModule (controller) + WordsCoreModule (WordsService, WordsEnrichmentService); orphan-details.ts
│   │   │   ├── learning/       # LearningModule
│   │   │   ├── games/          # GamesModule (single GamesService + GAME_LEVEL map)
│   │   │   ├── dashboard/      # DashboardModule (stats only)
│   │   │   ├── reminder/       # ReminderModule
│   │   │   ├── maintenance/    # MaintenanceModule (expired-row cleanup, run with the reminders)
│   │   │   ├── scheduler/      # SchedulerService (catch-up + cron, booted by scheduler.ts), daily-schedule.ts
│   │   │   ├── tts/            # TtsModule
│   │   │   ├── gemini/         # GeminiModule
│   │   │   ├── feedback/       # FeedbackModule
│   │   │   ├── email/          # EmailModule (queue + SES)
│   │   │   ├── import/         # ImportModule (queue + Excel parsing + jobs)
│   │   │   ├── health/         # HealthModule (/health + /health/deps, custom checks, no terminus)
│   │   │   ├── prisma/ redis/ rabbitmq/  # global PrismaModule (+ tx-options.constants.ts, deadlock.ts), RedisModule (every key in cache-keys.constants.ts), RabbitmqModule (+ retry-queue.ts)
│   │   │   └── common/         # PrismaExceptionFilter, RedisThrottlerStorage + throttle-policies.ts (@Throttled), InvalidateDashboardInterceptor, @ThrottleMessage, @NormalizeEmail, @IsAccountEmail, @Trim, @IsOptionalDefined, constants/field-lengths.constants.ts, domain/spaced-repetition.ts, utils/ (error-message, format-duration, normalize-email) (guards: auth/guards)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.mjs        # E2E account (manual: npm run db:seed)
│   │   ├── scripts/            # backup-db.mjs, restore-db.mjs
│   │   ├── templates/          # Email Handlebars templates
│   │   ├── Dockerfile
│   │   └── vitest.config.ts
│   │
│   └── web/                    # Next.js 16 frontend
│       ├── src/
│       │   ├── app/            # App Router pages ((auth), (protected) route groups)
│       │   ├── components/     # React components (92 .tsx + 63 .ts hooks/helpers, tests excluded)
│       │   ├── hooks/          # React Query hooks (auth, packages, words, games, import, feedback, …)
│       │   ├── lib/            # API client, query keys, job watcher, cx(), utils
│       │   ├── providers/ stores/  # app providers, Zustand auth store
│       │   └── styles/         # CSS Modules (*.module.css) + global main/header/footer/dark-mode
│       ├── Dockerfile
│       └── playwright.config.ts
│
├── packages/
│   └── shared/                 # Shared types, constants, utils
│       ├── src/
│       │   ├── types/          # DTOs, enums, interfaces
│       │   ├── constants/      # VALID_LANGS, LEVELS, WORD_TYPES, GAME_LEVEL, LEVEL_GAMES, PACKAGE_MODES, AUTH_LIMITS, AVATAR_COUNT, level/type helpers
│       │   └── resilience/     # CircuitBreaker, retry, timeout
│       └── package.json
│
├── docker-compose.dev.yml      # MySQL + Redis + RabbitMQ for turbo dev
├── docker-compose.prod.yml     # 7 services + backup profile
├── BUSINESS_RULES.md
├── turbo.json
├── package.json
└── MIGRATION_AUDIT.md          # This file
```

### NestJS Execution Order

What `main.ts` / `app.module.ts` actually register (Express middleware → NestJS lifecycle, #64):

```
Request → Express: trust proxy (production/staging), helmet (default headers), CORS (FRONTEND_URL,
                 credentials), cookie-parser, JSON body parser (100 KB; 6 MB on
                 POST /packages/:packageId/words only)
       → Guards: ThrottlerGuard (global APP_GUARD, Redis storage, in-memory fallback; 429 message
                 per route from @ThrottleMessage)
                 → SameOriginGuard (login, register, refresh, logout)
                 → JwtAuthGuard (controller or route)
                 → PackageOwnershipGuard | PackageReadGuard | CronSecretGuard (route)
       → Interceptors (before): InvalidateDashboardInterceptor (packages, words, learning, import),
                 FileInterceptor (multer memory storage, import only)
       → Pipes: global ValidationPipe (whitelist, forbidNonWhitelisted, transform)
                 + ParseIntPipe / ParseArrayPipe / ParseGameTypePipe on parameters
       → Controller method
       → Interceptors (after): InvalidateDashboardInterceptor deletes the owner's cached dashboard
                 after a successful non-GET request
       → Exception filters: PrismaExceptionFilter (global: P2002 / P2003 → 409, P2025 → 404, P2000 → 400,
                 deadlock (P2034, or P2010 with MySQL 1213) → 409 "Ces données sont modifiées par une
                 autre opération, réessayez.",
                 CHECK violation and PrismaClientValidationError → 400 "Données invalides."), then Nest's built-in filter
```

Not registered: compression, morgan, a roles guard (`RolesGuard` / `@Roles` removed: no route needs a
role; the package guards are owner-only, no Admin bypass), SanitizationPipe (#29) and
TransformInterceptor (#68).

### Worker Architecture

```
Same Docker image, different CMD:
  api:       CMD ["sh", "-c", "trap 'exit 143' TERM INT; npx --no prisma migrate deploy --schema=./prisma/schema.prisma && exec node dist/main.js"]
  worker:    command ["node", "dist/worker.js"]     (boots WorkerModule)
  scheduler: command ["node", "dist/scheduler.js"]  (boots SchedulerModule)
```

---

## 3. All 105 Issues

### Status summary (Oct 17, 2026)

Verified against the code on `fix/full-project-audit` (not merged into `develop` yet): **92 ✅ Done · 0 🟡 Partial · 0 🔲 Open · 13 ➖ N/A** (N/A = made obsolete by a design or product decision, or "chosen: …" another tool). Last item closed:

- **#19** CSP `script-src 'self' 'nonce-…' 'strict-dynamic'`: `apps/web/src/proxy.ts` generates a nonce per request and builds the policy at runtime (its `connect-src` takes the runtime `API_URL`); Next.js adds the nonce to its scripts, the root layout passes it to `/env.js` and to the next-themes script. Every page therefore renders per request (root layout `instant = false` + `headers()`, no static shell). `style-src` keeps `'unsafe-inline'`: React `style` attributes cannot carry a nonce.

E2E: runs automatically against staging after each staging deploy (`ci-cd.yml` → `e2e.yml` via `workflow_call`), and on demand (`workflow_dispatch`).

Status changes on Oct 17: #11 ➖ → ✅ (page CSS moved to CSS Modules), #79 ✅ → ➖ (old question generation kept).

### Changes Oct 17, 2026

- 429 messages per route, in French: `@ThrottleMessage` (`common/decorators/throttle-message.decorator.ts`), read by the throttler `errorMessage` in `app.module.ts`; default "Trop de requêtes. Réessayez dans 1 minute."
- `helmet()` (default options) on the API in `main.ts`.
- Level progress: Redis hash `cache:lvlprog:h:<userId>` (`CACHE_KEYS.levelProgress`, `cache:` added by `CacheService`), one field per game (`HSET` + `EXPIRE` 3 h); only the request whose `HDEL` removes every field of the level promotes. Streak: conditional `updateMany` (`streak_updated_at` null or before today), so concurrent requests count once (`learning/learning.service.ts`).
- `AuthService` split: `TokenService` (access JWT + new session), `EmailVerificationService`, `PasswordResetService`, `GoogleAuthService`, `create-user.ts` (id retry, #48), and since the fourth pass `EmailChangeService`; `AuthService` keeps register / login / refresh / logout / me.
- Email: every SES send wrapped in `withTimeout` (10 s) inside `withRetry` (transient errors only); the direct fallback when RabbitMQ is down retries 2 times, 1 s apart (`email.service.ts`, `email-queue.service.ts`), like the old `mailersend.js`.
- `docker-compose.prod.yml`: shared `x-api-image` anchor (`build` + `image: sealvo-api`) for api, worker and scheduler: worker/scheduler had only `image`, so Compose tried to pull `sealvo-api` and failed. `NODE_ENV: production` forced in the shared environment (api, worker, scheduler, backup), over the `.env` value.
- CI: Trivy lists fixable CRITICAL + HIGH, then fails the job (and so the deploy) on fixable CRITICAL only (`--ignore-unfixed`).
- User-facing API messages use the old app's French texts (some old English texts kept as in the old app, e.g. `Job not found.`).
- Migrations: `001_baseline` uses `utf8mb4_general_ci` like the real DB (with `unicode_ci` a fresh `migrate deploy` failed with MySQL error 3780 on the foreign keys). New `004_applied_jobs`. New `005_check_constraints`: the old schema's CHECKs (avatar 1–11, email format, language code), added only where no CHECK covers the column (no-op on production); a violation (MySQL 3819, Prisma `P2010` for raw queries or an unknown request error for model queries) maps to 400 "Données invalides.".
- Import idempotency: `WordsService.addWords(..., { jobId })` inserts an `applied_jobs` row first, in the same transaction as the words; a redelivered RabbitMQ job hits the primary key, saves nothing, is completed with the full count and acked (`words/words.service.ts`, `import/import-queue.service.ts`). Markers older than 7 days are deleted by the cleanup run with the reminders (`maintenance/maintenance.service.ts`). A marker found before the Gemini enrichment skips it too.
- Import progress is written every `max(1, floor(total / 20))` words instead of every word.
- Level progress: with Redis up, the current game only counts once its `HSET` succeeded (a failed write no longer lets the `HDEL` wipe the saved games without promoting).
- Email: a send that times out is not retried (it may still be delivered) and counts as sent; other transient errors are retried as before.
- Env validation at boot, one class per process (`config/env.validation.ts`): API (`app.module.ts`), worker and scheduler fail fast on a missing required variable. Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) and `FEEDBACK_RECIPIENT_EMAIL` are required by the API; TTS and Gemini are optional.
- Config layer: only `apps/api/src/config/` reads `process.env`. The schema checks types (URLs, emails, ports, `NODE_ENV` enum, the three `GOOGLE_TTS_*` together), applies the defaults and lists every problem at once; typed factories (`app`, `auth`, `build`, `mail`, `redis`, `rabbitmq`, `gemini`, `tts`, `scheduler`) are injected with `@Inject(xConfig.KEY)`. Each process loads only the factories it needs; the `.env` path no longer depends on the cwd. Fixes the daily reminder links (`undefined/...` without `FRONTEND_URL`). Web: `apps/web/src/env.ts` is the only reader of `API_URL`, read at runtime (server: `process.env`; browser: `/env.js`), so one web image runs in any environment. Token lifetimes, Gemini timeouts and rate limits are constants (sessions in `auth/auth.constants.ts`, the verification link in `email-verification.service.ts`, the reset link in `password-reset.service.ts`; `gemini.service.ts`, `common/throttler/throttle-policies.ts`), not variables; `JWT_REFRESH_SECRET`, `JWT_*_EXPIRES_IN`, `GEMINI_*` tuning and three unused `GOOGLE_TTS_*` were dropped.
- Dependent values written once: 429 messages built from each policy's `ttl` (`@Throttled`, `formatDuration`); the verification and reset emails receive their link lifetime (`{{expiresIn}}`) from the token TTL constants; the scheduler derives its cron and catch-up gap from `REMINDER_HOURS` (`scheduler/daily-schedule.ts`); local `.env` URLs reuse `${API_PORT}` / `${WEB_PORT}` (`expandVariables`), and `docker-compose.dev.yml` takes the MySQL / RabbitMQ credentials and ports from `.env`.
- Constants: API/web contracts in `@sealvo/shared` (`IMPORT_MAX_FILE_BYTES`, `JOB_TTL_SECONDS`); column lengths in `common/constants/field-lengths.constants.ts`; files named `*.constants.ts`.
- `WorkerModule` / `SchedulerModule` (`worker.module.ts`, `scheduler.module.ts`): the worker and scheduler boot only the modules they use instead of the whole `AppModule`. `app.enableShutdownHooks()` in `main.ts`.
- `@sealvo/shared` is the single source for levels, word types and game types (DTOs, `learning/learning.constants.ts`, web hooks, stores and components); its unused/incorrect `api.ts` types were removed.
- Web: `app/not-found.tsx` (old texts "Erreur" / "La route GET <url> n'existe pas"), `app/error.tsx`, `app/global-error.tsx` replace `ErrorBoundary.tsx`. Learn and packages pages show the old error texts when loading fails.
- Web: packages and words pages split into hooks (`use-package-filters`, `use-package-actions`, `use-delete-all-flow`, `use-word-actions`, `use-words-by-level`) and components. The 7 game pages share `useGameShell` (screen, data, score save, level tracking, celebration, finish once) and `useCountdownTimer`; per-game timings, success rules and texts are unchanged. Pure game logic moved out of the pages (`generate-cards.ts`, `phrases.ts`, `scramble-word.ts`).
- Web unit tests: Vitest in `apps/web` (`npm test`, picked up by `turbo run test`) on the pure modules (deck, progress storage, quiz questions, word-search grid, pronunciation, shuffle, game generators, per-game scoring, speech errors, word edit form, bold markup, safe redirect, the shared token refresh, the API client interceptors): 130 tests in 22 files.
- RabbitMQ: API and worker (re)declare their topology on every new main channel (`RabbitmqService.onChannelReady`, registered by `EmailQueueService` / `ImportQueueService`). An unexpected channel close (e.g. broker error) closes the connection, which reconnects after a fixed 5 s. Publishing uses a confirm channel and resolves only on the broker ack; on nack, error or no channel the caller falls back (direct email send, synchronous import / add words).
- Redis: the reconnect strategy never gives up (delay `min(retries × 500 ms, 10 s)`); boot waits only for the first connection attempt, then retries continue in the background (`redis.service.ts`).
- TTS (`tts.service.ts`): audio (24 h) and voices (6 h) cached through `CacheService` (cache failures never fail the request); every Google call wrapped in breaker (5 failures, 30 s reset) → retry (2 retries, 500 ms, transient errors only) → timeout (voices 8 s, synthesis 5 s); 422 when the language has no Wavenet voice, 503 on other failures. `GenerateAudioDto` (`tts/dto/`): text 1–500 chars (example sentences), `language` in `VALID_LANGS`.
- Job SSE (`job.controller.ts`): ownership via `JobTrackerService.getOwned` (404 missing, 403 not owner), updates via `JobTrackerService.subscribe`; the stream ends when the job finishes or after the job TTL (1 h), and unsubscribes when the client disconnects, including before the subscription is ready.
- Import: an `.xlsx` that inflates to more than 20 MB is rejected before parsing (bytes counted while inflating, in 16 KB input chunks, so forged zip headers do not help) ("Le fichier est trop volumineux une fois décompressé.", `fflate`, `import.service.ts`).
- Env validation: a required variable must also be non-empty (a blank `KEY=` counts as missing). Required: scheduler `SCHEDULER_API_URL`, `CRON_SECRET`; worker `DATABASE_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_FROM`; API the worker's list + `JWT_ACCESS_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FEEDBACK_RECIPIENT_EMAIL`.
- Validation: `@Trim` on usernames (login, register, profile, resend-verification); register checks username and email with separate lookups (case-insensitive collation: `john` = `John`); `@IsOptionalDefined` rejects `null` on optional non-nullable fields (register avatar, profile fields, package name / mode, word level, feedback email; `UpdateWordDto` validates `null` on every field via `skipNullProperties: false`); package ids from path / query / body must be positive integers (400, mismatch still 403); `PrismaClientValidationError` → 400 "Données invalides."; `POST /packages/:id/words` accepts at most 500 items and rejects unknown properties; the synchronous add-words message says "ajouté(s)" (import keeps "importé(s)").
- Feedback DTO: subject and content trimmed, subject ≤ 255, content ≤ 5000 chars, French messages.
- Google login: the Google email is normalized like register (`normalizeEmail`); an existing account matches on the normalized or the raw stored email.
- New `POST /auth/resend-verification` `{username}` (3 / h): resends the verification email of an unverified account; always the same 200 message. `POST /auth/reset-password` has its own 429 message.
- Dead code removed: `RolesGuard` / `@Roles`, unused cache keys and TTLs (packages, words, high score, session), unused shared types (`LoginRequest`, `AuthTokens`, `CreatePackageRequest`), unused deps (`@heroui/react`, `@react-aria/ssr`, `@react-aria/utils`, `framer-motion`, `@nestjs/mau`, `source-map-support`); `fflate` added.
- API structure: `words/words-enrichment.service.ts` (Gemini enrichment), `words/orphan-details.ts`, `prisma/tx-options.constants.ts` (interactive transactions: 10 s wait, 60 s timeout), `common/interceptors/invalidate-dashboard.interceptor.ts` (moved from `packages/`), dashboard counts via `groupBy`; shared `levelFromDb` / `wordTypeToDb` / `wordTypeFromDb`, `PACKAGE_MODES`, `AUTH_LIMITS`, `AVATAR_COUNT`.
- Web structure: `hooks/use-auth.ts`, `hooks/use-feedback.ts`, `lib/query-keys.ts`, per-game `scoring.ts` + `PASS_RULES` (`components/games/level-progress.ts`), `test-pronun/speech-errors.ts`, `components/auth/AuthDecor.tsx`, `useReviewWords` in `hooks/use-words.ts`.
- Web fixes: game data invalidated on every word change; `WordRow` edit form reset when opened, values trimmed, required-field message, stays open until the save succeeds; package toggle / Copier buttons disabled while pending; login redirect keeps the query string (e.g. `?package=`); French feedback type message; an empty Phrase Completion answer no longer counts as an attempt; login shows a "Renvoyer l'email de vérification" button when the account is not verified.
- Infra: CI `migrations-check` job (empty MySQL 8, `prisma migrate deploy`, then `prisma migrate diff --exit-code` against `schema.prisma`) gates the image builds; buildx GHA cache scoped per image; turbo cache (`.turbo/cache`) in CI; prod compose requires `API_URL`; web image `HEALTHCHECK` on `/health`; dev compose starts an empty MySQL (no old SQL mount), schema from the Prisma migrations. The `001_baseline` checksum must be updated once on staging and production (`docs/railway-setup.md`).

### Changes Oct 17, 2026 — second audit pass

- Web: the API URL is runtime configuration (`API_URL`, `/env.js`, `proxy.ts` CSP); a missing or invalid value makes `/health` answer 503 instead of every page failing; in a production build the browser never falls back to `localhost`.
- Open redirect: `safeRedirect` resolves the target against a placeholder origin and keeps only same-origin paths (tab / CR / LF / backslash tricks such as `/\t/evil.com` are rejected).
- Fresh clone: `db:generate` (prisma generate) runs before `build`, `dev`, `lint` and `test` in the turbo graph.
- Password reset: the token is consumed atomically (a second concurrent request gets 400) and also revokes pending email changes; email change requests limited to 3 per hour; `PATCH /dashboard/profile` (now `PATCH /account/profile`) throttled (10 / 15 min). Passwords over 72 bytes are rejected (bcrypt would ignore the rest).
- Logout only revokes a session of the caller; JWT pinned to HS256 (sign and verify); Google OAuth no longer asks for offline access and consent on every login; `/health/deps` (secret-protected) is throttled.
- `FRONTEND_URL` is required in staging and production (no silent `localhost`), trailing `/` removed.
- Deployed environments (staging, production): `JWT_ACCESS_SECRET` and `CRON_SECRET` must be at least 32 characters (startup fails otherwise); staging also requires `STAGING_EMAIL_INTERCEPT` (API and worker), so no real user is emailed from staging; Swagger is off.
- Sessions: tabs refresh one at a time (Web Locks `sealvo-refresh`), so the rotated token's leeway drops from 30 s to 10 s; `SameOriginGuard` refuses a browser `Origin` other than `FRONTEND_URL` (or the API's own, for Swagger) on login / register / refresh / logout — `SameSite=Strict` does not cover sibling subdomains.
- Registration with a taken email: same 201 answer as a new account (no user enumeration); the owner gets a "your account already exists" email with login and forgot-password links, verified or not (never a verification link: see third pass). A taken username is still reported (409).
- Database CHECK constraints (`005_check_constraints`): a violation answers 400 instead of 500. TTS text limit raised to 500 characters (example sentences).
- Web CSP: inline scripts need the per-request nonce (`'strict-dynamic'`) instead of `'unsafe-inline'`; all pages render per request.
- Games: Word Search accuracy is found words / all selections (the old app divided by wrong selections only, so it could exceed 100 %); Test Pronun stops the word being played on replay or on the next word instead of overlapping.
- Job SSE: one Redis Pub/Sub connection per process, at most 10 open streams per user (429).
- Import: blank rows no longer count toward the 500-word limit (rows past 500 are read); inflated size counted while inflating.
- Words: concurrent saves of the same new word no longer fail on the unique key (`INSERT … ON DUPLICATE KEY UPDATE` + `LAST_INSERT_ID()`); progress updates are not awaited inside the transaction.
- Redis: a PING watchdog replaces a connection that stopped answering (node-redis command timeouts stop once the command is written); offline queue disabled, connect timeout 5 s.
- RabbitMQ: consumers go through `RabbitmqService.consume()` (dedicated channel, error / close listeners, unhandled handler errors dead-lettered); the worker stops consumers and waits up to 25 s for messages in flight before closing; an import payload with the wrong shape is discarded; an interrupted import goes through the retry queue (bounded attempts); an email is marked as sent only after SES accepted it; credentials URL-encoded; an unconfirmed publish falls back synchronously with the same job id (no double save).
- Reminders: one batch per hour (`reminder:run:<hour>` with `SET NX`), so a catch-up and a scheduled run cannot both send.
- Worker / scheduler heartbeat (`health/heartbeat.ts`, `config/build.config.ts`): each writes its commit to Redis every 15 s (45 s TTL); `GET /health` lists them under `processes`, which the deploy waits for.
- CI/CD: images pushed only as immutable `:sha-<commit>` (reused, never overwritten); `deploy.yml` moves `:latest` / `:staging` after approval, inside the environment's concurrency group; rollback = commit check + the same deploy (one approval); Railway CLI pinned and installed once; deadline-based waits; Node version from `.nvmrc`.
- Web: startup refresh shares the deduplicated refresh; a failed logout shows an error instead of reloading into the still-valid session; login navigates once; a failed background refetch keeps the dashboard data; renaming / toggling a package refreshes the dashboard and game pickers; the speed-vocab feedback timer is cleared on unmount; Phrase Completion inserts answers containing `$` literally; the dashboard's invisible click "wave" element removed.
- Docs: notes written for the old app moved to `docs/legacy/` (with `ANALYSE_PROJET.md`); `docs/` keeps `local-dev.md` and `railway-setup.md`; new root `README.md` (English).
- Infra: prod compose MySQL health check escapes `$$`; web `@types/node` matches Node 22; `SCHEDULER_API_URL` references the API's `PORT`.

### Changes Oct 17, 2026 — third audit pass

- Import: only columns A–K are read and blank rows skipped, so a small `.xlsx` declaring the range `A1:XFD1048576` no longer blocks the worker.
- Registration: any taken email (verified or not) gets the account-exists email, never a verification link (whoever registered first knows the password); a password reset verifies the email. Register / profile emails must match the `users_email_format` CHECK. TTS trims the text; only transient Google errors open the breaker.
- Words: migration `006_words_case_accent_sensitive` (`utf8mb4_0900_as_cs` on `word` / `subject`): `résumé` no longer reuses the `resume` row (pre-check SELECT in `docs/railway-setup.md`). `addWords` upserts each distinct word once in sorted order and both word transactions rerun on a deadlock (MySQL 1213 / P2034); a lasting one, or P2003, answers 409.
- API: JSON body limit 6 MB (500 words at the longest fields; since the fourth pass only on `POST /packages/:packageId/words`); a redelivered import whose transaction committed is completed, not failed; an unconfirmed publish gives up after 5 s; `forgot-password` answers before the token and email work; `POST /packages/:id/copy` 20 / h; `SCHEDULER_API_URL` loses its trailing `/`.
- Backup: Oracle MySQL 8.0 client (utf8mb4 dumps), Railway `MYSQL*` variables, bucket keys from the bucket's own variable set, retention limited to this database's dumps, streamed restore.
- Web: the session survives an API outage (logout only when the refresh is rejected, 401 / 403); an explicit `Authorization` header is kept; toggle / copy / profile saves use `mutateAsync` so every call gets its toast, and the profile never stores an unconfirmed email; editing a word refreshes the dashboard; Word Search drops accents and non-letters and times only the hidden words; Phrase Completion skips words without a `**blank**`; Vocab Quiz shows 6 distinct options and ignores clicks once answered; Flash Match celebrates with fireworks; Test Pronun ignores the result of a previous word; Playwright defaults to `http://localhost:3000`.
- Login: an unverified account is reported with `code: ACCOUNT_UNVERIFIED` (`API_ERROR_CODES` in `@sealvo/shared`), so the web no longer matches the French message. `LoginDto` caps the username at 255 characters (the column) and the password at 1 KB, above anything an old account (no length rules) can hold.
- CI/CD: a deploy fails before moving tags when a setting is missing and puts the environment tag back when a step fails; a commit the branch moved past is skipped; worker / scheduler must report the commit for 60 s (heartbeat TTL 45 s); runs on `main` / `staging` no longer queue behind each other, builds of one commit take turns; `main` reuses a staging image only after E2E Staging passed, and rescans it; E2E runs only after an actual staging deploy; `rollback.yml` lists the migrations the database keeps (expand / contract in `docs/railway-setup.md`); actions pinned by SHA, base images by digest, Dependabot; the API image exits on SIGTERM during the migration; dev compose binds to `127.0.0.1`; `.gitignore` covers `.env*` and `out/`; API lint type-checks the specs.
- Dependencies: vitest 4.1.11 (`@vitest/coverage-v8` in the API only), TypeScript 5.9 in every workspace, API `@types/node` 22.
- API structure: scaffold `AppController` / `AppService` (`GET /`) removed; `auth/crypto.ts` (token and password hashing), `common/utils/error-message.ts`; `ParseGameTypePipe`; due-date rules in `common/domain/spaced-repetition.ts` (`daysCutoff` shared with the cleanup); `MAX_IMPORT_ROWS` in `@sealvo/shared`; `rabbitmq/retry-queue.ts` (one retry / dead-letter topology for the email and import queues); `MaintenanceService` (cleanup out of `ReminderService`, each table deleted on its own); `SchedulerService` (`scheduler.ts` only boots it); every Redis key in `redis/cache-keys.constants.ts` (`CACHE_KEYS`, `REDIS_KEYS`, `CACHE_TTL.LEVEL_PROGRESS`).
- Web structure: `invalidate` / `invalidateWords` in `lib/query-keys.ts`; `usePackageIdParam` (`hooks/use-package-id-param.ts`) for the `?package=` id.

### Changes Oct 17, 2026 — fourth audit pass

- Sessions: a refresh clears the cookie only when the session is rejected (401), not on a database outage; a session slides 7 days per refresh but ends 30 days after the login (`SESSION_MAX_AGE_MS`, from `created_at`). Web startup (`lib/restore-session.ts`, `AuthInitializer`): when the API is unreachable (network, 429, 5xx) guarded pages keep a spinner and the refresh is retried after 2, 5, 10 then every 30 s.
- Email links: `verifyEmail` consumes the token with a conditional update inside the transaction (a link works once); an address taken in the meantime answers 409. Google token / profile requests time out after 10 s.
- `CRON_SECRET` required in staging and production (env schema).
- Words and packages: every text field of the word and package DTOs is trimmed (`@Trim`, as the old app did). The 6 MB JSON limit applies only to `POST /packages/:packageId/words`; every other body keeps 100 KB. `express` pinned to the version `@nestjs/platform-express` uses (bump them together).
- Resilience: the reminder cleanup runs in `finally`; `amqp.connect` times out after 10 s; a half-open `CircuitBreaker` lets one probe through (`@sealvo/shared` now has Vitest); full SHA-256 for the TTS audio cache key; SES throttling and 5xx are retried; a message parked in the failed queue is acked only after the broker confirmed it; typed job meta.
- Package toggle in one statement (`UPDATE … SET is_active = NOT is_active` and the read in the same transaction): two concurrent toggles no longer cancel into one.
- API structure: `EmailVerificationService` keeps verification only; the email change moved to `auth/email-change.service.ts`, the account-exists email to `AuthService`; `EmailQueueService.enqueueOrFail` (500 with the caller's message when nothing could be queued or sent). Profile in a new `account/` module: `PATCH /account/profile` replaces `PATCH /dashboard/profile` (removed: a web page loaded before the deploy gets a 404 until reloaded), `DashboardModule` no longer imports `AuthModule`. `normalizeEmail` in `common/utils/`, `daily-schedule.ts` in `scheduler/`, `JwtPayload` from `@sealvo/shared`, unused `TtsModule` export dropped, `config/testing.ts` excluded from the build.
- Web, old behaviour restored: Word Scramble scoring (each correct check scores, the attempt counts on the next word, so accuracy can exceed 100 %); Test Pronun scores each word once and skipping the last word ends the game; Phrase Completion falling stars, star particles and constellation glow (`phrase-effects.ts`, paused while the tab is hidden); Learn browser warning for browsers other than Chrome / Edge / Safari (`BrowserWarningModal`, copy link, open in Edge); the element ids the ported CSS targets (`#word-input`, `#timer`, `#progress-text`, `#no-search-results`).
- Web fixes: confirmation before leaving the add-words form or a started learn session (`use-leave-confirmation.ts`; reload, tab close, in-app links; not the browser back button); the deleted row spins then fades out before the words are refetched; found words updated functionally (Word Search), quiz particles cancelled on unmount, logout disabled while pending, games hub hover in CSS; modals have `role="dialog"`, `aria-modal`, a label, Escape and focus handling (`hooks/use-dialog.ts`); the import picker offers `.xlsx` / `.xls` only.
- CI/CD: the environment tag is restored on cancel or timeout too (not by `rollback.yml`); `RAILWAY_TOKEN` scoped to the steps that use it, checkout without persisted credentials; only a not-found registry answer triggers a build; a `main` commit that is on staging always needs E2E Staging green; pull requests build and Trivy-scan the three images; `e2e.yml` takes an optional version that web and API must report before and after the tests.
- Build: the backup image verifies the MySQL signing key; prod compose binds to `127.0.0.1`; turbo local cache capped; API tests run in `Europe/Paris`. `docs/railway-setup.md`: API draining seconds, recovery from a half-applied migration (P3009).
- Not ported, on purpose: the Speed Vocab ripple (the old code appended it inside an `<input>`, so it never showed). `BulkWordsService` stays in `ImportModule` (moving it to `WordsModule` would create a module cycle). Next.js 16 dev-only "instant navigation" warnings come from `AuthGuard` and are unchanged.
- Manual actions: Railway draining 60 s on the API service; `CRON_SECRET` (≥ 32 characters) on staging and production before deploying.

### Legend

- 🔴🔴🔴 CRITICAL security
- 🔴 HIGH (bugs, data integrity)
- 🟠 MEDIUM (architecture, performance, DRY)
- 🟡 LOW (config, naming, optimization)
- 🟢 INFO (good patterns to preserve, notes)

---

### Round 1-2: Migration Plan Errors (#1-14)

| #   | Severity | Issue                                                   | Fix                                                          | Status                                                                                                                                                                                                                                                                                                                                             |
| --- | -------- | ------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 🔴       | Plan replaced RabbitMQ with BullMQ                      | Keep amqplib, use direct RabbitMQ                            | ✅ Done — amqplib in `rabbitmq.service.ts`                                                                                                                                                                                                                                                                                                         |
| 2   | 🟠       | Only listed 2 package modes (private, public)           | Add 'protected' (visible but not copyable)                   | ✅ Done — `packages_mode` enum; copy restricted to public                                                                                                                                                                                                                                                                                          |
| 3   | 🟡       | No CORS configuration in plan                           | Add CORS in NestJS main.ts                                   | ✅ Done — `enableCors` (FRONTEND_URL, credentials) in `main.ts`                                                                                                                                                                                                                                                                                    |
| 4   | 🟠       | Prisma migration conflicts with existing schema         | Use `prisma db pull` → baseline → migrate                    | ✅ Done — `001_baseline` + resolve step in `railway-setup.md`                                                                                                                                                                                                                                                                                      |
| 5   | 🟠       | importFile.js SRP not addressed                         | Split into ImportController + ImportService + FileUploadPipe | ✅ Done — `ImportService` parses and validates (400 listing bad rows, 500-row cap); controller only uploads (`FileInterceptor`: .xlsx/.xls, 5 MB) and queues                                                                                                                                                                                       |
| 6   | 🟡       | Email templates location unclear                        | @nestjs-modules/mailer with Handlebars adapter               | ✅ Done — chosen: plain Handlebars; templates in `apps/api/templates/mails`                                                                                                                                                                                                                                                                        |
| 7   | 🟠       | Role column not implemented in plan                     | Add RolesGuard with @Roles('Admin') decorator                | ✅ Done — no role guard: `RolesGuard` + `@Roles` were added, never used, then removed (no route needs a role). No Admin bypass: package guards are owner-only (specs assert Admin is rejected); the old app had no Admin logic either (only the `role` column)                                                                                     |
| 8   | 🟡       | Health endpoint has 2 versions (/ and /deps)            | Both in HealthModule via @nestjs/terminus                    | ✅ Done — `/health` + `/health/deps` (custom checks, no terminus)                                                                                                                                                                                                                                                                                  |
| 9   | 🔴       | RabbitMQ topology won't work with @nestjs/microservices | Use amqplib directly in RabbitmqService                      | ✅ Done — amqplib topology in queue services                                                                                                                                                                                                                                                                                                       |
| 10  | 🟠       | Docker architecture not redesigned                      | New docker-compose with 7 services                           | ✅ Done — `docker-compose.prod.yml`: 7 services + `backup` profile                                                                                                                                                                                                                                                                                 |
| 11  | 🟡       | CSS complexity not addressed                            | Tailwind + CSS Modules + CSS variables                       | ✅ Done — page CSS are CSS Modules (`apps/web/src/styles/*.module.css`, `styles/games/*.module.css`) mapped with `cx()` (`lib/css-module.ts`); only main / header / footer / dark-mode stay global (`globals.css`, Tailwind still imported). Reason: React 19 never unloads stylesheets, so global page CSS leaked between client-side navigations |
| 12  | 🟠       | Worker architecture unclear                             | Shared codebase, separate entry points                       | ✅ Done — `worker.ts`, same image                                                                                                                                                                                                                                                                                                                  |
| 13  | 🟠       | Scheduler architecture unclear                          | Keep separate process (Celery Beat pattern)                  | ✅ Done — `scheduler.ts` → POST `/api/reminder`                                                                                                                                                                                                                                                                                                    |
| 14  | 🟠       | ReminderController placed inside EmailModule            | Separate ReminderModule                                      | ✅ Done — `reminder/` module                                                                                                                                                                                                                                                                                                                       |

### Round 3: Architecture, Bugs, Performance (#15-34)

| #   | Severity | Issue                                                                          | Fix                                     | Status                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------- | ------------------------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | 🟠       | ReminderService in wrong module                                                | Create ReminderModule                   | ✅ Done — `reminder.module.ts`                                                                                                                                                                                                                                                                                                                                                                                    |
| 16  | 🟡       | Game "providers" naming wrong                                                  | Rename to services + Strategy pattern   | ➖ N/A — chosen: single `GamesService` + `GAME_LEVEL` map                                                                                                                                                                                                                                                                                                                                                         |
| 17  | 🟡       | Missing business rules documentation                                           | Create BUSINESS_RULES.md                | ✅ Done — `BUSINESS_RULES.md`, written from the code (levels, games, streak, modes, import, auth lifetimes, cleanup, rate limits, timezone)                                                                                                                                                                                                                                                                       |
| 18  | 🟡       | Missing font/icon strategy                                                     | lucide-react + npm packages             | ➖ N/A — chosen: Font Awesome (npm) + `next/font`                                                                                                                                                                                                                                                                                                                                                                 |
| 19  | 🟡       | CSP nonce handling changes with SPA                                            | Next.js middleware for nonce injection  | ✅ Done — per-request nonce + `'strict-dynamic'` in `proxy.ts`, every page rendered per request; styles keep `'unsafe-inline'` (React `style` attributes)                                                                                                                                                                                                                                                         |
| 20  | 🟡       | Multer disk storage unnecessary                                                | Use memoryStorage()                     | ✅ Done — `FileInterceptor` default memory storage, 5 MB limit                                                                                                                                                                                                                                                                                                                                                    |
| 21  | 🟡       | jobWatcher.js localStorage pattern                                             | Custom useJobWatcher React hook         | ✅ Done — global `JobWatcher` (`apps/web/src/components/jobs/`: `JobWatcher.tsx`, `use-job-subscription.ts`, `use-resume-active-jobs.ts`, `job-messages.ts`; mounted in `providers/app-providers.tsx`) streams every queued job (import and add words). After a reload it resumes from `GET /jobs`, else from `localStorage` key `activeJobs` (`lib/active-jobs.ts`, entries < 1 h). `useImportFile` only uploads |
| 22  | 🔴       | `updateWord` hardcodes subject='Daily' when word base changes                  | Use correct subject from wordData       | ✅ Done — `dto.subject ?? current subject` in `updateWord`                                                                                                                                                                                                                                                                                                                                                        |
| 23  | 🔴       | GoogleAuthController hardcodes `http://` in redirect URI                       | Use `${BASE_URL}/auth/google/callback`  | ✅ Done — `GOOGLE_REDIRECT_URI` from config                                                                                                                                                                                                                                                                                                                                                                       |
| 24  | 🟡       | Level progress stored only in Redis (TTL 3h)                                   | Keep Redis, increase TTL                | ➖ N/A — chosen: Redis with 3h TTL is intended (product decision); stored as a hash `cache:lvlprog:h:<userId>` (atomic `HSET`/`HDEL`, promotion runs once)                                                                                                                                                                                                                                                        |
| 25  | 🟠       | GeminiService creates new client per request                                   | One client, created lazily on first use | ✅ Done — one lazily created client (`this.client ??=`) in `gemini.service.ts`                                                                                                                                                                                                                                                                                                                                    |
| 26  | 🟠       | MailersendService reads templates with fs.readFileSync every call              | Pre-compile templates at module init    | ✅ Done — each template compiled once and cached (`EmailService`)                                                                                                                                                                                                                                                                                                                                                 |
| 27  | 🟠       | ReminderController N+1 queries (ALL users → words per user → details per word) | Batch queries (2-3 total)               | ✅ Done — 3 queries in `reminder.service.ts`                                                                                                                                                                                                                                                                                                                                                                      |
| 28  | 🟡       | Interval SQL duplicated 5 times in learning.js                                 | Reusable query builder / Prisma scope   | ✅ Done — `common/domain/spaced-repetition.ts`                                                                                                                                                                                                                                                                                                                                                                    |
| 29  | 🟠       | Sanitization migration not addressed                                           | Custom SanitizationPipe                 | ➖ N/A — chosen: output escaping by React and Handlebars instead of input sanitizing (stored text stays as typed; no SanitizationPipe)                                                                                                                                                                                                                                                                            |
| 30  | 🟠       | RabbitMQ has no auto-reconnect                                                 | Auto-reconnect in RabbitmqService       | ✅ Done — API reconnects after a fixed 5 s delay (also after an unexpected channel close; topology re-declared on each new channel); worker exits on connection loss so the platform restarts it and re-subscribes                                                                                                                                                                                                |
| 31  | 🟠       | UserModel.updateUserInfo makes 3 separate UPDATEs                              | Single Prisma update()                  | ✅ Done — single `users.update` in `dashboard.service.ts`                                                                                                                                                                                                                                                                                                                                                         |
| 32  | 🟡       | CSRF unnecessary with JWT                                                      | Remove CSRF entirely                    | ➖ N/A — JWT Bearer; refresh cookie `SameSite=strict`                                                                                                                                                                                                                                                                                                                                                             |
| 33  | 🟠       | Rate limiting migration incomplete                                             | @nestjs/throttler with Redis store      | ✅ Done — per-route limits + trust proxy; `RedisThrottlerStorage` on the shared Redis client (in-memory fallback when Redis is down); per-route French 429 messages (`@ThrottleMessage`)                                                                                                                                                                                                                          |
| 34  | 🟡       | Health endpoint architecture unclear                                           | @nestjs/terminus with 2 endpoints       | ✅ Done — see #8                                                                                                                                                                                                                                                                                                                                                                                                  |

### Round 4: Dead Code, Tests, Frontend, DevOps (#35-45)

| #   | Severity | Issue                                                       | Fix                                          | Status                                                                                                                                                                                                                                                                                                                                            |
| --- | -------- | ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 35  | 🟡       | `editVocabs.hbs` referenced in code but file doesn't exist  | Don't port dead reference                    | ✅ Done — not ported                                                                                                                                                                                                                                                                                                                              |
| 36  | 🔴       | Google OAuth creates user without `is_verified=true`        | Set `is_verified: true` for OAuth users      | ✅ Done — `is_verified: true` in `googleLogin`                                                                                                                                                                                                                                                                                                    |
| 37  | 🟠       | 52 unit + 5 e2e tests with no migration strategy            | Jest + @nestjs/testing + Playwright          | ✅ Done — Vitest (392 API tests in 56 files, incl. guards and DTOs; 138 web unit tests in 24 files; 3 in `@sealvo/shared`) + 31 Playwright (26 public + 5 protected with the seeded account, #58); E2E runs on staging after each staging deploy                                                                                                  |
| 38  | 🟠       | 22 JS files (~5500 lines) not 6 as initially estimated      | Full decomposition into ~40 React components | ✅ Done — 92 `.tsx` components + 63 `.ts` hooks/helpers in `components/`, tests excluded (about, auth, dashboard, games ×7, home, jobs, layout, learn, packages, words); largest pages: test-pronun 272, phrase-completion 264, word-search 256, register 244, speed-vocab 229, other games 188–205, words 167, dashboard 131, packages 110 lines |
| 39  | 🟡       | theme-init.js FOUC prevention                               | Cookie-based theme detection in Next.js      | ✅ Done — `next-themes` inline script (localStorage, not cookie)                                                                                                                                                                                                                                                                                  |
| 40  | 🟡       | /update-streak orphan route (registered on app, not router) | Move into LearningController                 | ✅ Done — `POST /learning/streak`                                                                                                                                                                                                                                                                                                                 |
| 41  | 🟡       | Dockerfile.backup missing from migration plan               | Add to Docker Compose with backup profile    | ✅ Done — `Dockerfile.backup` + compose `backup` profile + CI image                                                                                                                                                                                                                                                                               |
| 42  | 🟡       | ImportService naming misleading                             | Rename to WordProcessingService              | ✅ Done — `BulkWordsService` (`import/bulk-words.service.ts`) queues or saves synchronously (import and add words); saving in `WordsService.addWords`                                                                                                                                                                                             |
| 43  | 🟡       | addWordSchema is just [packageQuery] — confusing name       | Split into PackageQueryDto + CreateWordDto   | ✅ Done — `:packageId` route param + `CreateWordDto[]`                                                                                                                                                                                                                                                                                            |
| 44  | 🟠       | Dashboard logic in UsersModule (wrong boundary)             | Create DashboardModule                       | ✅ Done — `dashboard/` module                                                                                                                                                                                                                                                                                                                     |
| 45  | 🟠       | Package ownership check duplicated 4 times                  | PackageOwnershipGuard                        | ✅ Done — `PackageOwnershipGuard` (+ `PackageReadGuard` for reads; ids must match, #78)                                                                                                                                                                                                                                                           |

### Round 5: Data Integrity (#46-50)

| #   | Severity | Issue                                                                           | Fix                                                              | Status                                                                                                   |
| --- | -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 46  | 🔴       | Package copy shares word_details via batchStockWords → cross-user data mutation | Clone word_details during copy (new detail_ids)                  | ✅ Done — `copyPublicPackage` clones `word_details`                                                      |
| 47  | 🔴       | deleteWord only deletes from learning table → orphaned word_details             | Check refs after delete, clean up if zero                        | ✅ Done — orphan cleanup in `deleteWord` / `deleteAllWords`                                              |
| 48  | 🟠       | User ID generation (7-char hex) has race condition (check-then-insert)          | Retry on Prisma P2002 unique constraint violation                | ✅ Done — `createUser` retries on PRIMARY P2002 (5 attempts)                                             |
| 49  | 🟠       | JWT implementation details missing from plan                                    | Full flow: access 15min, refresh 7d, rotation, Axios interceptor | ✅ Done — opaque refresh sessions in DB: rotation, reuse detection, 10 s leeway, revoked on logout/reset |
| 50  | 🟠       | Logging strategy missing                                                        | NestJS Logger or nestjs-pino                                     | ✅ Done — NestJS Logger (only `worker.ts` uses console)                                                  |

### Round 6: CI/CD, Security, Config (#51-55)

| #   | Severity | Issue                                                        | Fix                                                                         | Status                                                                                                     |
| --- | -------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 51  | 🟠       | CI/CD pipeline needs complete rewrite for monorepo           | Turborepo-aware GitHub Actions: turbo lint, turbo test, matrix Docker build | ✅ Done — `ci-cd.yml`: turbo lint/test/build + 3-image matrix                                              |
| 52  | 🟢       | Security matrix (25 endpoints) = perfect migration checklist | Use as validation checklist                                                 | ✅ Done — checklist followed; guard rejects mismatched ids across params/query/body                        |
| 53  | 🟡       | ESLint config needs TypeScript ESLint                        | @typescript-eslint/parser + recommended                                     | ➖ N/A — chosen: oxlint (api) + eslint-config-next (web)                                                   |
| 54  | 🟡       | Husky + lint-staged needs Turborepo update                   | Per-app lint-staged patterns                                                | ✅ Done — per-package lint-staged: prettier + `oxlint --type-aware` (api), prettier + eslint (web); ~1.3 s |
| 55  | 🟢       | .env.example well-documented (75 lines)                      | Split into per-app .env files                                               | ➖ N/A — chosen: single root `.env.example` (updated)                                                      |

### Round 7: DB Schema Bugs, Scripts (#56-60)

| #   | Severity | Issue                                                                      | Fix                                                                                    | Status                                                                                                                                                                           |
| --- | -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 56  | 🔴       | `updateWord` SELECT missing `subject` in WHERE → can link to wrong word_id | Prisma `findUnique` with composite key enforces all 3 fields                           | ✅ Done — `upsertWord` on the `(word, subject, language_code)` unique key, inside the `updateWord` transaction                                                                   |
| 57  | 🟠       | `editPackagePost` makes 3 non-transactional DB calls → inconsistent state  | Single Prisma `$transaction()`                                                         | ✅ Done — single `packages.update` call (atomic on its own: no `$transaction`)                                                                                                   |
| 58  | 🟡       | `intialize.sql` (typo) + `test.sql` have invalid language codes            | Don't port; use Prisma seed                                                            | ✅ Done — not ported; `prisma/seed.mjs` (idempotent E2E account, refuses production). dev DB starts empty and gets its schema from `prisma migrate deploy` (`docs/local-dev.md`) |
| 59  | 🟠       | Scripts (backup/restore/build/migrate) migration strategy missing          | Port backup-db.ts + restore-db.ts; Prisma replaces migrate + build replaced by Next.js | ✅ Done — `apps/api/scripts/backup-db.mjs` + `restore-db.mjs`                                                                                                                    |
| 60  | 🟠       | Prisma schema must model shared word pool correctly                        | Composite unique + correct relations                                                   | ✅ Done — `uq_words_word_subject_lang` + relations                                                                                                                               |

### Round 8: Cross-cutting Concerns (#61-65)

| #   | Severity | Issue                                                            | Fix                                                        | Status                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 61  | 🟠       | Cache keys fragmented across controllers (no registry)           | Centralized CacheKeys constant + CacheInvalidationService  | ✅ Done — `CACHE_KEYS` / `CACHE_TTL` hold only the keys in use (dashboard, level progress, email dedup, TTS audio 24h and voices 6h, reminder run 2h; `CacheService` prefixes `cache:`). Invalidation stays an explicit `del` of a known key (`InvalidateDashboardInterceptor`, import queue); a SCAN-based invalidation service was removed on purpose |
| 62  | 🟠       | GameScores.saveScore has redundant query + TOCTOU race           | Remove pre-query; determine isHighScore from single upsert | ✅ Done — `createMany(skipDuplicates)` + conditional `updateMany`                                                                                                                                                                                                                                                                                       |
| 63  | 🟠       | saveWords inserts sequentially (100 words = 100 transactions)    | Wrap in single Prisma $transaction()                       | ✅ Done — single `$transaction` in `addWords`                                                                                                                                                                                                                                                                                                           |
| 64  | 🟠       | NestJS execution order differs from Express — must document      | Map Express middleware → NestJS lifecycle                  | ✅ Done — section 2 "NestJS Execution Order" lists what is registered (guards, pipes, interceptors, filter, throttler) and what was not ported                                                                                                                                                                                                          |
| 65  | 🟡       | email_verification.generateToken() recursive without depth limit | Loop with max 5 attempts                                   | ✅ Done — `generateVerificationToken` loop, max 5                                                                                                                                                                                                                                                                                                       |

### Round 9: Timezone, API Contract, Degradation (#66-70)

| #   | Severity | Issue                                                               | Fix                                                              | Status                                                                                                                                                                                                   |
| --- | -------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 66  | 🔴       | Timezone mismatch: streakService uses JS local time, MySQL uses UTC | Use UTC consistently: `Date.UTC()`, `process.env.TZ='UTC'`       | ✅ Done — chosen: Europe/Paris everywhere (product decision): `TZ=Europe/Paris` in the API image, scheduler cron in Europe/Paris, day boundaries from the process local time; Prisma stores UTC instants |
| 67  | 🟠       | loginPost stores stats in session (stale immediately)               | JWT payload minimal: {sub, username, role}. Stats always via API | ✅ Done — payload `{sub, username, role}`                                                                                                                                                                |
| 68  | 🟡       | API response format inconsistent (4 different formats)              | Standardized envelope via TransformInterceptor                   | ➖ N/A — chosen: no response envelope: no user benefit and it would break every client call; errors already share Nest's `{statusCode, message}` format                                                  |
| 69  | 🟠       | 13 render() endpoints → need new API endpoints for Next.js          | Create full API endpoint mapping                                 | ✅ Done — endpoints implemented (nested URLs, see section 6)                                                                                                                                             |
| 70  | 🟢       | 3 graceful degradation paths must be preserved                      | Redis fallback, RabbitMQ fallback, Circuit Breaker               | ✅ Done — cache no-op, direct email / sync import, Gemini breaker                                                                                                                                        |

### Round 10: OAuth, Docker, Validation (#71-75)

| #   | Severity | Issue                                                    | Fix                                                                    | Status                                                                                              |
| --- | -------- | -------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 71  | 🔴       | Google OAuth password NOT hashed + missing is_verified   | Hash random password + set is_verified=true + add auth_provider column | ✅ Done — bcrypt random password + `is_verified`; `auth_provider` skipped by choice                 |
| 72  | 🔴       | Dockerfile runs migrations on startup → 3 processes race | Only API runs `prisma migrate deploy`; worker/scheduler skip           | ✅ Done — default CMD migrates; worker/scheduler override command                                   |
| 73  | 🟡       | Google OAuth duplicates session setup logic              | Eliminated by JWT (single AuthService)                                 | ✅ Done — shared `TokenService.issueTokens` (password and Google login)                             |
| 74  | 🟠       | addWordSchema doesn't validate body (only query param)   | Separate CreateWordDto with class-validator                            | ✅ Done — `ParseArrayPipe({ items: CreateWordDto })`                                                |
| 75  | 🟡       | xlsx dependency loaded from CDN tarball, not npm         | Replace with exceljs from npm                                          | ✅ Done — chosen: official SheetJS 0.20.3 tarball (keeps .xls; exceljs cannot read it), audit clean |

### Round 11: IDOR — Games (#76-80)

| #   | Severity | Issue                                                                       | Fix                                           | Status                                                                                                                                                                                                                                                                                     |
| --- | -------- | --------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 76  | 🔴🔴🔴   | IDOR: 7 game endpoints leak other users' words (no package ownership check) | PackageOwnershipGuard on all ?package= routes | ✅ Done — `GET /games/:type/data?packageId` guarded                                                                                                                                                                                                                                        |
| 77  | 🟡       | shuffleArray duplicated in 5 game controllers                               | Shared utility in packages/shared             | ✅ Done — chosen: one Fisher–Yates `shuffleArray` in `apps/web/src/lib/shuffle.ts` for the games; the API shuffles only for Word Search, to pick a random subset of at most 30 words (`games.service.ts`); phrases are built and shuffled by the web only (`phrase-completion/phrases.ts`) |
| 78  | 🔴🔴🔴   | IDOR: trackGameCompletion can WRITE to other users' data                    | PackageOwnershipGuard                         | ✅ Done — guard checks every id source, mismatch → 403 (`package-ownership.guard.spec.ts`)                                                                                                                                                                                                 |
| 79  | 🟡       | VocabQuizController O(n²) complexity                                        | Pre-shuffle once, build options linearly      | ➖ N/A — chosen: old generation kept, client-side (`components/games/vocab-quiz/generate-questions.ts`): one fresh shuffle per question (O(n²) on the due words of one package), 6 options; quiz length `min(n, MAX_QUESTIONS = 300) + ⌊n/2⌋`                                              |
| 80  | 🔴🔴     | learnVocabs — same IDOR pattern                                             | PackageOwnershipGuard                         | ✅ Done — `GET /packages/:packageId/words/review` guarded                                                                                                                                                                                                                                  |

### Round 12: Systemic IDOR (#81-85)

| #   | Severity | Issue                                                                  | Fix                              | Status                                                                                |
| --- | -------- | ---------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| 81  | 🔴🔴🔴   | SYSTEMIC IDOR: 13 endpoints NO check + 4 partial check = 17 vulnerable | Global PackageOwnershipGuard     | ✅ Done — per-route guard on every package-id endpoint; ids must match across sources |
| 82  | 🔴🔴🔴   | deleteAllWords — zero authorization, deletes ANY package's words       | PackageOwnershipGuard            | ✅ Done — route-level guard on `DELETE …/words`                                       |
| 83  | 🔴🔴     | addWordPost — inject words into other users' packages                  | PackageOwnershipGuard            | ✅ Done — route-level guard on `POST …/words`                                         |
| 84  | 🔴       | deleteWord/editWord partial check (word↔pkg but NOT pkg↔user)          | Add pkg→user check               | ✅ Done — guard + composite `(detail_id, package_id)` lookup                          |
| 85  | 🟡       | findUsersByWordId — misleading name (returns learning row)             | Rename to findLearningByDetailId | ✅ Done — not ported; direct Prisma `learning` queries                                |

### Round 13: Docker, Uploads, Dead Code (#86-90)

| #   | Severity | Issue                                                                 | Fix                                       | Status                                                                                                                                                      |
| --- | -------- | --------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 86  | 🟠       | Docker Compose builds same image 3 times                              | Build once, reference by image name       | ✅ Done — compose: api/worker/scheduler share the `x-api-image` anchor (same `build` + `image: sealvo-api`); CI builds the api image once                   |
| 87  | 🟡       | uploads_data volume unnecessary with memoryStorage                    | Remove volume, use memoryStorage()        | ✅ Done — no uploads volume; memory storage                                                                                                                 |
| 88  | 🟡       | cache.invalidatePattern — exported but never called                   | Note as dead code; port if needed         | ✅ Done — dead `invalidatePattern` removed from `cache.service.ts`                                                                                          |
| 89  | 🟡       | secrets.js must add JWT secrets                                       | Add JWT_ACCESS_SECRET, JWT_REFRESH_SECRET | ✅ Done — `JWT_ACCESS_SECRET` required by the env schema (`config/env.validation.ts`); `JWT_REFRESH_SECRET` no longer needed (opaque refresh sessions, #49) |
| 90  | 🟢       | Email template CSS uses hover/transitions — stripped by email clients | Remove animation CSS from email templates | ✅ Done — hover/transition/animation CSS removed from `apps/api/templates/mails`                                                                            |

### Round 14: Test Config, Sanitization (#91-95)

| #   | Severity | Issue                                                   | Fix                                       | Status                                                           |
| --- | -------- | ------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| 91  | 🟡       | sanitization.js — JSDOM singleton ~30MB                 | Use isomorphic-dompurify or sanitize-html | ➖ N/A — no server-side sanitizer / JSDOM in new stack (see #29) |
| 92  | 🟡       | Playwright config needs URL update for monorepo         | Point to Next.js frontend URL             | ✅ Done — `apps/web/playwright.config.ts` uses `BASE_URL`        |
| 93  | 🟡       | Jest config needs restructure for Turborepo             | Per-app jest.config.ts with ts-jest       | ➖ N/A — chosen: Vitest (`apps/api/vitest.config.ts`)            |
| 94  | 🟡       | Dockerfile.backup needs Prisma adaptation               | Keep mysqldump (independent of Prisma)    | ✅ Done — mysqldump in `Dockerfile.backup`                       |
| 95  | 🟢       | CircuitBreaker.getAll() static registry — clean pattern | Port to NestJS health checks              | ✅ Done — `CircuitBreaker.getAll()` in `/health/deps`            |

### Round 15: Concurrency, Express, Pool (#96-100)

| #   | Severity | Issue                                               | Fix                                                 | Status                                                                                                                       |
| --- | -------- | --------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 96  | 🟠       | Worker prefetch(1) blocks email during long imports | Separate channels per queue                         | ✅ Done — `RabbitmqService.consume()`: one channel per consumer                                                              |
| 97  | 🟡       | Express 5 → NestJS uses Express 4 adapter           | No real impact (NestJS abstracts Express)           | ➖ N/A — NestJS 12 platform-express runs Express 5.2                                                                         |
| 98  | 🟡       | MySQL connection pool sizing for 3 processes        | Coordinate pool sizes: api=8, worker=4, scheduler=2 | ✅ Done — `connection_limit` 8 (API) / 4 (worker) documented in `railway-setup.md`; the scheduler has no database connection |
| 99  | 🟢       | resilience.js — excellent quality, port as-is       | Port to packages/shared/src/resilience/             | ✅ Done — `packages/shared/src/resilience/`                                                                                  |
| 100 | 🟢       | TTS lazy client init — good pattern                 | Preserve via onModuleInit()                         | ✅ Done — `TtsService.onModuleInit`                                                                                          |

### Round 16: Auth Edge Cases, DRY (#101-105)

| #   | Severity | Issue                                                   | Fix                                           | Status                                                                |
| --- | -------- | ------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| 101 | 🟠       | forgotPasswordPost + changePasswordPost — 90% duplicate | Single requestReset(email) service method     | ✅ Done — one `forgotPassword`; dashboard links to `/forgot-password` |
| 102 | 🟡       | EmailVerificationController bypasses setFlash() helper  | N/A with JWT/SPA (toast notifications)        | ➖ N/A — no flash with JWT/SPA (toasts)                               |
| 103 | 🟡       | resetPass.js — Redis-only, no fallback if Redis down    | Store tokens in DB (PasswordResetToken table) | ✅ Done — `password_reset_tokens` table (migration 002)               |
| 104 | 🟡       | feedbackPost — inline HTML instead of template          | Create feedback email template                | ✅ Done — `feedback.hbs` template (Handlebars escaping)               |
| 105 | 🟢       | USER_GMAIL env var — misleading name                    | Rename to FEEDBACK_RECIPIENT_EMAIL            | ✅ Done — `FEEDBACK_RECIPIENT_EMAIL` (code, `.env.example`, docs)     |

---

## 4. Prisma Schema

Source of truth: `apps/api/prisma/schema.prisma`, introspected from the old MySQL DB (#4); migrations
`001_baseline`, `002_refresh_sessions_and_reset_tokens`, `003_email_change`, `004_applied_jobs`, `005_check_constraints`, `006_words_case_accent_sensitive`. Model
names are the table names (no `@@map`). 11 models, 6 enums:

| Model                   | Key facts                                                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                 | `id` Char(7) random hex (#48); `username`, `email` unique; `role` `users_role` (`Admin` / `User`, default `User`; no route checks it); `streak`, `streak_updated_at`, `is_verified`, `ava`. No `auth_provider` column (#71) |
| `email_verification`    | `token_hash` Char(64), `status` pending / used / revoked, `expires_at`; `new_email` for an email change (migration 003)                                                                                                     |
| `refresh_sessions`      | one row per device (migration 002): `token_hash`, `previous_hash` + `rotated_at` (10 s leeway), `expires_at`                                                                                                                |
| `password_reset_tokens` | migration 002: `token_hash` Char(64) primary key, `user_id`, `expires_at`, `created_at`. No email / `used` column: the user's rows are deleted on a new request and on reset                                                |
| `packages`              | `mode` `packages_mode` (`private` default, `protected`, `public`), `is_active`                                                                                                                                              |
| `words`                 | shared pool, unique `(word, subject, language_code)` (`uq_words_word_subject_lang`); `word` / `subject` in `utf8mb4_0900_as_cs` (migration 006: case- and accent-sensitive)                                                 |
| `word_details`          | per-package meaning, pronunciation, synonyms, antonyms, example, grammar; `type` `word_details_type` (`ph_v` ↔ DB `ph.v`)                                                                                                   |
| `learning`              | PK `(detail_id, package_id)`; `level` `learning_level`: `x`, `level_0` / `level_1` / `level_2` ↔ DB `0` / `1` / `2`, `v`; `date_memorized` (nullable); index `(package_id, level, date_memorized)`                          |
| `user_best_scores`      | PK `(user_id, game_type)`; `best_score`, `play_count`, `last_played_at`; `game_type` enum of the 7 games                                                                                                                    |
| `applied_jobs`          | migration 004: `job_id` Char(36) primary key, `created_at` (indexed); one row per applied import job (idempotency), deleted after 7 days                                                                                    |
| `schema_migrations`     | table of the old app's SQL migrator, kept as introspected                                                                                                                                                                   |

---

## 5. Module Dependency Graph

Real `imports:` of `app.module.ts` and each `*.module.ts`. Prisma, RabbitMQ and Redis modules are
`@Global`: feature modules use their services without importing them. The worker and scheduler
boot their own root module (`NestFactory.createApplicationContext`).

```
AppModule (+ ThrottlerGuard APP_GUARD, PrismaExceptionFilter APP_FILTER)
├── ConfigModule (isGlobal, validateApiEnv)
├── ThrottlerModule (100/min default, RedisThrottlerStorage, @ThrottleMessage errorMessage)
├── PrismaModule (@Global)
├── RabbitmqModule (@Global)
├── RedisModule (@Global: RedisService, CacheService)
├── EmailModule (EmailService, EmailQueueService)
├── ImportModule (ImportController, JobController; BulkWordsService, ImportQueueService,
│   │             JobTrackerService, ImportService)
│   └── WordsCoreModule
├── HealthModule
├── AuthModule (AuthService, SessionService, TokenService, EmailVerificationService,
│   │           EmailChangeService, PasswordResetService, GoogleAuthService, JwtStrategy;
│   │           exports EmailChangeService)
│   ├── PassportModule
│   ├── EmailModule
│   └── JwtModule (JWT_ACCESS_SECRET, 15m)
├── PackagesModule
├── WordsModule (WordsController only)
│   ├── WordsCoreModule (WordsService, WordsEnrichmentService)
│   │   └── GeminiModule
│   └── ImportModule (BulkWordsService)
├── LearningModule
├── GamesModule
├── DashboardModule
├── AccountModule (AccountController, AccountService)
│   └── AuthModule (EmailChangeService)
├── TtsModule
├── FeedbackModule
│   └── EmailModule
└── ReminderModule (ReminderController, TestReminderController)
    ├── EmailModule
    └── MaintenanceModule (MaintenanceService)

WorkerModule (worker.ts; providers ImportQueueService, JobTrackerService, no controllers)
├── ConfigModule (isGlobal, validateWorkerEnv)
├── PrismaModule, RabbitmqModule, RedisModule (@Global)
├── EmailModule
└── WordsCoreModule
    └── GeminiModule

SchedulerModule (scheduler.ts; provider SchedulerService)
├── ConfigModule (isGlobal, validateSchedulerEnv)
└── RedisModule (@Global)
```

Guards (`JwtAuthGuard`, `PackageOwnershipGuard`, `PackageReadGuard`, `CronSecretGuard`,
`SameOriginGuard`) live in `auth/guards/` and are applied with `@UseGuards`; the package guards use
the global `PrismaService`, `CronSecretGuard` and `SameOriginGuard` read the config.
`InvalidateDashboardInterceptor` lives in `common/interceptors/`.

**No circular dependencies.**

---

## 6. API Endpoints Mapping

From the controllers (`apps/api/src/**/*.controller.ts`). No global prefix: the only `/api` routes are
the cron `POST /api/reminder` (hidden from Swagger) and the Swagger UI `/api/docs` (development only). Every route needs `JwtAuthGuard` except auth
(register, login, refresh, forgot/reset password, verify-email, resend-verification, Google), feedback, `GET /health`,
and the `CronSecretGuard` routes (`GET /health/deps`, `POST /api/reminder`).
"Owner" = `PackageOwnershipGuard`, "Read" = `PackageReadGuard` (owner, or a `public` / `protected`
package).

### Authentication (`auth.controller.ts`)

| Express                                                  | NestJS                         | Notes                                                                            |
| -------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| POST /login                                              | POST /auth/login               | `{accessToken}` + refresh cookie                                                 |
| POST /registre                                           | POST /auth/register            | sends the verification email, or the account-exists email for a taken address    |
| GET /logout                                              | POST /auth/logout              | JWT; revokes this device's session, clears the cookie                            |
| GET /auth/google                                         | GET /auth/google               | 302 to Google (state cookie)                                                     |
| GET /auth/google/callback                                | GET /auth/google/callback      | 302 to `/dashboard` (refresh cookie) or `/login?error=…`                         |
| GET /auth/verify/:token                                  | POST /auth/verify-email        | body `{token}`, called by the `/verify-email` page                               |
| — (new)                                                  | POST /auth/resend-verification | body `{username}`; same 200 message whether or not an unverified account matches |
| POST /login/forgotPassword                               | POST /auth/forgot-password     | same answer whether the account exists or not                                    |
| POST /login/resetPassword, POST /dashboard/resetPassword | POST /auth/reset-password      |                                                                                  |
| POST /dashboard/changePassword                           | —                              | removed: the dashboard links to `/forgot-password` (#101)                        |
| — (new)                                                  | POST /auth/refresh             | refresh cookie rotation                                                          |
| — (new)                                                  | GET /auth/me                   | JWT                                                                              |

### Dashboard + account (`dashboard.controller.ts`, `account.controller.ts`)

| Express              | NestJS                 | Notes                                      |
| -------------------- | ---------------------- | ------------------------------------------ |
| GET /dashboard       | GET /dashboard         | stats (cached 5 min)                       |
| POST /dashboard/edit | PATCH /account/profile | username, email (current password), avatar |

### Packages (`packages.controller.ts`)

| Express                               | NestJS                            | Notes                                |
| ------------------------------------- | --------------------------------- | ------------------------------------ |
| GET /myPackages                       | GET /packages                     | user's packages                      |
| —                                     | GET /packages/public              | public + protected                   |
| —                                     | GET /packages/:packageId          | Read                                 |
| POST /myPackages                      | POST /packages                    |                                      |
| POST /myPackages/delete/:id           | DELETE /packages/:packageId       | Owner                                |
| PUT /myPackages/edit/:id              | PATCH /packages/:packageId        | Owner                                |
| PUT /myPackages/toggle-activation/:id | PATCH /packages/:packageId/toggle | Owner                                |
| POST /myPackages/copy/:id             | POST /packages/:packageId/copy    | public packages only (service check) |

### Words + import (`words.controller.ts`, `import.controller.ts`)

| Express                              | NestJS                                      | Notes                                                                                                             |
| ------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| GET /monVocabs?package=X             | GET /packages/:packageId/words              | Read                                                                                                              |
| GET /monVocabs/learn?package=X       | GET /packages/:packageId/words/review       | Owner; due words                                                                                                  |
| POST /monVocabs/add?package=X        | POST /packages/:packageId/words             | Owner; `CreateWordDto[]` (≤ 500, body ≤ 6 MB); ≥ 3 words queued when RabbitMQ and Redis are up (`{async, jobId}`) |
| POST /monVocabs/add/import?package=X | POST /packages/:packageId/import            | Owner; multipart `file`; queued when RabbitMQ and Redis are up                                                    |
| POST /monVocabs/edit/:id?package=X   | PATCH /packages/:packageId/words/:detailId  | Owner                                                                                                             |
| POST /monVocabs/delete/:id?package=X | DELETE /packages/:packageId/words/:detailId | Owner                                                                                                             |
| POST /monVocabs/deleteAll?package=X  | DELETE /packages/:packageId/words           | Owner                                                                                                             |

### Games (`games.controller.ts`)

| Express                                                                              | NestJS                                | Notes                                                                                                                |
| ------------------------------------------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GET /games/:gameType?package=X                                                       | —                                     | page: Next.js `/games/<game>?package=X`                                                                              |
| GET /games/flashMatch/cards, /vocabQuiz/questions, /wordScramble/words, … ?package=X | GET /games/:gameType/data?packageId=X | Owner; `gameType` = flash_match, vocab_quiz, test_pronun, word_scramble, phrase_completion, speed_vocab, word_search |
| POST /games/score                                                                    | POST /games/score                     |                                                                                                                      |
| —                                                                                    | GET /games/scores                     | user's best scores                                                                                                   |

### Level progress + streak (`learning.controller.ts`)

| Express                    | NestJS                              | Notes                       |
| -------------------------- | ----------------------------------- | --------------------------- |
| POST /level-progress/track | POST /learning/level-progress/track | Owner (`packageId` in body) |
| GET /level-progress/status | GET /learning/level-progress        |                             |
| POST /level-progress/reset | POST /learning/level-progress/reset |                             |
| POST /update-streak        | POST /learning/streak               |                             |

### Other

| Express                  | NestJS               | Notes                                                                      |
| ------------------------ | -------------------- | -------------------------------------------------------------------------- |
| GET /health              | GET /health          | not throttled                                                              |
| GET /health/deps         | GET /health/deps     | CronSecretGuard; default limit                                             |
| POST /api/reminder       | POST /api/reminder   | CronSecretGuard (scheduler)                                                |
| POST /api/testEmail      | POST /reminder/test  | JWT; reminder email to the user's own address                              |
| POST /api/tts/generate   | POST /tts/generate   | binary (audio/mpeg)                                                        |
| GET /api/jobs/active     | GET /jobs            | user's active jobs                                                         |
| GET /api/jobs/:id        | GET /jobs/:id        | job owner only; not throttled                                              |
| GET /api/jobs/:id/stream | GET /jobs/:id/stream | SSE; job owner only; ends when the job finishes or after the job TTL (1 h) |
| POST /feedback           | POST /feedback       |                                                                            |

Swagger UI at `/api/docs` in development only (off in staging and production).

---

## 7. Security Checklist

Routes that write, or read package data, with their security layers (Global = 100/min default):

| #   | NestJS endpoint                                          | Auth                                       | Rate Limit    | Validation                                                                         | Ownership                 |
| --- | -------------------------------------------------------- | ------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| 1   | POST /auth/login                                         | SameOriginGuard                            | 10 / 15 min   | LoginDto                                                                           | —                         |
| 2   | POST /auth/register                                      | SameOriginGuard                            | 5 / 15 min    | RegisterDto                                                                        | —                         |
| 3   | POST /auth/forgot-password                               | —                                          | 3 / h         | ForgotPasswordDto                                                                  | —                         |
| 4   | POST /auth/reset-password                                | —                                          | 10 / 15 min   | ResetPasswordDto                                                                   | —                         |
| 5   | POST /packages/:packageId/words                          | JwtAuthGuard                               | Global        | `ParseArrayPipe` CreateWordDto[] (≤ 500, unknown properties rejected, body ≤ 6 MB) | **PackageOwnershipGuard** |
| 6   | POST /packages/:packageId/import                         | JwtAuthGuard                               | Global        | file .xlsx/.xls ≤ 5 MB, rows checked                                               | **PackageOwnershipGuard** |
| 7   | DELETE /packages/:packageId/words                        | JwtAuthGuard                               | Global        | ParseIntPipe                                                                       | **PackageOwnershipGuard** |
| 8   | DELETE /packages/:packageId/words/:detailId              | JwtAuthGuard                               | Global        | ParseIntPipe                                                                       | **PackageOwnershipGuard** |
| 9   | PATCH /packages/:packageId/words/:detailId               | JwtAuthGuard                               | Global        | UpdateWordDto                                                                      | **PackageOwnershipGuard** |
| 10  | PATCH /account/profile                                   | JwtAuthGuard                               | 10 / 15 min   | UpdateProfileDto                                                                   | own user                  |
| 11  | POST /auth/verify-email                                  | —                                          | Global        | VerifyEmailDto                                                                     | token                     |
| 12  | POST /feedback                                           | —                                          | 5 / h         | CreateFeedbackDto                                                                  | —                         |
| 13  | POST /packages                                           | JwtAuthGuard                               | Global        | CreatePackageDto                                                                   | —                         |
| 14  | DELETE /packages/:packageId                              | JwtAuthGuard                               | Global        | ParseIntPipe                                                                       | **PackageOwnershipGuard** |
| 15  | PATCH /packages/:packageId                               | JwtAuthGuard                               | Global        | UpdatePackageDto                                                                   | **PackageOwnershipGuard** |
| 16  | PATCH /packages/:packageId/toggle                        | JwtAuthGuard                               | Global        | ParseIntPipe                                                                       | **PackageOwnershipGuard** |
| 17  | POST /packages/:packageId/copy                           | JwtAuthGuard                               | 20 / h        | ParseIntPipe                                                                       | — (public only)           |
| 18  | POST /api/reminder                                       | CronSecretGuard                            | 3 / h         | —                                                                                  | —                         |
| 19  | POST /reminder/test                                      | JwtAuthGuard                               | 3 / h         | —                                                                                  | own address               |
| 20  | POST /tts/generate                                       | JwtAuthGuard                               | 30 / min      | GenerateAudioDto                                                                   | —                         |
| 21  | POST /games/score                                        | JwtAuthGuard                               | Global        | SaveScoreDto                                                                       | own user                  |
| 22  | POST /learning/level-progress/track                      | JwtAuthGuard                               | Global        | TrackGameDto                                                                       | **PackageOwnershipGuard** |
| 23  | POST /learning/level-progress/reset                      | JwtAuthGuard                               | Global        | ResetLevelDto                                                                      | own user                  |
| 24  | POST /learning/streak                                    | JwtAuthGuard                               | Global        | —                                                                                  | own user                  |
| 25  | GET /games/:gameType/data?packageId=                     | JwtAuthGuard                               | Global        | ParseGameTypePipe, ParseIntPipe                                                    | **PackageOwnershipGuard** |
| 26  | GET /packages/:packageId, GET /packages/:packageId/words | JwtAuthGuard                               | Global        | ParseIntPipe                                                                       | **PackageReadGuard**      |
| 27  | GET /packages/:packageId/words/review                    | JwtAuthGuard                               | Global        | ParseIntPipe                                                                       | **PackageOwnershipGuard** |
| 28  | GET /jobs/:id, GET /jobs/:id/stream                      | JwtAuthGuard                               | none / Global | —                                                                                  | job `meta.userId`         |
| 29  | GET /health/deps                                         | CronSecretGuard                            | Global        | —                                                                                  | —                         |
| 30  | POST /auth/resend-verification                           | —                                          | 3 / h         | ResendVerificationDto                                                              | — (generic answer)        |
| 31  | POST /auth/refresh, POST /auth/logout                    | SameOriginGuard (+ JwtAuthGuard on logout) | Global        | refresh cookie                                                                     | own session               |

All package guards are owner-only (no Admin bypass); a `packageId` that is not a positive integer is
a 400, one that differs between path, query and body a 403.

---

## 8. Frontend Decomposition

22 vanilla JS files (~11 200 lines) → App Router pages + 92 `.tsx` components + 63 `.ts` hooks/helpers
in `components/` (tests excluded; `apps/web/src` overall: 143 `.tsx` + 99 `.ts`, `test-utils/` included):

### Pages (`apps/web/src/app`)

```
app/
├── layout.tsx, globals.css         # root layout, providers, global CSS
├── page.tsx                        # Home (components/home/)
├── about/  feedback/  terms/       # public pages
├── (auth)/                         # login, register, forgot-password, reset-password, verify-email
└── (protected)/layout.tsx          # AuthGuard
    ├── dashboard/                  # from dashboard.js (581 lines)
    ├── packages/                   # from myPackages.js (815)
    ├── words/  words/add/          # from vocabs.js (1138), addWord.js (918)
    ├── learn/                      # flashcards, from learnVocabs.js (710)
    └── games/                      # hub + flash-match, vocab-quiz, test-pronun, word-scramble,
                                    #   phrase-completion, speed-vocab, word-search
```

Most page folders have a `layout.tsx` that only sets the page `metadata`.

### Components (`apps/web/src/components`)

```
components/
├── layout/      Header, Footer
├── auth/        AuthGuard, AuthDecor
├── home/        Hero, Showcase, Stats, Cta sections, WordCard, MouseGlow
├── about/       SocialClock
├── dashboard/   ProfileCard, StatsCard, StreakSection, PackagesToReview, AvatarModal, … + use-* hooks
├── packages/    PackageCard, PackageModal, DeleteModal, Packages{StatsBar,Toolbar,FilterTabs,Grid} + use-* hooks
├── words/       WordRow, WordCardForm, MultiWordForm, ImportForm, DeleteAllModal, Words{Toolbar,Search,LevelTable,EmptyState}, … + use-* hooks
├── learn/       LearnSession, Flashcard, KnowledgeButtons, LearnProgress, … + use-* hooks
├── jobs/        JobWatcher + use-job-subscription, use-resume-active-jobs, job-messages
├── games/       shared GameStats, GameFooter, GameDataStatus, PlayAgainActions, TrackLevelMessage,
│                use-game-shell, use-countdown-timer, use-level-tracking, use-celebration,
│                level-progress (PASS_RULES); one folder per game (Board, Rules, Summary, effects,
│                pure generators, scoring.ts)
└── ErrorPanel.tsx, RouteNotFound.tsx   # used by app/not-found, error, global-error
```

### Hooks and state

```
hooks/      use-auth, use-packages, use-words (incl. useReviewWords), use-import, use-games, use-learning,
            use-dashboard, use-feedback (React Query), use-timeouts, use-unmount-signal, use-is-client,
            use-package-id-param, use-dialog (modal Escape + focus), use-leave-confirmation
lib/        api.ts (Axios + Bearer + refresh interceptor), restore-session.ts (startup refresh),
            api-error.ts, notify.ts, query-keys.ts, job-watcher.ts (Zustand) +
            active-jobs.ts (localStorage) + job-stream.ts (SSE via fetch-event-source), css-module.ts (cx),
            safe-redirect.ts, word-type.ts, shuffle.ts, bold-markup.ts, tts.ts
stores/     auth.store.ts (Zustand: user + access token in memory)
providers/  QueryProvider, ThemeProvider (next-themes), AuthInitializer, JobWatcher, Toaster
```

---

## 9. CI/CD Pipeline

The original YAML sketch is obsolete. Source of truth: `.github/workflows/ci-cd.yml` and
`.github/workflows/e2e.yml`; setup (environments, secrets, variables) in `docs/railway-setup.md`.

- **PR + push** (`main`, `staging`, `develop`): `npm ci` → `npm audit --omit=dev` (critical) →
  `turbo lint` (after `db:generate`, i.e. `prisma generate`, in the turbo graph) → `turbo test` → `turbo build` (`.turbo/cache` kept with
  `actions/cache`)
- **Migrations check** (same triggers, job `migrations-check`): MySQL 8 service, empty database →
  `prisma migrate deploy` → `prisma migrate diff --from-migrations … --to-schema-datamodel …
--exit-code`: fails when `schema.prisma` has changes no migration contains
- **Push `main` / `staging`** (needs both jobs above): matrix build of the `api` and `web` images,
  plus `backup` on `main` (buildx GHA cache scoped per image) → GHCR
  (`:sha-<commit>` only, never overwritten: an existing one is reused, so production runs the
  images built on staging), `GIT_SHA` build arg; Trivy (pinned by digest) scans the image before
  it is pushed (`--ignore-unfixed`): lists CRITICAL + HIGH, fails the job (so no push, no deploy)
  on CRITICAL only. A commit of `main` that is on `staging` needs E2E Staging green first. Pull
  requests build and scan the three images, without pushing
- **Deploy** (`deploy.yml`, GitHub environment `production` / `staging`, one at a time per
  environment): points `:latest` / `:staging` at the commit's images, then `railway redeploy` (CLI
  pinned) of the API → poll `/health` until `version` equals the commit → web (same check) →
  worker and scheduler (their Redis heartbeat, listed by the API's `/health` under `processes`) →
  backup cron in production. Fails before changing anything when a setting (`RAILWAY_TOKEN`,
  `API_URL`, a service ID…) is unset. On a failure, cancel or timeout the tag goes back to the
  previous images (not for a rollback). `rollback.yml` checks the commit is on the branch, then
  runs the same workflow
- **E2E** (`e2e.yml`, after each staging deploy via `workflow_call`, or `workflow_dispatch`):
  Playwright against the environment URL; protected-page specs only when `E2E_USERNAME` / `E2E_PASSWORD` are set.
  After a deploy it checks the web app and the API run the commit before and after the tests

---

## 10. Phase 0 Plan ✅ DONE

### ⚠️ CRITICAL RULE: NO DELETE OLD CODE

- src/ folder MUST remain untouched throughout all phases
- Old code is the reference for migration — never delete, only read
- If old and new code coexist in the same file → comment out old code, do NOT delete
- Deletion of src/ only happens AFTER Phase 6 complete + production verified

### Steps

```
1. Init Turborepo monorepo
   → verify: turbo.json exists, 3 workspaces detected
   → verify: src/ (old Express app) still intact and untouched

2. Create apps/api (NestJS)
   → verify: nest new api, npm run start:dev works

3. Create apps/web (Next.js, now 16)
   → verify: npx create-next-app web, npm run dev works

4. Create packages/shared
   → verify: types/constants importable from both apps

5. Setup Prisma
   → verify: prisma db pull → schema.prisma matches current DB

6. Setup Docker Compose (dev)
   → verify: docker compose up → MySQL + Redis + RabbitMQ healthy

7. Setup OpenAPI/Swagger
   → verify: @nestjs/swagger installed, Swagger UI at /api/docs
   → verify: all future endpoints MUST have @ApiTags, @ApiOperation, @ApiResponse

8. Setup ESLint + Prettier + Husky
   → verify: turbo lint passes on all workspaces

9. Verify everything builds
   → verify: turbo build succeeds
```

### Database Migration Strategy

```
1. prisma db pull                → introspect existing MySQL schema
2. Manually adjust schema.prisma → add enums, relations, @@map
3. prisma migrate diff           → create baseline migration
4. prisma migrate resolve --applied "001_baseline"
5. Future changes via prisma migrate dev
```

---

## Spaced Repetition Rules

Summary only: the full rules as implemented are in `BUSINESS_RULES.md`.

```
Levels: x → 0 → 1 → 2 → v
Intervals: 0, 2, 4, 10, 20 days

Games per level:
  x: flash_match, vocab_quiz, test_pronun (3 games)
  0: word_scramble, phrase_completion (2 games)
  1: speed_vocab (1 game)
  2: word_search (1 game)

Level promotion: ALL games for that level must be completed.
```

---

## IDOR Vulnerability Map (Must Fix)

```
17 endpoints vulnerable (13 no check + 4 partial):

NO CHECK:
  GET  /monVocabs?package=X           (READ words)
  GET  /monVocabs/learn?package=X     (READ words)
  POST /monVocabs/add?package=X       (WRITE words)
  POST /monVocabs/add/import?package=X (WRITE words)
  POST /monVocabs/deleteAll?package=X  (DELETE ALL!)
  GET  /games/*/...?package=X         (READ — 7 endpoints)
  POST /level-progress/track?package=X (WRITE levels!)

PARTIAL CHECK (word↔pkg but NOT pkg↔user):
  POST /monVocabs/delete/:id?package=X
  GET  /monVocabs/edit/:id?package=X
  POST /monVocabs/edit/:id?package=X
  GET  /games/:type?package=X

CORRECT (PackageController only):
  POST /myPackages (5 endpoints) ✅
```

**Solution: PackageOwnershipGuard (writes, games, review) / PackageReadGuard (reads) on every package-id route (#81).**

---

## 11. Phase 1 Plan — Database + Health ✅ DONE

> **Branch:** `feature/phase-1-prisma` → merged into `develop`

### What was done

1. Prisma introspect (`prisma db pull`) → 8 models, 6 enums
2. Fixed `learning_level` enum: `level_0 @map("0")`, `level_1 @map("1")`, `level_2 @map("2")`
3. Baseline migration (`001_baseline/migration.sql`) resolved as applied
4. Global `PrismaModule` (@Global) with `PrismaService` (onModuleInit + onModuleDestroy)
5. `HealthController` — GET /health with proper HTTP 503 when DB down
6. Swagger documented on health endpoint

### Files created

```
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/001_baseline/migration.sql
apps/api/src/prisma/prisma.service.ts
apps/api/src/prisma/prisma.module.ts
apps/api/src/health/health.controller.ts
apps/api/src/health/health.module.ts
```

### Audits: 4 rounds, issues found & fixed

- HealthController always returned 200 → fixed with @Res() + proper status code
- AppController Swagger misleading → fixed tag/summary
- prisma in dependencies → moved to devDependencies (since moved back: the API image runs
  `prisma migrate deploy` at startup)
- tsbuildinfo tracked by git → added to .gitignore

---

## 12. Phase 2 Plan — Auth + Core Guards ✅ DONE

> **Branch:** `feature/phase-2-auth` → merged into `develop`

### What was done

| Step | Content                                                                                                           |
| ---- | ----------------------------------------------------------------------------------------------------------------- |
| 1    | AuthModule skeleton + JwtModule.registerAsync + JwtStrategy + JwtRefreshStrategy + ValidationPipe + cookie-parser |
| 2    | AuthService (register, login, refreshTokens, getMe) + RegisterDto + LoginDto (class-validator + Swagger)          |
| 3    | JwtAuthGuard + JwtRefreshGuard + RolesGuard + @CurrentUser decorator + @Roles decorator                           |
| 4    | AuthController — 5 endpoints: POST register/login/refresh/logout + GET me                                         |
| 5    | PackageOwnershipGuard (IDOR fix; its Admin bypass was removed later: owner-only, as the old app)                  |
| 6    | Verify + 3 rounds audit                                                                                           |

### Files created (14 files, +764 lines)

```
apps/api/src/auth/
├── auth.module.ts
├── auth.service.ts
├── auth.controller.ts
├── dto/
│   ├── login.dto.ts
│   └── register.dto.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── jwt-refresh.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── jwt-refresh.guard.ts
│   ├── roles.guard.ts
│   └── package-ownership.guard.ts
└── decorators/
    ├── current-user.decorator.ts
    └── roles.decorator.ts
```

### Key decisions

- class-validator (not Zod) for DTOs
- Google OAuth deferred to later phase
- Refresh token in httpOnly cookie (path: /auth, sameSite: strict, secure in prod)
- Access token 15m (Bearer header), Refresh token 7d

### Audits: 3 rounds, 5 issues found & fixed

1. `generateTokens` used `string` instead of `users_role` enum
2. `COOKIE_OPTIONS.secure` used `process.env` at import time → switched to ConfigService getter
3. Race condition on register → catch Prisma P2002
4. PackageOwnershipGuard missing Admin bypass (added then, removed since: the old app had no Admin
   rights, guards are owner-only and the specs assert Admin is rejected)
5. Duplicate `@prisma/client` import

Since replaced: `JwtRefreshStrategy` / `JwtRefreshGuard` by opaque refresh sessions (`SessionService`,
#49); `AuthService` split into `TokenService`, `EmailVerificationService`, `PasswordResetService`,
`GoogleAuthService` + `create-user.ts`; `RolesGuard` / `@Roles` removed (never used).

---

## 13. Phase 3 Plan — Business Modules ✅ DONE

> **Branch:** `feature/phase-3-business-modules` → merged into `develop`
> **Stats:** 13 commits, 22 files, +1401 lines, 7 audit rounds, 9 issues fixed

### Goal

Migrate all business logic from Express controllers/models to NestJS modules using Prisma.

### Steps

```
Step 1: PackagesModule — DTOs + Service + Controller
  Source: PackageController.js + packages.js
  Endpoints:
    GET    /packages              — user's packages (JwtAuthGuard)
    GET    /packages/public       — public + protected packages
    GET    /packages/:packageId   — one package (JwtAuthGuard + PackageReadGuard, added later)
    POST   /packages              — create package (JwtAuthGuard)
    PATCH  /packages/:packageId   — edit package (JwtAuthGuard + PackageOwnershipGuard)
    DELETE /packages/:packageId   — delete package (JwtAuthGuard + PackageOwnershipGuard)
    PATCH  /packages/:packageId/toggle — toggle activation (JwtAuthGuard + PackageOwnershipGuard)
    POST   /packages/:packageId/copy  — copy public package (JwtAuthGuard, no ownership)
  DTOs: CreatePackageDto, UpdatePackageDto, PackageResponseDto
  Fix: #57 (3 non-transactional calls → single `packages.update`, no $transaction needed)
  → verify: 7 endpoints mapped, Swagger documented, turbo build OK

Step 2: WordsModule — DTOs + Service + Controller
  Source: WordController.js + words.js
  Endpoints:
    GET    /packages/:packageId/words           — list words (JwtAuthGuard + PackageReadGuard)
    GET    /packages/:packageId/words/review     — words due today (JwtAuthGuard + PackageOwnershipGuard)
    POST   /packages/:packageId/words           — add words (JwtAuthGuard + PackageOwnershipGuard)
    PATCH  /packages/:packageId/words/:detailId — edit word (JwtAuthGuard + PackageOwnershipGuard)
    DELETE /packages/:packageId/words/:detailId — delete word (JwtAuthGuard + PackageOwnershipGuard)
    DELETE /packages/:packageId/words           — delete all words (JwtAuthGuard + PackageOwnershipGuard)
  DTOs: CreateWordDto, UpdateWordDto, WordResponseDto
  Fix: #46 (package copy shares word_details → clone), #47 (deleteWord orphans), #56 (updateWord missing subject), #63 (sequential inserts → $transaction)
  Note: Batch import via RabbitMQ deferred to Phase 4
  → verify: 6 endpoints mapped, Swagger documented, turbo build OK

Step 3: LearningModule — DTOs + Service + Controller
  Source: LearningController.js + LevelProgressController.js + learning.js + streakService.js
  Endpoints:
    POST /learning/streak                      — check & update streak (JwtAuthGuard)
    POST /learning/level-progress/track        — track game completion (JwtAuthGuard + PackageOwnershipGuard)
    GET  /learning/level-progress              — get level progress (JwtAuthGuard)
    POST /learning/level-progress/reset        — reset level progress (JwtAuthGuard)
  Business logic:
    - Spaced repetition: 5 levels (x→0→1→2→v), intervals (0/2/4/10/20 days)
    - Level promotion: ALL games for level must be completed
    - Streak: daily activity tracking
  DTOs: TrackGameDto, ResetLevelDto
  Note: Level progress stored in Redis (deferred — use in-memory/DB fallback for Phase 3)
  → verify: 4 endpoints mapped, spaced repetition logic correct, Swagger documented

Step 4: GamesModule — DTOs + Service + Controller
  Source: GameController.js + game_scores.js + 7 game controllers
  Endpoints:
    GET  /games/:gameType/data?packageId=X    — get words for game (JwtAuthGuard + PackageOwnershipGuard)
    POST /games/score                          — save score (JwtAuthGuard)
    GET  /games/scores                         — get user's best scores (JwtAuthGuard)
  Business logic:
    - 7 game types, each mapped to a level
    - Words fetched by level + spaced repetition interval
    - Score upsert with GREATEST (atomic)
    - 1 GamesService (not 7 controllers — logic is shared, only word fetching differs)
  DTOs: SaveScoreDto, GameDataResponseDto
  Fix: #62 (saveScore redundant query → single upsert), #79 (VocabQuiz O(n²))
  → verify: 3 endpoints mapped, 7 game types supported, Swagger documented

Step 5: Verify + Audit
  → verify: all 20 business endpoints work
  → verify: turbo build succeeds
  → verify: TypeScript zero errors
  → verify: Swagger UI shows all endpoints
  → audit: at least 2 rounds
```

### URL convention change

No global `/api` prefix (only the cron `POST /api/reminder`). Words and games nested under packages for natural ownership:

- `/packages/:packageId/words` (not `/words?package=X`)
- `/games/:gameType/data?packageId=X` (query param because game is top-level)

---

## 14. Phase 4 Plan — Workers + Queues

> **Branch:** `feature/phase-4-workers` (from `develop`)

### Steps

```
Step 1: RabbitmqModule — connection + channel management
  Source: rabbitmq.js
  - Auto-reconnect after a fixed 5 s delay, on connection loss and on an unexpected channel close
  - Topology declared by every process (API and worker) on each new channel (onChannelReady)
  - Separate channels per queue (fix #96)
  - Graceful shutdown (onModuleDestroy)
  → verify: connects to RabbitMQ, auto-reconnects on disconnect

Step 2: RedisModule — connection + cache service
  Source: redis.js + cache.js + cache config
  - CacheService with get/set/del + TTL
  - Centralized CacheKeys constant (fix #61)
  → verify: connects to Redis, get/set/del work

Step 3: EmailModule — SES + email queue
  Source: mailersend.js + emailQueue.js
  - Pre-compiled Handlebars templates (fix #26)
  - Queue consumer in worker process
  → verify: sends email via SES, queue publish/consume works

Step 4: ImportModule — bulk word import queue
  Source: importFile.js + importQueue.js + wordProcessingService.js
  - Publish job when ≥3 words + RabbitMQ ready
  - Worker consumes and processes
  - SSE job tracking endpoint
  → verify: bulk import via queue, SSE stream works

Step 5: Worker + Scheduler entry points
  Source: worker process + scheduler (cron)
  - worker.ts: RabbitMQ consumers (email + import)
  - scheduler.ts: Cron jobs (daily reminder)
  - Same Docker image, different CMD (fix #72, #86)
  → verify: 3 processes start independently

Step 6: Verify + Audit
```

---

## 15. Phase 5 Plan — Frontend Migration

> **Branch:** `feature/phase-5-frontend` (from `develop`)

### Steps

```
Step 1: Layout + Theme + Auth
  - App Router layout (Header, Footer, Sidebar)
  - ThemeProvider (dark mode, cookie-based)
  - useAuth hook (JWT state + Axios interceptor + refresh)
  - Login + Register pages

Step 2: Dashboard + Profile
  - Dashboard page (stats cards, streak, charts)
  - Profile editor + avatar picker

Step 3: Packages
  - Package list (my packages + public)
  - Create/Edit/Delete package
  - Toggle activation, copy public package

Step 4: Words
  - Word list by package (grouped by level)
  - Add word(s) form (single + multiple)
  - Edit word, delete word, delete all
  - Learn/review mode (flashcard UI)
  - Import progress (SSE job tracking)

Step 5: Games (7)
  - FlashMatch, VocabQuiz, WordScramble, SpeedVocab
  - PhraseCompletion, WordSearch, TestPronun
  - Shared game shell + per-game component

Step 6: Remaining pages ✅
  - Games hub page (grid of 7 games)
  - About page (static profile/skills/timeline/contact)
  - Feedback page + POST /feedback endpoint
  - Forgot Password page + POST /auth/forgot-password endpoint (hashed token in DB table
    password_reset_tokens, email queue)
  - Reset Password page + POST /auth/reset-password endpoint (token validation)
  - 3 CSS files (aboutme, feedback, password-reset)
  - Feedback email escaped by Handlebars (`{{ }}` in feedback.hbs); no html-entities dependency

Step 7: Verify + Audit (deferred to post-deploy)
  - Manual testing after turbo dev
  - Playwright E2E tests (Phase 6 or later)
```

---

## 16. Phase 6 Plan — CI/CD + Deploy

> **Branch:** `feature/phase-6-cicd` (from `develop`)
> **Status (Oct 16, 2026):** the first Phase 6 deliverables did not work as merged (images failed to build, `railway.toml` unused). Reworked on `fix/full-project-audit` (b836ea4, d12f2cf, b49783f, eb2b0f5, then the infra/test/docs pass after 3c3764f); the steps below describe the current state.

### Steps

```
Step 1: Merge Phase 5 → develop ✅
  - git merge feature/phase-5-frontend --no-ff
  - 99 files, +44,764 lines, no conflicts

Step 2: GitHub Actions CI ✅ (reworked)
  - .github/workflows/ci-cd.yml (Turborepo monorepo), Node from `.nvmrc`
  - PR + push: npm audit (critical, prod deps) → turbo lint → turbo test → turbo build (each runs
    `db:generate` = prisma generate first, also on a fresh clone)
    (turbo cache via actions/cache)
  - migrations-check job (MySQL 8 service, empty DB): prisma migrate deploy + prisma migrate diff
    --exit-code; required by the image builds
  - Push main/staging: Docker matrix (api + web + backup, buildx cache scope per image) → GHCR
    (:sha-<commit> only; reused when it already exists)
  - GIT_SHA=<commit> build arg (api, web); the web image has no build-time configuration (API_URL at runtime)
  - Trivy scan: aquasec/trivy:0.76.0 pinned by digest, scans the image before the push (no registry
    access, no Docker socket), `--ignore-unfixed`; lists CRITICAL + HIGH (exit-code 0),
    then fails the job on CRITICAL (exit-code 1), which blocks the push and the deploy
  - Deploy (deploy.yml): moves :latest / :staging after approval, then `railway redeploy` per service,
    each waited for until it runs the commit (api and web: /health `version`; worker and scheduler:
    Redis heartbeat shown on the API's /health); backup on prod; skipped when RAILWAY_TOKEN / API_URL are unset
  - turbo.json: "test" + "test:e2e" tasks (BASE_URL, E2E_USERNAME, E2E_PASSWORD)

Step 3: Dockerfiles production ✅ (reworked — first version did not build)
  - apps/api/Dockerfile — turbo prune @sealvo/api --docker → builder (npm ci, prisma generate,
    turbo build) → prod-deps (npm ci --omit=dev) → runner (non-root, openssl, TZ=Europe/Paris,
    GIT_SHA); 1.98 GB → ~580 MB
    Same image for api/worker/scheduler; default CMD = prisma migrate deploy + dist/main.js
    Email templates copied from apps/api/templates (the image no longer needs src/, #6)
  - apps/web/Dockerfile — turbo prune @sealvo/web → build → standalone runner (API_URL read at runtime),
    HEALTHCHECK on GET /health
  - apps/api/Dockerfile.backup — mysqldump + @aws-sdk/client-s3 (backup-db.mjs / restore-db.mjs)
  - docker-compose.prod.yml — project `sealvo-prod`, 7 services + backup (profile "backup"),
    service-network URLs override .env, MySQL bound to 127.0.0.1, RabbitMQ UI not published,
    worker waits for a healthy API, API_URL required; docker-compose.dev.yml = infra only
    (empty MySQL, schema from the Prisma migrations)
  - .dockerignore — nested node_modules / dist / .next / tsbuildinfo
  - next.config.ts: output "standalone"; security headers (CSP, HSTS, Permissions-Policy) set at runtime by src/proxy.ts

Step 4: Railway deploy configuration ✅ (revised)
  - Railway services use GHCR image sources, not the repo → apps/*/railway.toml removed
  - Worker / Scheduler: start command override (node dist/worker.js / dist/scheduler.js), health check disabled
  - Backup: cron set in the Railway dashboard (02:00 UTC), production only
  - docs/railway-setup.md — services, env vars, GitHub environment secrets/vars,
    one-time `prisma migrate resolve --applied 001_baseline` on the existing prod DB, one-time
    `001_baseline` checksum update on staging and production, TZ,
    RAILWAY_TOKEN = project token per Railway environment (GitHub environment secret)
  - docs/local-dev.md — `prisma migrate deploy` on the empty dev DB (baseline resolve / checksum
    update only for volumes created from the old SQL), seed, Playwright

Step 5: Semantic versioning + Changelog ✅
  - @changesets/cli + @changesets/changelog-github
  - .changeset/config.json (baseBranch: main, GitHub changelog)
  - Scripts: changeset, version-packages, release

Step 6: Post-deploy verification 🟡
  - .github/workflows/e2e.yml — called by ci-cd.yml after each actual staging deploy (and on demand,
    `workflow_dispatch`); runs in the target GitHub environment, `contents: read`; a production
    promotion that reuses the staging image needs a green E2E Staging
  - 31 Playwright tests: 26 public (smoke, login, register, auth pages, feedback) + 5 protected
    (dashboard, packages, words list, link to add words, Flash Match start) with the account from prisma/seed.mjs,
    skipped when E2E_USERNAME / E2E_PASSWORD are unset
  - Fails fast when BASE_URL is empty (no silent fallback to production)
  - Post-deploy health check proves the new version is live (`/health` `version`)
  - Production not verified yet → src/ NOT deleted (reference only: no image uses it)
```

---

## 17. Migration Progress Tracker

| Phase           | Description                                               | Branch                             | Status                          | Merged into                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------- | ---------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0**     | Monorepo Init (Turborepo + NestJS + Next.js + Shared)     | `feature/phase-0-monorepo-init`    | ✅ DONE                         | `develop`                                                                                                                                                                                                       |
| **Phase 1**     | Database + Health (Prisma + HealthController)             | `feature/phase-1-prisma`           | ✅ DONE                         | `develop`                                                                                                                                                                                                       |
| **Phase 2**     | Auth + Core Guards (JWT + Guards + Decorators)            | `feature/phase-2-auth`             | ✅ DONE                         | `develop`                                                                                                                                                                                                       |
| **Phase 3**     | Business Modules (Packages + Words + Learning + Games)    | `feature/phase-3-business-modules` | ✅ DONE                         | 13 commits, +1401 lines, 7 audit rounds, 9 issues fixed                                                                                                                                                         |
| **Phase 4**     | Workers + Queues (RabbitMQ + Redis + Email + Import)      | `feature/phase-4-workers`          | ✅ DONE                         | 8 commits, +1838 lines, 7 audit rounds, 8 issues fixed                                                                                                                                                          |
| **Phase 5**     | Frontend Migration (Next.js + React + Tailwind)           | `feature/phase-5-frontend`         | ✅ DONE                         | 9 commits: auth pages, dashboard, packages, vocabs, learn, 7 games, TTS endpoint, remaining pages (about, feedback, forgot/reset password, games hub)                                                           |
| **Phase 6**     | CI/CD + Deploy (GitHub Actions + Docker + GHCR → Railway) | `feature/phase-6-cicd`             | 🟡 DELIVERED, prod not verified | `develop`; reworked on `fix/full-project-audit`: turbo prune images, GHCR image deploy (railway.toml removed), backup image, version-checked deploy, E2E after each staging deploy (31 tests incl. 5 protected) |
| **Audit fixes** | Findings of section 3 (92 ✅ / 0 🟡 / 0 🔲 / 13 ➖)       | `fix/full-project-audit`           | 🟡 IN REVIEW                    | Not merged into `develop`; three audit passes recorded in section 3                                                                                                                                             |
