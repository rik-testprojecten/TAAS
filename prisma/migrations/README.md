# Database migrations

This project now uses **Prisma Migrate**. The build command runs
`prisma migrate deploy` so schema changes are applied to the database on every
deploy. Previously the schema was managed ad hoc with `prisma db push`, which is
why the `RunStep.parentRunStepId` / `threadInitiatorId` and `Attachment.flowStepId`
columns existed in `schema.prisma` but were missing from the deployed database
(Prisma error **P2022**).

## One-time baseline (REQUIRED before the first deploy)

The existing database already contains all the tables from `0_init` but has **no
migration history** (`_prisma_migrations` table). `prisma migrate deploy` refuses
to run against such a database (error **P3005**). You must mark the baseline as
already applied **once per existing database** (production, and any preview/staging
database the deploy points at):

```bash
DATABASE_URL="<existing-database-url>" npx prisma migrate resolve --applied 0_init
```

This records `0_init` as applied **without** re-running it. After this, the next
`prisma migrate deploy` applies only the pending
`20260529180000_add_threaded_steps_and_flowstep_attachments` migration, which adds
the missing columns. Subsequent deploys report "No pending migrations to apply".

Skip this step and the deploy build will fail with P3005.

## Creating a brand-new database

No baseline step is needed. `prisma migrate deploy` (or `prisma migrate dev`) runs
all migrations from scratch; `0_init` is written idempotently and creates the full
schema.

## Adding future schema changes

Edit `prisma/schema.prisma`, then generate a migration locally against a dev
database:

```bash
npx prisma migrate dev --name <change-description>
```

Commit the generated `prisma/migrations/<timestamp>_<name>/` folder. The next
deploy applies it automatically.
