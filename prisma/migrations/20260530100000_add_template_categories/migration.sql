-- CreateTable
CREATE TABLE IF NOT EXISTS "TemplateMainCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateMainCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TemplateSubCategory" (
    "id" TEXT NOT NULL,
    "mainCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TemplateMainCategory_slug_key" ON "TemplateMainCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TemplateSubCategory_mainCategoryId_slug_key" ON "TemplateSubCategory"("mainCategoryId", "slug");

-- Seed default main categories
INSERT INTO "TemplateMainCategory" ("id", "name", "slug", "order", "createdAt", "updatedAt")
VALUES
  ('cmcat-hr-0000000000000001', 'HR',          'HR',     1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmcat-fin-000000000000002', 'Financieel',  'FIN',    2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmcat-ink-000000000000003', 'Inkoop',      'INKOOP', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmcat-alg-000000000000004', 'Algemeen',    'ALG',    4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- AlterTable Template: add new nullable FK columns
ALTER TABLE "Template"
  ADD COLUMN IF NOT EXISTS "mainCategoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "subCategoryId"  TEXT;

-- Migrate existing category enum values to new FK
UPDATE "Template" SET "mainCategoryId" = 'cmcat-hr-0000000000000001' WHERE "category" = 'HR';
UPDATE "Template" SET "mainCategoryId" = 'cmcat-fin-000000000000002' WHERE "category" = 'FIN';
UPDATE "Template" SET "mainCategoryId" = 'cmcat-ink-000000000000003' WHERE "category" = 'INKOOP';
UPDATE "Template" SET "mainCategoryId" = 'cmcat-alg-000000000000004' WHERE "category" = 'ALG';

-- Drop old enum column
ALTER TABLE "Template" DROP COLUMN IF EXISTS "category";

-- Drop enum type (safe: no longer referenced)
DROP TYPE IF EXISTS "TemplateCategory";

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Template_mainCategoryId_fkey') THEN
    ALTER TABLE "Template" ADD CONSTRAINT "Template_mainCategoryId_fkey"
      FOREIGN KEY ("mainCategoryId") REFERENCES "TemplateMainCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Template_subCategoryId_fkey') THEN
    ALTER TABLE "Template" ADD CONSTRAINT "Template_subCategoryId_fkey"
      FOREIGN KEY ("subCategoryId") REFERENCES "TemplateSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TemplateSubCategory_mainCategoryId_fkey') THEN
    ALTER TABLE "TemplateSubCategory" ADD CONSTRAINT "TemplateSubCategory_mainCategoryId_fkey"
      FOREIGN KEY ("mainCategoryId") REFERENCES "TemplateMainCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
