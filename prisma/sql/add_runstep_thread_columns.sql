-- Idempotent fix for Prisma error P2022:
--   "The column `RunStep.parentRunStepId` does not exist in the current database."
--
-- The `parentRunStepId` and `threadInitiatorId` columns (threaded run steps) were
-- added to prisma/schema.prisma but never synced to the deployed Postgres database,
-- because this project relies on `prisma db push` and the build pipeline did not run it.
--
-- The build command now runs `prisma db push` on every deploy, which makes these
-- columns appear automatically. Run this script manually only if you need to fix the
-- live database immediately, before the next deploy:
--
--   psql "$DATABASE_URL" -f prisma/sql/add_runstep_thread_columns.sql
--
-- It is safe to run multiple times.

ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "parentRunStepId" TEXT;
ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "threadInitiatorId" TEXT;

-- Self-relation FK ("RunStepThread"). Optional relation => ON DELETE SET NULL,
-- ON UPDATE CASCADE, matching Prisma's defaults for an optional relation.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RunStep_parentRunStepId_fkey'
  ) THEN
    ALTER TABLE "RunStep"
      ADD CONSTRAINT "RunStep_parentRunStepId_fkey"
      FOREIGN KEY ("parentRunStepId") REFERENCES "RunStep"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
