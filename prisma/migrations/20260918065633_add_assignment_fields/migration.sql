/*
  Warnings:

  - Added the required column `departmentId` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('INDIVIDUAL', 'TEAM');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISBANDED');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEAD', 'MEMBER', 'SPECIALIST');

-- AlterEnum
ALTER TYPE "AssignmentStatus" ADD VALUE 'UNASSIGNED';

-- AlterEnum
ALTER TYPE "Resource" ADD VALUE 'TEAM';

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_assignedById_fkey";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "notes" TEXT,
ALTER COLUMN "assignedToId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SlaPolicy" ADD COLUMN     "assignmentType" "AssignmentType" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "departmentId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "leaderId" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE INDEX "Team_departmentId_status_idx" ON "Team"("departmentId", "status");

-- CreateIndex
CREATE INDEX "Team_leaderId_idx" ON "Team"("leaderId");

-- CreateIndex
CREATE INDEX "TeamMember_staffId_role_idx" ON "TeamMember"("staffId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_staffId_key" ON "TeamMember"("teamId", "staffId");

-- CreateIndex
CREATE INDEX "WorkOrder_departmentId_idx" ON "WorkOrder"("departmentId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "StaffProfile"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "StaffProfile"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
