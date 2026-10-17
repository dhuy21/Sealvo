# Local development

## Infrastructure

Node 22 (`.nvmrc`: `nvm use`) and Docker.

```bash
cp .env.example .env            # then fill the required secrets (see the comments in the file)
npm ci
npm run infra:up                # MySQL :3307, Redis :6379, RabbitMQ :5672 (UI :15672), waits until healthy
npm run db:migrate              # creates / updates the schema
npm run dev                     # API :3001, web :3000 (builds packages/shared first)
```

Every value comes from the root `.env`, the web app included (`apps/web/load-root-env.ts` takes
its `API_URL`). `npm run infra:down` stops the containers and keeps the data.

## Database schema (Prisma migrations)

The dev MySQL container starts with an empty `web_db` (server collation `utf8mb4_general_ci`, set
by the compose `command`); the Prisma migrations create the schema. From the repository root (the
Prisma CLI reads `DATABASE_URL` from `.env`), after the first `up` and after pulling a new migration:

```bash
npm run db:migrate
npm run db:status               # "Database schema is up to date"
```

Then seed the E2E account if you need it (below). After
`docker compose -f docker-compose.dev.yml down -v` the database is empty again: repeat both steps.

### Volumes created before the switch to Prisma migrations

Older dev volumes were initialised from the previous application's `001_initial.sql` schema. They are
kept as they are (MySQL only runs init scripts on an empty volume).

- **Never baselined** (`migrate deploy` fails with `P3005`): mark the baseline as applied once,
  then run `migrate deploy` as above:

  ```bash
  npx prisma migrate resolve --applied 001_baseline --schema=apps/api/prisma/schema.prisma
  ```

The commands below load `.env` into the shell first (`set -a; . ./.env; set +a`), so they use
its credentials instead of literal ones.

- **Baselined before commit `6c513fe`**, which edited `001_baseline/migration.sql` (collation
  `utf8mb4_unicode_ci` → `utf8mb4_general_ci`): `_prisma_migrations` still holds the old file's
  checksum, so `prisma migrate dev` reports the migration as modified and asks to reset the
  database. Store the current SHA-256 (`sha256sum apps/api/prisma/migrations/001_baseline/migration.sql`)
  once; the baseline SQL never ran on this database, only its checksum changes:

  ```bash
  set -a; . ./.env; set +a
  docker exec -it sealvo_db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e \
    "UPDATE _prisma_migrations SET checksum = 'cb69922c3c6ad43bef3697b1f8add161aeb4c79250f6eb72afdb2a205bc3290d' WHERE migration_name = '001_baseline';"
  ```

Staging and production need the same update: see [railway-setup.md](railway-setup.md).

## E2E account (seed)

`apps/api/prisma/seed.mjs` creates a verified user with one package (`E2E Package`, inactive so
the reminder job never emails it) of 8 words at level `x`, due today. It is idempotent: each run
resets the package to that state. It never runs automatically (`migrate deploy` does not seed) and
refuses `NODE_ENV=production`.

```bash
set -a; . ./.env; set +a        # DATABASE_URL from .env
E2E_USERNAME=e2e_user E2E_PASSWORD='<password>' npm run db:seed -w @sealvo/api
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

## Production images on this machine

`docker-compose.prod.yml` runs the images the way they are deployed (`NODE_ENV=production`, API,
worker, scheduler and web built from this checkout, with their own MySQL, Redis and RabbitMQ), to
try a change before pushing it. It is not the deployment: staging and production run on Railway
([railway-setup.md](railway-setup.md)).
Being production, it applies the production checks: `FRONTEND_URL` set, and `JWT_ACCESS_SECRET` /
`CRON_SECRET` of at least 32 characters in `.env` (`openssl rand -hex 32`).

```bash
docker compose -f docker-compose.prod.yml up -d --build   # API :3001, web :3000
docker compose -f docker-compose.prod.yml down            # add -v to drop its data
```

It uses the same ports as `npm run dev`: stop one before starting the other.
