-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LifecycleStatus" ADD VALUE 'WORK_ORDER_CREATED';
ALTER TYPE "LifecycleStatus" ADD VALUE 'TEAM_ASSIGNED';

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN     "workInstructions" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ALTER COLUMN "status" SET DEFAULT 'WORK_ORDER_CREATED';
