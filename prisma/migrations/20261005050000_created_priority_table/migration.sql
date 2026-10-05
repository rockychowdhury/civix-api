-- CreateTable
CREATE TABLE "PriorityLevel" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "colorCode" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorityLevel_pkey" PRIMARY KEY ("code")
);

-- Insert Dummy Record
INSERT INTO "PriorityLevel" ("code", "name", "weight", "updatedAt") 
VALUES ('MEDIUM', 'Medium Priority', 20, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "CivicIssue" ADD COLUMN "priorityId" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "SlaPolicy" ADD COLUMN "priorityId" TEXT NOT NULL DEFAULT 'MEDIUM';

-- Drop Default
ALTER TABLE "CivicIssue" ALTER COLUMN "priorityId" DROP DEFAULT;
ALTER TABLE "SlaPolicy" ALTER COLUMN "priorityId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "CivicIssue_municipalityId_priorityId_status_idx" ON "CivicIssue"("municipalityId", "priorityId", "status");
CREATE INDEX "SlaPolicy_municipalityId_categoryId_priorityId_idx" ON "SlaPolicy"("municipalityId", "categoryId", "priorityId");

-- AddForeignKey
ALTER TABLE "CivicIssue" ADD CONSTRAINT "CivicIssue_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "PriorityLevel"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "PriorityLevel"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
