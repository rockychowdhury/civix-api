/*
  Warnings:

  - You are about to drop the column `isAnonymous` on the `ServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestType` on the `ServiceRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Attachment" ALTER COLUMN "fileType" SET DEFAULT 'IMAGE',
ALTER COLUMN "purpose" SET DEFAULT 'REPORT_EVIDENCE';

-- AlterTable
ALTER TABLE "ServiceRequest" DROP COLUMN "isAnonymous",
DROP COLUMN "requestType",
ADD COLUMN     "categoryId" TEXT;

-- DropEnum
DROP TYPE "RequestType";

-- CreateIndex
CREATE INDEX "ServiceRequest_categoryId_idx" ON "ServiceRequest"("categoryId");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
