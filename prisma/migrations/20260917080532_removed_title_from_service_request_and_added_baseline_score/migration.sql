/*
  Warnings:

  - The values [CRITICAL] on the enum `IssuePriority` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `targetResolutionAt` on the `CivicIssue` table. All the data in the column will be lost.
  - You are about to drop the column `targetResponseAt` on the `CivicIssue` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `ServiceRequest` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IssuePriority_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'EMERGENCY');
ALTER TABLE "public"."CivicIssue" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "CivicIssue" ALTER COLUMN "priority" TYPE "IssuePriority_new" USING ("priority"::text::"IssuePriority_new");
ALTER TABLE "SlaPolicy" ALTER COLUMN "priority" TYPE "IssuePriority_new" USING ("priority"::text::"IssuePriority_new");
ALTER TABLE "WorkOrder" ALTER COLUMN "priority" TYPE "IssuePriority_new" USING ("priority"::text::"IssuePriority_new");
ALTER TYPE "IssuePriority" RENAME TO "IssuePriority_old";
ALTER TYPE "IssuePriority_new" RENAME TO "IssuePriority";
DROP TYPE "public"."IssuePriority_old";
ALTER TABLE "CivicIssue" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
ALTER TABLE "WorkOrder" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
COMMIT;

-- DropIndex
DROP INDEX "CivicIssue_status_targetResolutionAt_idx";

-- AlterTable
ALTER TABLE "CivicIssue" DROP COLUMN "targetResolutionAt",
DROP COLUMN "targetResponseAt",
ADD COLUMN     "resolutionDeadlineAt" TIMESTAMP(3),
ADD COLUMN     "responseDeadlineAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN     "baseSeverity" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "ServiceRequest" DROP COLUMN "title";

-- CreateIndex
CREATE INDEX "CivicIssue_status_responseDeadlineAt_idx" ON "CivicIssue"("status", "responseDeadlineAt");

-- CreateIndex
CREATE INDEX "CivicIssue_status_resolutionDeadlineAt_idx" ON "CivicIssue"("status", "resolutionDeadlineAt");
