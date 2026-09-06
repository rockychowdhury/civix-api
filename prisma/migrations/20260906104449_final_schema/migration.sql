/*
  Warnings:

  - The primary key for the `CitizenProfile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `CitizenProfile` table. All the data in the column will be lost.
  - The primary key for the `StaffProfile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `StaffProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nidNumber]` on the table `CitizenProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `action` on the `Permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `resource` on the `Permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `code` to the `Role` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Action" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE', 'ASSIGN', 'REASSIGN', 'ESCALATE', 'VERIFY', 'CLOSE', 'REOPEN', 'MERGE', 'APPROVE');

-- CreateEnum
CREATE TYPE "Resource" AS ENUM ('USER', 'PROFILE', 'CITIZEN', 'STAFF', 'ROLE', 'PERMISSION', 'ALL', 'SERVICE_REQUEST', 'CIVIC_ISSUE', 'WORK_ORDER', 'ASSIGNMENT', 'RESOLUTION', 'FEEDBACK', 'ATTACHMENT', 'NOTIFICATION', 'SLA_POLICY', 'CATEGORY', 'ESCALATION', 'AUDIT_LOG', 'MUNICIPALITY', 'ZONE', 'WARD', 'LOCATION', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DepartmentRole" AS ENUM ('HEAD', 'MANAGER', 'DISPATCHER', 'TECHNICIAN', 'MEMBER');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('SUBMITTED', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED', 'DUPLICATE', 'INSUFFICIENT_INFORMATION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('COMPLAINT', 'SERVICE_REQUEST');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkUpdateType" AS ENUM ('ACCEPTED', 'ON_SITE', 'PROGRESS', 'BLOCKED', 'DELAYED', 'PAUSED', 'RESUMED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttachmentFileType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AttachmentPurpose" AS ENUM ('REPORT_EVIDENCE', 'BEFORE_WORK', 'DURING_WORK', 'AFTER_WORK', 'VERIFICATION', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ResolutionVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_SUBMITTED', 'REQUEST_ASSIGNED', 'STATUS_CHANGED', 'WORK_STARTED', 'RESOLUTION_SUBMITTED', 'FEEDBACK_REQUESTED', 'SLA_WARNING', 'SLA_BREACHED', 'ESCALATION', 'SYSTEM');

-- DropIndex
DROP INDEX "CitizenProfile_userId_key";

-- DropIndex
DROP INDEX "StaffProfile_userId_key";

-- AlterTable
ALTER TABLE "CitizenProfile" DROP CONSTRAINT "CitizenProfile_pkey",
DROP COLUMN "id",
ADD COLUMN     "confirmedReports" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nidNumber" TEXT,
ADD COLUMN     "rejectedReports" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "spamFlagCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalReports" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "CitizenProfile_pkey" PRIMARY KEY ("userId");

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "postalCode" TEXT;

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "action",
ADD COLUMN     "action" "Action" NOT NULL,
DROP COLUMN "resource",
ADD COLUMN     "resource" "Resource" NOT NULL;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "isSystemRole" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StaffProfile" DROP CONSTRAINT "StaffProfile_pkey",
DROP COLUMN "id",
ADD COLUMN     "currentWorkload" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxWorkload" INTEGER NOT NULL DEFAULT 5,
ADD CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("userId");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT;

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT,
    "teamId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "unassignedAt" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT,
    "workUpdateId" TEXT,
    "resolutionId" TEXT,
    "fileType" "AttachmentFileType" NOT NULL,
    "purpose" "AttachmentPurpose" NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CivicIssue" (
    "id" TEXT NOT NULL,
    "issueNumber" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "categoryId" TEXT,
    "locationId" TEXT,
    "departmentId" TEXT,
    "wardId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LifecycleStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "reportedCount" INTEGER NOT NULL DEFAULT 1,
    "firstReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetResponseAt" TIMESTAMP(3),
    "targetResolutionAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CivicIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CivicIssueHistory" (
    "id" TEXT NOT NULL,
    "civicIssueId" TEXT NOT NULL,
    "changedById" TEXT,
    "previousStatus" "LifecycleStatus",
    "newStatus" "LifecycleStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CivicIssueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentMember" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "DepartmentRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentServiceArea" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "civicIssueId" TEXT NOT NULL,
    "escalationLevel" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "escalatedFromId" TEXT,
    "escalatedToId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueReporter" (
    "id" TEXT NOT NULL,
    "civicIssueId" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IssueReporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "resourceType" TEXT,
    "resourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "summary" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolutionVerification" (
    "id" TEXT NOT NULL,
    "civicIssueId" TEXT NOT NULL,
    "feedbackId" TEXT,
    "verifiedById" TEXT,
    "status" "ResolutionVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResolutionVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "civicIssueId" TEXT,
    "municipalityId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "locationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestType" "RequestType" NOT NULL DEFAULT 'COMPLAINT',
    "status" "LifecycleStatus" NOT NULL DEFAULT 'SUBMITTED',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaPolicy" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "priority" "IssuePriority" NOT NULL,
    "responseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "civicIssueId" TEXT NOT NULL,
    "currentAssigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "LifecycleStatus" NOT NULL DEFAULT 'ASSIGNED',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkUpdate" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "updateType" "WorkUpdateType" NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assignment_assignedToId_status_idx" ON "Assignment"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "Assignment_workOrderId_status_idx" ON "Assignment"("workOrderId", "status");

-- CreateIndex
CREATE INDEX "Attachment_serviceRequestId_idx" ON "Attachment"("serviceRequestId");

-- CreateIndex
CREATE INDEX "Attachment_workUpdateId_idx" ON "Attachment"("workUpdateId");

-- CreateIndex
CREATE INDEX "Attachment_resolutionId_idx" ON "Attachment"("resolutionId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CivicIssue_issueNumber_key" ON "CivicIssue"("issueNumber");

-- CreateIndex
CREATE INDEX "CivicIssue_municipalityId_status_idx" ON "CivicIssue"("municipalityId", "status");

-- CreateIndex
CREATE INDEX "CivicIssue_municipalityId_priority_status_idx" ON "CivicIssue"("municipalityId", "priority", "status");

-- CreateIndex
CREATE INDEX "CivicIssue_status_targetResolutionAt_idx" ON "CivicIssue"("status", "targetResolutionAt");

-- CreateIndex
CREATE INDEX "CivicIssue_categoryId_status_idx" ON "CivicIssue"("categoryId", "status");

-- CreateIndex
CREATE INDEX "CivicIssue_municipalityId_createdAt_idx" ON "CivicIssue"("municipalityId", "createdAt");

-- CreateIndex
CREATE INDEX "CivicIssue_locationId_idx" ON "CivicIssue"("locationId");

-- CreateIndex
CREATE INDEX "CivicIssue_departmentId_status_idx" ON "CivicIssue"("departmentId", "status");

-- CreateIndex
CREATE INDEX "CivicIssue_wardId_status_idx" ON "CivicIssue"("wardId", "status");

-- CreateIndex
CREATE INDEX "CivicIssueHistory_civicIssueId_createdAt_idx" ON "CivicIssueHistory"("civicIssueId", "createdAt");

-- CreateIndex
CREATE INDEX "CivicIssueHistory_changedById_idx" ON "CivicIssueHistory"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "Department_municipalityId_code_key" ON "Department"("municipalityId", "code");

-- CreateIndex
CREATE INDEX "DepartmentMember_staffId_idx" ON "DepartmentMember"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMember_departmentId_staffId_key" ON "DepartmentMember"("departmentId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentServiceArea_departmentId_wardId_key" ON "DepartmentServiceArea"("departmentId", "wardId");

-- CreateIndex
CREATE INDEX "Escalation_civicIssueId_escalatedAt_idx" ON "Escalation"("civicIssueId", "escalatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_serviceRequestId_key" ON "Feedback"("serviceRequestId");

-- CreateIndex
CREATE INDEX "Feedback_citizenId_createdAt_idx" ON "Feedback"("citizenId", "createdAt");

-- CreateIndex
CREATE INDEX "IssueReporter_citizenId_idx" ON "IssueReporter"("citizenId");

-- CreateIndex
CREATE INDEX "IssueReporter_serviceRequestId_idx" ON "IssueReporter"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueReporter_civicIssueId_citizenId_key" ON "IssueReporter"("civicIssueId", "citizenId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_workOrderId_key" ON "Resolution"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionVerification_feedbackId_key" ON "ResolutionVerification"("feedbackId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "ServiceCategory_parentId_idx" ON "ServiceCategory"("parentId");

-- CreateIndex
CREATE INDEX "ServiceCategory_departmentId_idx" ON "ServiceCategory"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_trackingNumber_key" ON "ServiceRequest"("trackingNumber");

-- CreateIndex
CREATE INDEX "ServiceRequest_citizenId_createdAt_idx" ON "ServiceRequest"("citizenId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_municipalityId_status_idx" ON "ServiceRequest"("municipalityId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_civicIssueId_idx" ON "ServiceRequest"("civicIssueId");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_submittedAt_idx" ON "ServiceRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "SlaPolicy_municipalityId_categoryId_priority_idx" ON "SlaPolicy"("municipalityId", "categoryId", "priority");

-- CreateIndex
CREATE INDEX "WorkOrder_civicIssueId_idx" ON "WorkOrder"("civicIssueId");

-- CreateIndex
CREATE INDEX "WorkOrder_currentAssigneeId_status_idx" ON "WorkOrder"("currentAssigneeId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_status_createdAt_idx" ON "WorkOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenProfile_nidNumber_key" ON "CitizenProfile"("nidNumber");

-- CreateIndex
CREATE INDEX "Location_wardId_idx" ON "Location"("wardId");

-- CreateIndex
CREATE INDEX "Location_municipalityId_idx" ON "Location"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_resource_key" ON "Permission"("action", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "StaffProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_workUpdateId_fkey" FOREIGN KEY ("workUpdateId") REFERENCES "WorkUpdate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicIssue" ADD CONSTRAINT "CivicIssue_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicIssue" ADD CONSTRAINT "CivicIssue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicIssue" ADD CONSTRAINT "CivicIssue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicIssue" ADD CONSTRAINT "CivicIssue_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicIssue" ADD CONSTRAINT "CivicIssue_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicIssueHistory" ADD CONSTRAINT "CivicIssueHistory_civicIssueId_fkey" FOREIGN KEY ("civicIssueId") REFERENCES "CivicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicIssueHistory" ADD CONSTRAINT "CivicIssueHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentServiceArea" ADD CONSTRAINT "DepartmentServiceArea_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentServiceArea" ADD CONSTRAINT "DepartmentServiceArea_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_civicIssueId_fkey" FOREIGN KEY ("civicIssueId") REFERENCES "CivicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_escalatedFromId_fkey" FOREIGN KEY ("escalatedFromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "CitizenProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueReporter" ADD CONSTRAINT "IssueReporter_civicIssueId_fkey" FOREIGN KEY ("civicIssueId") REFERENCES "CivicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueReporter" ADD CONSTRAINT "IssueReporter_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueReporter" ADD CONSTRAINT "IssueReporter_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "CitizenProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "StaffProfile"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionVerification" ADD CONSTRAINT "ResolutionVerification_civicIssueId_fkey" FOREIGN KEY ("civicIssueId") REFERENCES "CivicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionVerification" ADD CONSTRAINT "ResolutionVerification_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionVerification" ADD CONSTRAINT "ResolutionVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "StaffProfile"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_civicIssueId_fkey" FOREIGN KEY ("civicIssueId") REFERENCES "CivicIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "CitizenProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_civicIssueId_fkey" FOREIGN KEY ("civicIssueId") REFERENCES "CivicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_currentAssigneeId_fkey" FOREIGN KEY ("currentAssigneeId") REFERENCES "StaffProfile"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkUpdate" ADD CONSTRAINT "WorkUpdate_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkUpdate" ADD CONSTRAINT "WorkUpdate_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "StaffProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
