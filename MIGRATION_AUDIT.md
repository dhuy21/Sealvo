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
7. [Security Checklist (25 endpoints)](#7-security-checklist)
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
- **Frontend**: Vanilla JS (22 files, ~5500 lines), CSS (20 files)
- **DB**: MySQL 8.0 (raw SQL)
- **Cache/Session**: Redis 7 (connect-redis, custom cache module)
- **Queue**: RabbitMQ (amqplib, NOT BullMQ)
- **AI**: Google Gemini (2.5-flash + 2.5-flash-lite)
- **TTS**: Google Cloud Text-to-Speech (Wavenet)
- **Email**: AWS SES via nodemailer
- **Auth**: Session-based (express-session + bcryptjs)
- **Deploy**: Railway (3 services: web, worker, scheduler)

### Target Stack
- **Backend**: NestJS (TypeScript)
- **Frontend**: Next.js 15 App Router + React TypeScript
- **DB**: MySQL 8.0 via Prisma ORM
- **Cache**: Redis (same, via @nestjs/cache-manager or custom)
- **Queue**: RabbitMQ (amqplib direct, NOT @nestjs/microservices transport)
- **Auth**: JWT (access token in memory + refresh token in httpOnly cookie)
- **CSS**: Tailwind CSS + CSS Modules + CSS variables
- **Docs**: OpenAPI 3.0 via @nestjs/swagger (Swagger UI at /api/docs)
- **Monorepo**: Turborepo (apps/api, apps/web, packages/shared)

### Key Decisions
- ✅ Keep RabbitMQ (do NOT replace with BullMQ)
- ✅ Keep 3-process architecture (api, worker, scheduler)
- ✅ Keep level progress in Redis (with increased TTL)
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
│   │   │   ├── auth/           # AuthModule (JWT, Google OAuth)
│   │   │   ├── users/          # UsersModule
│   │   │   ├── packages/       # PackagesModule
│   │   │   ├── words/          # WordsModule
│   │   │   ├── learning/       # LearningModule
│   │   │   ├── games/          # GamesModule (7 services, Strategy pattern)
│   │   │   ├── dashboard/      # DashboardModule
│   │   │   ├── reminder/       # ReminderModule
│   │   │   ├── tts/            # TtsModule
│   │   │   ├── email/          # EmailModule (queue + SES)
│   │   │   ├── import/         # ImportModule (queue + Excel parsing)
│   │   │   ├── health/         # HealthModule (@nestjs/terminus)
│   │   │   ├── common/         # Guards, Pipes, Filters, Interceptors
│   │   │   └── config/         # Configuration, secrets, resilience
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── templates/          # Email Handlebars templates
│   │   ├── Dockerfile
│   │   └── jest.config.ts
│   │
│   └── web/                    # Next.js 15 frontend
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   ├── components/     # React components (~40)
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # API client, utils
│       │   └── styles/         # Tailwind + CSS Modules
│       ├── Dockerfile
│       └── playwright.config.ts
│
├── packages/
│   └── shared/                 # Shared types, constants, utils
│       ├── src/
│       │   ├── types/          # DTOs, enums, interfaces
│       │   ├── constants/      # VALID_LANGS, VALID_TYPES, VALID_LEVELS
│       │   ├── resilience/     # CircuitBreaker, retry, timeout
│       │   └── utils/          # shuffleArray, etc.
│       └── package.json
│
├── scripts/
│   ├── backup-db.ts
│   └── restore-db.ts
│
├── docker-compose.yml
├── turbo.json
├── package.json
└── MIGRATION_AUDIT.md          # This file
```

### NestJS Execution Order

```
Request → Middleware (compression, helmet, morgan, cors)
       → Guards (ThrottlerGuard → JwtAuthGuard → RolesGuard → PackageOwnershipGuard)
       → Interceptors (LoggingInterceptor, TransformInterceptor — before)
       → Pipes (ValidationPipe, SanitizationPipe)
       → Controller method
       → Interceptors (TransformInterceptor — after)
       → Exception Filters (AllExceptionsFilter)
```

### Worker Architecture

```
Same Docker image, different CMD:
  api:       CMD ["node", "dist/main.js"]
  worker:    CMD ["node", "dist/worker.js"]
  scheduler: CMD ["node", "dist/scheduler.js"]
```

---

## 3. All 105 Issues

### Legend
- 🔴🔴🔴 CRITICAL security
- 🔴 HIGH (bugs, data integrity)
- 🟠 MEDIUM (architecture, performance, DRY)
- 🟡 LOW (config, naming, optimization)
- 🟢 INFO (good patterns to preserve, notes)

---

### Round 1-2: Migration Plan Errors (#1-14)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | 🔴 | Plan replaced RabbitMQ with BullMQ | Keep amqplib, use direct RabbitMQ |
| 2 | 🟠 | Only listed 2 package modes (private, public) | Add 'protected' (visible but not copyable) |
| 3 | 🟡 | No CORS configuration in plan | Add CORS in NestJS main.ts |
| 4 | 🟠 | Prisma migration conflicts with existing schema | Use `prisma db pull` → baseline → migrate |
| 5 | 🟠 | importFile.js SRP not addressed | Split into ImportController + ImportService + FileUploadPipe |
| 6 | 🟡 | Email templates location unclear | @nestjs-modules/mailer with Handlebars adapter |
| 7 | 🟠 | Role column not implemented in plan | Add RolesGuard with @Roles('Admin') decorator |
| 8 | 🟡 | Health endpoint has 2 versions (/ and /deps) | Both in HealthModule via @nestjs/terminus |
| 9 | 🔴 | RabbitMQ topology won't work with @nestjs/microservices | Use amqplib directly in RabbitmqService |
| 10 | 🟠 | Docker architecture not redesigned | New docker-compose with 7 services |
| 11 | 🟡 | CSS complexity not addressed | Tailwind + CSS Modules + CSS variables |
| 12 | 🟠 | Worker architecture unclear | Shared codebase, separate entry points |
| 13 | 🟠 | Scheduler architecture unclear | Keep separate process (Celery Beat pattern) |
| 14 | 🟠 | ReminderController placed inside EmailModule | Separate ReminderModule |

### Round 3: Architecture, Bugs, Performance (#15-34)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 15 | 🟠 | ReminderService in wrong module | Create ReminderModule |
| 16 | 🟡 | Game "providers" naming wrong | Rename to services + Strategy pattern |
| 17 | 🟡 | Missing business rules documentation | Create BUSINESS_RULES.md |
| 18 | 🟡 | Missing font/icon strategy | lucide-react + npm packages |
| 19 | 🟡 | CSP nonce handling changes with SPA | Next.js middleware for nonce injection |
| 20 | 🟡 | Multer disk storage unnecessary | Use memoryStorage() |
| 21 | 🟡 | jobWatcher.js localStorage pattern | Custom useJobWatcher React hook |
| 22 | 🔴 | `updateWord` hardcodes subject='Daily' when word base changes | Use correct subject from wordData |
| 23 | 🔴 | GoogleAuthController hardcodes `http://` in redirect URI | Use `${BASE_URL}/auth/google/callback` |
| 24 | 🟡 | Level progress stored only in Redis (TTL 3h) | Keep Redis, increase TTL |
| 25 | 🟠 | GeminiService creates new client per request | Singleton via onModuleInit() |
| 26 | 🟠 | MailersendService reads templates with fs.readFileSync every call | Pre-compile templates at module init |
| 27 | 🟠 | ReminderController N+1 queries (ALL users → words per user → details per word) | Batch queries (2-3 total) |
| 28 | 🟡 | Interval SQL duplicated 5 times in learning.js | Reusable query builder / Prisma scope |
| 29 | 🟠 | Sanitization migration not addressed | Custom SanitizationPipe |
| 30 | 🟠 | RabbitMQ has no auto-reconnect | Auto-reconnect in RabbitmqService |
| 31 | 🟠 | UserModel.updateUserInfo makes 3 separate UPDATEs | Single Prisma update() |
| 32 | 🟡 | CSRF unnecessary with JWT | Remove CSRF entirely |
| 33 | 🟠 | Rate limiting migration incomplete | @nestjs/throttler with Redis store |
| 34 | 🟡 | Health endpoint architecture unclear | @nestjs/terminus with 2 endpoints |

### Round 4: Dead Code, Tests, Frontend, DevOps (#35-45)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 35 | 🟡 | `editVocabs.hbs` referenced in code but file doesn't exist | Don't port dead reference |
| 36 | 🔴 | Google OAuth creates user without `is_verified=true` | Set `is_verified: true` for OAuth users |
| 37 | 🟠 | 52 unit + 5 e2e tests with no migration strategy | Jest + @nestjs/testing + Playwright |
| 38 | 🟠 | 22 JS files (~5500 lines) not 6 as initially estimated | Full decomposition into ~40 React components |
| 39 | 🟡 | theme-init.js FOUC prevention | Cookie-based theme detection in Next.js |
| 40 | 🟡 | /update-streak orphan route (registered on app, not router) | Move into LearningController |
| 41 | 🟡 | Dockerfile.backup missing from migration plan | Add to Docker Compose with backup profile |
| 42 | 🟡 | ImportService naming misleading | Rename to WordProcessingService |
| 43 | 🟡 | addWordSchema is just [packageQuery] — confusing name | Split into PackageQueryDto + CreateWordDto |
| 44 | 🟠 | Dashboard logic in UsersModule (wrong boundary) | Create DashboardModule |
| 45 | 🟠 | Package ownership check duplicated 4 times | PackageOwnershipGuard |

### Round 5: Data Integrity (#46-50)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 46 | 🔴 | Package copy shares word_details via batchStockWords → cross-user data mutation | Clone word_details during copy (new detail_ids) |
| 47 | 🔴 | deleteWord only deletes from learning table → orphaned word_details | Check refs after delete, clean up if zero |
| 48 | 🟠 | User ID generation (7-char hex) has race condition (check-then-insert) | Retry on Prisma P2002 unique constraint violation |
| 49 | 🟠 | JWT implementation details missing from plan | Full flow: access 15min, refresh 7d, rotation, Axios interceptor |
| 50 | 🟠 | Logging strategy missing | NestJS Logger or nestjs-pino |

### Round 6: CI/CD, Security, Config (#51-55)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 51 | 🟠 | CI/CD pipeline needs complete rewrite for monorepo | Turborepo-aware GitHub Actions: turbo lint, turbo test, matrix Docker build |
| 52 | 🟢 | Security matrix (25 endpoints) = perfect migration checklist | Use as validation checklist |
| 53 | 🟡 | ESLint config needs TypeScript ESLint | @typescript-eslint/parser + recommended |
| 54 | 🟡 | Husky + lint-staged needs Turborepo update | Per-app lint-staged patterns |
| 55 | 🟢 | .env.example well-documented (75 lines) | Split into per-app .env files |

### Round 7: DB Schema Bugs, Scripts (#56-60)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 56 | 🔴 | `updateWord` SELECT missing `subject` in WHERE → can link to wrong word_id | Prisma `findUnique` with composite key enforces all 3 fields |
| 57 | 🟠 | `editPackagePost` makes 3 non-transactional DB calls → inconsistent state | Single Prisma `$transaction()` |
| 58 | 🟡 | `intialize.sql` (typo) + `test.sql` have invalid language codes | Don't port; use Prisma seed |
| 59 | 🟠 | Scripts (backup/restore/build/migrate) migration strategy missing | Port backup-db.ts + restore-db.ts; Prisma replaces migrate + build replaced by Next.js |
| 60 | 🟠 | Prisma schema must model shared word pool correctly | Composite unique + correct relations |

### Round 8: Cross-cutting Concerns (#61-65)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 61 | 🟠 | Cache keys fragmented across controllers (no registry) | Centralized CacheKeys constant + CacheInvalidationService |
| 62 | 🟠 | GameScores.saveScore has redundant query + TOCTOU race | Remove pre-query; determine isHighScore from single upsert |
| 63 | 🟠 | saveWords inserts sequentially (100 words = 100 transactions) | Wrap in single Prisma $transaction() |
| 64 | 🟠 | NestJS execution order differs from Express — must document | Map Express middleware → NestJS lifecycle |
| 65 | 🟡 | email_verification.generateToken() recursive without depth limit | Loop with max 5 attempts |

### Round 9: Timezone, API Contract, Degradation (#66-70)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 66 | 🔴 | Timezone mismatch: streakService uses JS local time, MySQL uses UTC | Use UTC consistently: `Date.UTC()`, `process.env.TZ='UTC'` |
| 67 | 🟠 | loginPost stores stats in session (stale immediately) | JWT payload minimal: {sub, username, role}. Stats always via API |
| 68 | 🟡 | API response format inconsistent (4 different formats) | Standardized envelope via TransformInterceptor |
| 69 | 🟠 | 13 render() endpoints → need new API endpoints for Next.js | Create full API endpoint mapping |
| 70 | 🟢 | 3 graceful degradation paths must be preserved | Redis fallback, RabbitMQ fallback, Circuit Breaker |

### Round 10: OAuth, Docker, Validation (#71-75)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 71 | 🔴 | Google OAuth password NOT hashed + missing is_verified | Hash random password + set is_verified=true + add auth_provider column |
| 72 | 🔴 | Dockerfile runs migrations on startup → 3 processes race | Only API runs `prisma migrate deploy`; worker/scheduler skip |
| 73 | 🟡 | Google OAuth duplicates session setup logic | Eliminated by JWT (single AuthService) |
| 74 | 🟠 | addWordSchema doesn't validate body (only query param) | Separate CreateWordDto with class-validator |
| 75 | 🟡 | xlsx dependency loaded from CDN tarball, not npm | Replace with exceljs from npm |

### Round 11: IDOR — Games (#76-80)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 76 | 🔴🔴🔴 | IDOR: 7 game endpoints leak other users' words (no package ownership check) | PackageOwnershipGuard on all ?package= routes |
| 77 | 🟡 | shuffleArray duplicated in 5 game controllers | Shared utility in packages/shared |
| 78 | 🔴🔴🔴 | IDOR: trackGameCompletion can WRITE to other users' data | PackageOwnershipGuard |
| 79 | 🟡 | VocabQuizController O(n²) complexity | Pre-shuffle once, build options linearly |
| 80 | 🔴🔴 | learnVocabs — same IDOR pattern | PackageOwnershipGuard |

### Round 12: Systemic IDOR (#81-85)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 81 | 🔴🔴🔴 | SYSTEMIC IDOR: 13 endpoints NO check + 4 partial check = 17 vulnerable | Global PackageOwnershipGuard |
| 82 | 🔴🔴🔴 | deleteAllWords — zero authorization, deletes ANY package's words | PackageOwnershipGuard |
| 83 | 🔴🔴 | addWordPost — inject words into other users' packages | PackageOwnershipGuard |
| 84 | 🔴 | deleteWord/editWord partial check (word↔pkg but NOT pkg↔user) | Add pkg→user check |
| 85 | 🟡 | findUsersByWordId — misleading name (returns learning row) | Rename to findLearningByDetailId |

### Round 13: Docker, Uploads, Dead Code (#86-90)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 86 | 🟠 | Docker Compose builds same image 3 times | Build once, reference by image name |
| 87 | 🟡 | uploads_data volume unnecessary with memoryStorage | Remove volume, use memoryStorage() |
| 88 | 🟡 | cache.invalidatePattern — exported but never called | Note as dead code; port if needed |
| 89 | 🟡 | secrets.js must add JWT secrets | Add JWT_ACCESS_SECRET, JWT_REFRESH_SECRET |
| 90 | 🟢 | Email template CSS uses hover/transitions — stripped by email clients | Remove animation CSS from email templates |

### Round 14: Test Config, Sanitization (#91-95)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 91 | 🟡 | sanitization.js — JSDOM singleton ~30MB | Use isomorphic-dompurify or sanitize-html |
| 92 | 🟡 | Playwright config needs URL update for monorepo | Point to Next.js frontend URL |
| 93 | 🟡 | Jest config needs restructure for Turborepo | Per-app jest.config.ts with ts-jest |
| 94 | 🟡 | Dockerfile.backup needs Prisma adaptation | Keep mysqldump (independent of Prisma) |
| 95 | 🟢 | CircuitBreaker.getAll() static registry — clean pattern | Port to NestJS health checks |

### Round 15: Concurrency, Express, Pool (#96-100)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 96 | 🟠 | Worker prefetch(1) blocks email during long imports | Separate channels per queue |
| 97 | 🟡 | Express 5 → NestJS uses Express 4 adapter | No real impact (NestJS abstracts Express) |
| 98 | 🟡 | MySQL connection pool sizing for 3 processes | Coordinate pool sizes: api=8, worker=4, scheduler=2 |
| 99 | 🟢 | resilience.js — excellent quality, port as-is | Port to packages/shared/src/resilience/ |
| 100 | 🟢 | TTS lazy client init — good pattern | Preserve via onModuleInit() |

### Round 16: Auth Edge Cases, DRY (#101-105)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 101 | 🟠 | forgotPasswordPost + changePasswordPost — 90% duplicate | Single requestReset(email) service method |
| 102 | 🟡 | EmailVerificationController bypasses setFlash() helper | N/A with JWT/SPA (toast notifications) |
| 103 | 🟡 | resetPass.js — Redis-only, no fallback if Redis down | Store tokens in DB (PasswordResetToken table) |
| 104 | 🟡 | feedbackPost — inline HTML instead of template | Create feedback email template |
| 105 | 🟢 | USER_GMAIL env var — misleading name | Rename to FEEDBACK_RECIPIENT_EMAIL |

---

## 4. Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ── Enums ──────────────────────────────────────────────

enum Role {
  Admin
  User
}

enum AuthProvider {
  LOCAL
  GOOGLE
}

enum PackageMode {
  private
  public
  protected
}

enum WordType {
  noun
  verb
  adjective
  adverb
  ph_v       @map("ph.v")
  idiom
  collocation
}

enum Level {
  x
  zero  @map("0")
  one   @map("1")
  two   @map("2")
  v
}

enum GameType {
  word_scramble
  flash_match
  speed_vocab
  vocab_quiz
  phrase_completion
  word_search
  test_pronun
}

enum VerificationStatus {
  pending
  used
  revoked
}

// ── Models ─────────────────────────────────────────────

model User {
  id               String    @id @db.Char(7)
  username         String    @unique @db.VarChar(255)
  email            String    @unique @db.VarChar(255)
  role             Role      @default(User)
  auth_provider    AuthProvider @default(LOCAL)
  password         String    @db.VarChar(255)
  streak           Int       @default(0)
  streak_updated_at DateTime?
  last_login       DateTime?
  created_at       DateTime? @default(now())
  updated_at       DateTime? @updatedAt
  is_verified      Boolean   @default(false)
  ava              Int       @default(1)

  packages         Package[]
  best_scores      UserBestScore[]
  email_verifications EmailVerification[]
  password_reset_tokens PasswordResetToken[]

  @@index([is_verified, created_at], name: "idx_users_verified_created")
  @@map("users")
}

model EmailVerification {
  id         String             @id @db.Char(64)
  user_id    String             @db.Char(7)
  token_hash String             @db.Char(64)
  expires_at DateTime
  status     VerificationStatus @default(pending)
  created_at DateTime           @default(now())
  used_at    DateTime?

  user       User               @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([token_hash], name: "ux_token_hash")
  @@index([user_id], name: "idx_user_id")
  @@map("email_verification")
}

model PasswordResetToken {
  id         String   @id @default(uuid())
  email      String
  user_id    String   @db.Char(7)
  token_hash String   @unique @db.Char(64)
  expires_at DateTime
  used       Boolean  @default(false)
  created_at DateTime @default(now())

  user       User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([email])
  @@index([expires_at])
  @@map("password_reset_tokens")
}

model Package {
  package_id          Int         @id @default(autoincrement())
  user_id             String      @db.Char(7)
  package_name        String      @db.VarChar(255)
  package_description String?     @db.Text
  created_at          DateTime?   @default(now())
  mode                PackageMode @default(private)
  is_active           Boolean     @default(true)

  user                User        @relation(fields: [user_id], references: [id], onDelete: Cascade)
  learning            Learning[]

  @@index([mode, created_at], name: "idx_packages_mode_created")
  @@map("packages")
}

model Word {
  word_id       Int          @id @default(autoincrement())
  word          String       @db.VarChar(255)
  subject       String       @db.VarChar(255)
  language_code String       @db.VarChar(10)
  created_at    DateTime     @default(now())

  details       WordDetail[]

  @@unique([word, subject, language_code], name: "uq_words_word_subject_lang")
  @@map("words")
}

model WordDetail {
  detail_id     Int        @id @default(autoincrement())
  word_id       Int
  type          WordType
  meaning       String     @db.Text
  pronunciation String?    @db.VarChar(255)
  synonyms      String?    @db.Text
  antonyms      String?    @db.Text
  example       String?    @db.Text
  grammar       String?    @db.Text

  word          Word       @relation(fields: [word_id], references: [word_id], onDelete: Cascade)
  learning      Learning[]

  @@map("word_details")
}

model Learning {
  detail_id      Int
  package_id     Int
  level          Level
  date_memorized DateTime @default(now())
  date_stocked   DateTime @default(now())

  detail         WordDetail @relation(fields: [detail_id], references: [detail_id], onDelete: Cascade)
  package        Package    @relation(fields: [package_id], references: [package_id], onDelete: Cascade)

  @@id([detail_id, package_id])
  @@index([package_id, level, date_memorized], name: "idx_learning_pkg_lvl_date")
  @@map("learning")
}

model UserBestScore {
  user_id       String   @db.Char(7)
  game_type     GameType
  best_score    Int      @default(0)
  play_count    Int      @default(0)
  last_played_at DateTime @default(now())

  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@id([user_id, game_type])
  @@map("user_best_scores")
}
```

---

## 5. Module Dependency Graph

```
AppModule
├── AuthModule (JWT, Google OAuth, Guards)
│   └── UsersModule
├── UsersModule (CRUD, avatar, streak)
├── PackagesModule (CRUD, toggle, copy, mode)
│   └── WordsModule (for copy: clone word_details)
├── WordsModule (CRUD, bulk import)
│   ├── ImportModule (Excel parsing + RabbitMQ queue)
│   └── GeminiModule (AI enrichment)
├── LearningModule (spaced repetition, level progress)
├── GamesModule (7 game services, Strategy pattern)
│   └── LearningModule
├── DashboardModule (stats aggregation)
│   ├── UsersModule
│   ├── LearningModule
│   └── WordsModule
├── ReminderModule (scheduled email reminders)
│   ├── UsersModule
│   ├── LearningModule
│   ├── WordsModule
│   └── EmailModule
├── TtsModule (Google Cloud TTS + caching)
├── EmailModule (AWS SES + RabbitMQ queue)
├── HealthModule (@nestjs/terminus)
├── RabbitmqModule (amqplib connection + channels)
├── RedisModule (connection + cache)
└── CommonModule (Guards, Pipes, Filters, Interceptors)
    ├── PackageOwnershipGuard
    ├── JwtAuthGuard
    ├── RolesGuard
    ├── ThrottlerGuard
    ├── SanitizationPipe
    ├── TransformInterceptor
    └── AllExceptionsFilter
```

**No circular dependencies.**

---

## 6. API Endpoints Mapping

### Authentication (AuthModule)

| Express | NestJS | Method |
|---|---|---|
| POST /login | POST /api/auth/login | JSON (JWT) |
| POST /registre | POST /api/auth/register | JSON |
| GET /logout | POST /api/auth/logout | Clear refresh cookie |
| GET /auth/google | GET /api/auth/google | Redirect |
| GET /auth/google/callback | GET /api/auth/google/callback | JWT |
| GET /auth/verify/:token | GET /api/auth/verify/:token | Redirect |
| POST /login/forgotPassword | POST /api/auth/forgot-password | JSON |
| POST /login/resetPassword | POST /api/auth/reset-password | JSON |
| POST /dashboard/changePassword | POST /api/auth/change-password | JSON |
| — (new) | POST /api/auth/refresh | Refresh token rotation |

### Users (UsersModule / DashboardModule)

| Express | NestJS | Method |
|---|---|---|
| GET /dashboard | GET /api/dashboard/stats | JSON |
| POST /dashboard/edit | PATCH /api/users/profile | JSON |

### Packages (PackagesModule)

| Express | NestJS | Method |
|---|---|---|
| GET /myPackages | GET /api/packages | JSON (user's) |
| — | GET /api/packages/public | JSON (public+protected) |
| POST /myPackages | POST /api/packages | JSON |
| POST /myPackages/delete/:id | DELETE /api/packages/:id | JSON |
| PUT /myPackages/edit/:id | PATCH /api/packages/:id | JSON |
| PUT /myPackages/toggle/:id | PATCH /api/packages/:id/toggle | JSON |
| POST /myPackages/copy/:id | POST /api/packages/:id/copy | JSON |

### Words (WordsModule)

| Express | NestJS | Method |
|---|---|---|
| GET /monVocabs?package=X | GET /api/words?package=X | JSON |
| GET /monVocabs/learn?package=X | GET /api/words/review?package=X | JSON |
| POST /monVocabs/add?package=X | POST /api/words?package=X | JSON |
| POST /monVocabs/add/import?package=X | POST /api/words/import?package=X | JSON (multipart) |
| POST /monVocabs/delete/:id?package=X | DELETE /api/words/:id?package=X | JSON |
| POST /monVocabs/deleteAll?package=X | DELETE /api/words?package=X | JSON |
| POST /monVocabs/edit/:id?package=X | PATCH /api/words/:id?package=X | JSON |

### Games (GamesModule)

| Express | NestJS | Method |
|---|---|---|
| GET /games/:type?package=X | GET /api/games/:type/init?package=X | JSON |
| GET /games/flashMatch/cards?package=X | GET /api/games/flash-match/data?package=X | JSON |
| GET /games/vocabQuiz/question?package=X | GET /api/games/vocab-quiz/data?package=X | JSON |
| (etc. for all 7 games) | GET /api/games/:type/data?package=X | JSON |
| POST /games/score | POST /api/games/score | JSON |

### Level Progress (LearningModule)

| Express | NestJS | Method |
|---|---|---|
| POST /level-progress/track | POST /api/learning/level-progress/track | JSON |
| GET /level-progress | GET /api/learning/level-progress | JSON |
| POST /level-progress/reset | POST /api/learning/level-progress/reset | JSON |
| POST /update-streak | POST /api/learning/streak | JSON |

### Other

| Express | NestJS | Method |
|---|---|---|
| GET /health | GET /api/health | JSON |
| GET /health/deps | GET /api/health/deps | JSON (CronSecretGuard) |
| POST /api/reminder | POST /api/system/reminder | JSON (CronSecretGuard) |
| POST /api/testEmail | POST /api/system/test-email | JSON |
| POST /api/tts/generate | POST /api/tts/generate | Binary (audio/mpeg) |
| GET /api/jobs/active | GET /api/jobs/active | JSON |
| GET /api/jobs/:id | GET /api/jobs/:id | JSON |
| GET /api/jobs/:id/stream | GET /api/jobs/:id/stream | SSE |
| POST /feedback | POST /api/feedback | JSON |

---

## 7. Security Checklist

All 25 current endpoints mapped to NestJS equivalents with security layers:

| # | NestJS endpoint | Auth | Rate Limit | Validation | Ownership |
|---|---|---|---|---|---|
| 1 | POST /auth/login | — | @Throttle(10, 900) | LoginDto | — |
| 2 | POST /auth/register | — | @Throttle(5, 900) | RegisterDto | — |
| 3 | POST /auth/forgot-password | — | @Throttle(3, 3600) | ForgotPasswordDto | — |
| 4 | POST /auth/reset-password | — | @Throttle(10, 900) | ResetPasswordDto | — |
| 5 | POST /words | JwtGuard | Global | CreateWordDto | **PackageOwnershipGuard** |
| 6 | POST /words/import | JwtGuard | Global | FileUpload | **PackageOwnershipGuard** |
| 7 | DELETE /words | JwtGuard | Global | PackageQueryDto | **PackageOwnershipGuard** |
| 8 | DELETE /words/:id | JwtGuard | Global | WordIdParam | **PackageOwnershipGuard** |
| 9 | PATCH /words/:id | JwtGuard | Global | EditWordDto | **PackageOwnershipGuard** |
| 10 | PATCH /users/profile | JwtGuard | Global | UpdateProfileDto | — |
| 11 | POST /auth/change-password | JwtGuard | @Throttle(3, 3600) | — | — |
| 12 | POST /feedback | — | @Throttle(5, 3600) | FeedbackDto | — |
| 13 | POST /packages | JwtGuard | Global | CreatePackageDto | — |
| 14 | DELETE /packages/:id | JwtGuard | Global | PackageIdParam | **PackageOwnershipGuard** |
| 15 | PATCH /packages/:id | JwtGuard | Global | EditPackageDto | **PackageOwnershipGuard** |
| 16 | PATCH /packages/:id/toggle | JwtGuard | Global | PackageIdParam | **PackageOwnershipGuard** |
| 17 | POST /packages/:id/copy | JwtGuard | Global | PackageIdParam | — (public only) |
| 18 | POST /system/reminder | CronSecretGuard | @Throttle(3, 3600) | — | — |
| 19 | POST /system/test-email | JwtGuard | @Throttle(3, 3600) | — | — |
| 20 | POST /tts/generate | JwtGuard | @Throttle(30, 60) | TtsGenerateDto | — |
| 21 | POST /games/score | JwtGuard | Global | SaveScoreDto | — |
| 22 | POST /learning/level-progress/track | JwtGuard | Global | TrackGameDto | **PackageOwnershipGuard** |
| 23 | POST /learning/level-progress/reset | JwtGuard | Global | ResetLevelDto | — |
| 24 | POST /learning/streak | JwtGuard | Global | — | — |
| 25 | GET /games/:type/data | JwtGuard | Global | GameTypeParam | **PackageOwnershipGuard** |

---

## 8. Frontend Decomposition

22 vanilla JS files → ~40 React components + hooks:

### Pages (Next.js App Router)

```
app/
├── page.tsx                    # Home (from home.js: 220 lines)
├── login/page.tsx              # Login
├── register/page.tsx           # Register
├── forgot-password/page.tsx    # Forgot password
├── reset-password/page.tsx     # Reset password
├── about/page.tsx              # About me
├── feedback/page.tsx           # Feedback
├── dashboard/page.tsx          # Dashboard (from dashboard.js: 580 lines)
├── packages/page.tsx           # My Packages (from myPackages.js: 815 lines)
├── vocabs/
│   ├── page.tsx                # Word list (from vocabs.js: 1138 lines)
│   ├── add/page.tsx            # Add words (from addWord.js: 920 lines)
│   └── learn/page.tsx          # Flashcard learning (from learnVocabs.js: 710 lines)
└── games/
    └── [type]/page.tsx         # 7 games (from 7 game JS files)
```

### Shared Components

```
components/
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   └── ThemeProvider.tsx
├── ui/
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   ├── LoadingSpinner.tsx
│   └── ConfirmDialog.tsx
├── forms/
│   ├── WordForm.tsx
│   ├── PackageForm.tsx
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
├── words/
│   ├── WordCard.tsx
│   ├── WordList.tsx
│   ├── WordEditor.tsx
│   └── ImportProgress.tsx
├── packages/
│   ├── PackageCard.tsx
│   ├── PackageGrid.tsx
│   └── PublicPackages.tsx
├── games/
│   ├── FlashMatch.tsx
│   ├── VocabQuiz.tsx
│   ├── WordScramble.tsx
│   ├── SpeedVocab.tsx
│   ├── PhraseCompletion.tsx
│   ├── WordSearch.tsx
│   └── TestPronun.tsx
└── dashboard/
    ├── StatsCards.tsx
    ├── StreakDisplay.tsx
    ├── ProfileEditor.tsx
    └── AvatarPicker.tsx
```

### Hooks

```
hooks/
├── useAuth.ts              # JWT auth state + refresh
├── useApi.ts               # Axios instance with interceptor
├── useJobWatcher.ts        # SSE job tracking
├── useTheme.ts             # Dark mode
├── useDebounce.ts
└── useInfiniteScroll.ts
```

---

## 9. CI/CD Pipeline

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches: [main, staging, dev, 'feature/**']
  pull_request:
    branches: [main, staging, dev]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx turbo lint
      - run: npx turbo test
      - run: npm audit --audit-level=critical --omit=dev

  docker-build:
    needs: lint-test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    strategy:
      matrix:
        app: [api, web]
    steps:
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ./apps/${{ matrix.app }}/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/${{ matrix.app }}:${{ github.sha }}
      - name: Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ github.repository }}/${{ matrix.app }}:${{ github.sha }}

  deploy-production:
    needs: docker-build
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npx @railway/cli redeploy --service $API_SERVICE_ID --yes
      - run: | # Health check
          for i in 1 2 3 4 5; do
            curl -sf $API_URL/health && exit 0; sleep 15
          done; exit 1
      - run: npx @railway/cli redeploy --service $WORKER_SERVICE_ID --yes
      - run: npx @railway/cli redeploy --service $SCHEDULER_SERVICE_ID --yes
      - run: npx @railway/cli redeploy --service $WEB_SERVICE_ID --yes

  e2e:
    needs: deploy-production
    steps:
      - run: npx playwright test
        env:
          BASE_URL: https://www.sealvo.it.com
```

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

3. Create apps/web (Next.js 15)
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

**Solution: PackageOwnershipGuard applied globally.**

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
- prisma in dependencies → moved to devDependencies
- tsbuildinfo tracked by git → added to .gitignore

---

## 12. Phase 2 Plan — Auth + Core Guards ✅ DONE

> **Branch:** `feature/phase-2-auth` → merged into `develop`

### What was done

| Step | Content |
|---|---|
| 1 | AuthModule skeleton + JwtModule.registerAsync + JwtStrategy + JwtRefreshStrategy + ValidationPipe + cookie-parser |
| 2 | AuthService (register, login, refreshTokens, getMe) + RegisterDto + LoginDto (class-validator + Swagger) |
| 3 | JwtAuthGuard + JwtRefreshGuard + RolesGuard + @CurrentUser decorator + @Roles decorator |
| 4 | AuthController — 5 endpoints: POST register/login/refresh/logout + GET me |
| 5 | PackageOwnershipGuard (IDOR fix, Admin bypass) |
| 6 | Verify + 3 rounds audit |

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
4. PackageOwnershipGuard missing Admin bypass
5. Duplicate `@prisma/client` import

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
    GET    /api/packages              — user's packages (JwtAuthGuard)
    GET    /api/packages/public       — public + protected packages
    POST   /api/packages              — create package (JwtAuthGuard)
    PATCH  /api/packages/:packageId   — edit package (JwtAuthGuard + PackageOwnershipGuard)
    DELETE /api/packages/:packageId   — delete package (JwtAuthGuard + PackageOwnershipGuard)
    PATCH  /api/packages/:packageId/toggle — toggle activation (JwtAuthGuard + PackageOwnershipGuard)
    POST   /api/packages/:packageId/copy  — copy public package (JwtAuthGuard, no ownership)
  DTOs: CreatePackageDto, UpdatePackageDto, PackageResponseDto
  Fix: #57 (3 non-transactional calls → single Prisma $transaction)
  → verify: 7 endpoints mapped, Swagger documented, turbo build OK

Step 2: WordsModule — DTOs + Service + Controller
  Source: WordController.js + words.js
  Endpoints:
    GET    /api/packages/:packageId/words           — list words (JwtAuthGuard + PackageOwnershipGuard)
    GET    /api/packages/:packageId/words/review     — words due today (JwtAuthGuard + PackageOwnershipGuard)
    POST   /api/packages/:packageId/words           — add words (JwtAuthGuard + PackageOwnershipGuard)
    PATCH  /api/packages/:packageId/words/:detailId — edit word (JwtAuthGuard + PackageOwnershipGuard)
    DELETE /api/packages/:packageId/words/:detailId — delete word (JwtAuthGuard + PackageOwnershipGuard)
    DELETE /api/packages/:packageId/words           — delete all words (JwtAuthGuard + PackageOwnershipGuard)
  DTOs: CreateWordDto, UpdateWordDto, WordResponseDto
  Fix: #46 (package copy shares word_details → clone), #47 (deleteWord orphans), #56 (updateWord missing subject), #63 (sequential inserts → $transaction)
  Note: Batch import via RabbitMQ deferred to Phase 4
  → verify: 6 endpoints mapped, Swagger documented, turbo build OK

Step 3: LearningModule — DTOs + Service + Controller
  Source: LearningController.js + LevelProgressController.js + learning.js + streakService.js
  Endpoints:
    POST /api/learning/streak                      — check & update streak (JwtAuthGuard)
    POST /api/learning/level-progress/track        — track game completion (JwtAuthGuard + PackageOwnershipGuard)
    GET  /api/learning/level-progress              — get level progress (JwtAuthGuard)
    POST /api/learning/level-progress/reset        — reset level progress (JwtAuthGuard)
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
    GET  /api/games/:gameType/data?packageId=X    — get words for game (JwtAuthGuard + PackageOwnershipGuard)
    POST /api/games/score                          — save score (JwtAuthGuard)
    GET  /api/games/scores                         — get user's best scores (JwtAuthGuard)
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
Words and games nested under packages for natural ownership:
- `/api/packages/:packageId/words` (not `/api/words?package=X`)
- `/api/games/:gameType/data?packageId=X` (query param because game is top-level)

---

## 14. Phase 4 Plan — Workers + Queues

> **Branch:** `feature/phase-4-workers` (from `develop`)

### Steps

```
Step 1: RabbitmqModule — connection + channel management
  Source: rabbitmq.js
  - Auto-reconnect with exponential backoff
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
  - Forgot Password page + POST /auth/forgot-password endpoint (Redis token, email queue)
  - Reset Password page + POST /auth/reset-password endpoint (token validation)
  - 3 CSS files (aboutme, feedback, password-reset)
  - html-entities dependency for XSS protection in feedback

Step 7: Verify + Audit (deferred to post-deploy)
  - Manual testing after turbo dev
  - Playwright E2E tests (Phase 6 or later)
```

---

## 16. Phase 6 Plan — CI/CD + Deploy

> **Branch:** `feature/phase-6-cicd` (from `develop`)

### Steps

```
Step 1: Merge Phase 5 → develop ✅
  - git merge feature/phase-5-frontend --no-ff
  - 99 files, +44,764 lines, no conflicts

Step 2: GitHub Actions CI ✅
  - .github/workflows/ci-cd.yml (rewritten for Turborepo monorepo)
  - turbo lint + turbo test on PR
  - npm audit, Node 22
  - Docker build matrix (api + web), Trivy scan
  - Deploy: staging (auto) + production (auto)
  - turbo.json: added "test" task

Step 3: Dockerfiles production ✅
  - apps/api/Dockerfile — 4-stage multi-stage (deps → build → prod-deps → runner)
    Same image for api/worker/scheduler (different CMD)
    API runs prisma migrate deploy on startup
  - apps/web/Dockerfile — 3-stage (deps → build → runner)
    Next.js standalone output
  - docker-compose.prod.yml — 7 services (api, web, worker, scheduler, db, redis, rabbitmq)
  - .dockerignore
  - next.config.ts: added output: "standalone"

Step 4: Railway deploy configuration ✅
  - apps/api/railway.toml + apps/web/railway.toml
  - docs/railway-setup.md — complete setup guide (4 services, env vars, GitHub secrets)

Step 5: Semantic versioning + Changelog ✅
  - @changesets/cli + @changesets/changelog-github
  - .changeset/config.json (baseBranch: main, GitHub changelog)
  - Scripts: changeset, version-packages, release

Step 6: Post-deploy verification ✅
  - .github/workflows/e2e.yml (manual + workflow_call, production/staging)
  - Delete src/ (old code) ONLY after production verified
```

---

## 17. Migration Progress Tracker

| Phase | Description | Branch | Status | Merged into |
|---|---|---|---|---|
| **Phase 0** | Monorepo Init (Turborepo + NestJS + Next.js + Shared) | `feature/phase-0-monorepo-init` | ✅ DONE | `develop` |
| **Phase 1** | Database + Health (Prisma + HealthController) | `feature/phase-1-prisma` | ✅ DONE | `develop` |
| **Phase 2** | Auth + Core Guards (JWT + Guards + Decorators) | `feature/phase-2-auth` | ✅ DONE | `develop` |
| **Phase 3** | Business Modules (Packages + Words + Learning + Games) | `feature/phase-3-business-modules` | ✅ DONE | 13 commits, +1401 lines, 7 audit rounds, 9 issues fixed |
| **Phase 4** | Workers + Queues (RabbitMQ + Redis + Email + Import) | `feature/phase-4-workers` | ✅ DONE | 8 commits, +1838 lines, 7 audit rounds, 8 issues fixed |
| **Phase 5** | Frontend Migration (Next.js + React + Tailwind) | `feature/phase-5-frontend` | ✅ DONE | 9 commits: auth pages, dashboard, packages, vocabs, learn, 7 games, TTS endpoint, remaining pages (about, feedback, forgot/reset password, games hub) |
| **Phase 6** | CI/CD + Deploy (GitHub Actions + Docker + Railway) | `feature/phase-6-cicd` | ✅ DONE | 5 commits: CI/CD workflow, Dockerfiles, Railway config, Changesets, E2E workflow |
