# Database migrations

This project uses **Prisma Migrate** for migration history. Previously the schema was
managed ad hoc with `prisma db push` (migrations were even gitignored), which is why
the `RunStep.parentRunStepId` / `threadInitiatorId` and `Attachment.flowStepId` columns
existed in `schema.prisma` but were missing from the deployed database (Prisma error
**P2022**).

## How the schema is kept in sync on Vercel

On Vercel, **`DATABASE_URL` is not available during the build**, so migrations cannot
run as part of the build step. Instead the app reconciles the missing columns **at
runtime**, when the database connection exists, via the Next.js instrumentation hook
(`src/instrumentation.ts`). It runs once when a server instance boots: a fast pre-check
short-circuits when the columns are already present, otherwise it applies them
idempotently. This is what actually fixed the P2022 error in the deployed app.

The migration files below remain the source of truth for the schema and are used for
local development and for any environment where a database connection *is* available at
deploy time (see the manual `db:migrate` script section).

## Applying migrations where a DATABASE_URL is available (manual / CI)

`npm run db:migrate` runs `scripts/db-migrate-deploy.mjs`, which is safe and fully
automatic when `DATABASE_URL` is set:

The deploy step (`scripts/db-migrate-deploy.mjs`) detects what kind of database it is
talking to and does the right thing. You do **not** need to run any manual database
command:

- **Existing database from the old `db push` workflow** (all tables present, but no
  `_prisma_migrations` table): the script registers the `0_init` baseline as already
  applied, then runs `prisma migrate deploy` to apply the remaining migration that
  adds the missing columns. This avoids Prisma error **P3005** (migrate deploy refuses
  a non-empty database that has no migration history).
- **Brand-new / empty database**: `prisma migrate deploy` runs every migration from
  scratch and creates the full schema.
- **Database already on Prisma Migrate**: applies any new migrations, otherwise a
  no-op ("No pending migrations to apply").

If `DATABASE_URL` is **not** set at build time (e.g. a Vercel Preview build, where
the variable is scoped to Production only), the script **skips** migrations and exits
successfully — preview builds should not migrate the production database. Migrations
run on the deploy that has `DATABASE_URL` (production).

> Manual fallback (normally unnecessary): the baseline step the script performs
> automatically is equivalent to running, once per existing database:
> `DATABASE_URL=<url> npx prisma migrate resolve --applied 0_init`.

## Adding future schema changes

Edit `prisma/schema.prisma`, then generate a migration locally against a dev database:

```bash
npx prisma migrate dev --name <change-description>
```

Commit the generated `prisma/migrations/<timestamp>_<name>/` folder. The next deploy
applies it automatically.
