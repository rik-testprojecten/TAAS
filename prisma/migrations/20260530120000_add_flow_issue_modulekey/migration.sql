-- AlterTable: koppel flows en bevindingen aan een subonderdeel (module-key).
ALTER TABLE "Flow" ADD COLUMN IF NOT EXISTS "moduleKey" TEXT;

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "moduleKey" TEXT;

-- Index voor rapportage per onderdeel.
CREATE INDEX IF NOT EXISTS "Flow_tenantId_moduleKey_idx" ON "Flow"("tenantId", "moduleKey");
CREATE INDEX IF NOT EXISTS "Issue_tenantId_moduleKey_idx" ON "Issue"("tenantId", "moduleKey");
