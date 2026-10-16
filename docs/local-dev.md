# Local development

## Infrastructure

```bash
cp .env.example .env            # then fill the secrets
docker compose -f docker-compose.dev.yml up -d   # MySQL :3307, Redis :6379, RabbitMQ :5672/:15672
npm ci
npx turbo dev                   # API :3001, web :3000
```

## One-time database setup (Prisma migration history)

The dev MySQL container creates its schema from the old app's `src/migrations/001_initial.sql`,
so it has the tables but no Prisma history: `prisma migrate deploy` would fail with `P3005`
(same situation as the production database). Mark the baseline as applied once, then apply the
newer migrations. From the repository root (the Prisma CLI reads `DATABASE_URL` from `.env`):

```bash
npx prisma migrate resolve --applied 001_baseline --schema=apps/api/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npx prisma migrate status --schema=apps/api/prisma/schema.prisma   # "Database schema is up to date"
```

Run `migrate deploy` again after pulling a new migration. If the volume is recreated
(`docker compose -f docker-compose.dev.yml down -v`), repeat both commands.

## E2E account (seed)

`apps/api/prisma/seed.mjs` creates a verified user with one package (`E2E Package`, inactive so
the reminder job never emails it) of 8 words at level `x`, due today. It is idempotent: each run
resets the package to that state. It never runs automatically (`migrate deploy` does not seed) and
refuses `NODE_ENV=production`.

```bash
DATABASE_URL=mysql://root:example@localhost:3307/web_db \
E2E_USERNAME=e2e_user E2E_PASSWORD='<password>' \
npm run db:seed -w @sealvo/api
```

## Playwright

```bash
npx playwright install chromium        # once, from apps/web
BASE_URL=http://localhost:3000 E2E_USERNAME=e2e_user E2E_PASSWORD='<password>' \
npx turbo test:e2e --filter=@sealvo/web
```

Without `E2E_USERNAME` / `E2E_PASSWORD`, `e2e/protected.spec.ts` is skipped and only the public
pages are tested. The protected specs log in once per run: the login route allows 10 attempts per
15 minutes per IP (counter kept in Redis).
