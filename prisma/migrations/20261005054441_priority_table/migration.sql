/*
  Warnings:

  - The values [VIDEO,DOCUMENT,OTHER] on the enum `AttachmentFileType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `priority` on the `CivicIssue` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `SlaPolicy` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `WorkOrder` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AttachmentFileType_new" AS ENUM ('IMAGE');
UPDATE "Attachment" SET "fileType" = 'IMAGE' WHERE "fileType"::text IN ('VIDEO', 'DOCUMENT', 'OTHER');
ALTER TABLE "public"."Attachment" ALTER COLUMN "fileType" DROP DEFAULT;
ALTER TABLE "Attachment" ALTER COLUMN "fileType" TYPE "AttachmentFileType_new" USING ("fileType"::text::"AttachmentFileType_new");
ALTER TYPE "AttachmentFileType" RENAME TO "AttachmentFileType_old";
ALTER TYPE "AttachmentFileType_new" RENAME TO "AttachmentFileType";
DROP TYPE "public"."AttachmentFileType_old";
ALTER TABLE "Attachment" ALTER COLUMN "fileType" SET DEFAULT 'IMAGE';
COMMIT;

-- DropIndex
DROP INDEX "CivicIssue_municipalityId_priority_status_idx";

-- DropIndex
DROP INDEX "SlaPolicy_municipalityId_categoryId_priority_idx";

-- AlterTable
ALTER TABLE "CivicIssue" DROP COLUMN "priority";

-- AlterTable
ALTER TABLE "SlaPolicy" DROP COLUMN "priority";

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "priority";

-- DropEnum
DROP TYPE "IssuePriority";
