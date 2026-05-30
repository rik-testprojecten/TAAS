-- AlterTable
ALTER TABLE "RunStep" ADD COLUMN IF NOT EXISTS "parentRunStepId" TEXT,
ADD COLUMN IF NOT EXISTS "threadInitiatorId" TEXT;

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN IF NOT EXISTS "flowStepId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RunStep_parentRunStepId_fkey') THEN
    ALTER TABLE "RunStep" ADD CONSTRAINT "RunStep_parentRunStepId_fkey" FOREIGN KEY ("parentRunStepId") REFERENCES "RunStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attachment_flowStepId_fkey') THEN
    ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_flowStepId_fkey" FOREIGN KEY ("flowStepId") REFERENCES "FlowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
