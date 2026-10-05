-- DropForeignKey
ALTER TABLE "CivicIssue" DROP CONSTRAINT IF EXISTS "CivicIssue_priorityId_fkey";
ALTER TABLE "SlaPolicy" DROP CONSTRAINT IF EXISTS "SlaPolicy_priorityId_fkey";
ALTER TABLE "WorkOrder" DROP CONSTRAINT IF EXISTS "WorkOrder_priorityId_fkey";

-- Add UUID 'id' column and populate it
ALTER TABLE "PriorityLevel" ADD COLUMN "id" TEXT;
UPDATE "PriorityLevel" SET "id" = gen_random_uuid()::text;
ALTER TABLE "PriorityLevel" ALTER COLUMN "id" SET NOT NULL;

-- Drop old Primary Key and set 'id' as Primary Key
ALTER TABLE "PriorityLevel" DROP CONSTRAINT "PriorityLevel_pkey";
ALTER TABLE "PriorityLevel" ADD CONSTRAINT "PriorityLevel_pkey" PRIMARY KEY ("id");

-- Make 'code' unique
CREATE UNIQUE INDEX "PriorityLevel_code_key" ON "PriorityLevel"("code");

-- Update existing foreign key values from 'code' text to 'id' UUID
UPDATE "CivicIssue" SET "priorityId" = p."id" FROM "PriorityLevel" p WHERE "CivicIssue"."priorityId" = p."code";
UPDATE "SlaPolicy" SET "priorityId" = p."id" FROM "PriorityLevel" p WHERE "SlaPolicy"."priorityId" = p."code";
UPDATE "WorkOrder" SET "priorityId" = p."id" FROM "PriorityLevel" p WHERE "WorkOrder"."priorityId" = p."code";

-- AddForeignKey constraints back referencing the new UUID
ALTER TABLE "CivicIssue" ADD CONSTRAINT "CivicIssue_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "PriorityLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "PriorityLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "PriorityLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
