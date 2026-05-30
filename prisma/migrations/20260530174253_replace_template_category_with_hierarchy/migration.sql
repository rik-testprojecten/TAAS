-- Replace TemplateCategory enum with free-text mainCategory / subCategory columns.
-- mainCategory holds a Module key (e.g. "HRM", "FIN") and subCategory holds an
-- optional Submodule key (e.g. "HRM_DECLARATIES").  Valid values are defined in
-- src/lib/modules.ts which is the single source of truth.

-- 1. Add new columns (mainCategory gets a temporary default so existing rows are valid)
ALTER TABLE "Template" ADD COLUMN "mainCategory" TEXT NOT NULL DEFAULT 'HRM';
ALTER TABLE "Template" ADD COLUMN "subCategory"  TEXT;

-- 2. Migrate existing enum values → module keys
UPDATE "Template" SET "mainCategory" = 'HRM' WHERE "category" = 'HR';
UPDATE "Template" SET "mainCategory" = 'FIN' WHERE "category" = 'FIN';
UPDATE "Template" SET "mainCategory" = 'LOG' WHERE "category" = 'INKOOP';
UPDATE "Template" SET "mainCategory" = 'HRM' WHERE "category" = 'ALG';

-- 3. Drop old column and enum
ALTER TABLE "Template" DROP COLUMN "category";
DROP TYPE IF EXISTS "TemplateCategory";
