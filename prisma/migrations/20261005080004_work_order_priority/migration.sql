-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "priorityId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "PriorityLevel"("code") ON DELETE SET NULL ON UPDATE CASCADE;
