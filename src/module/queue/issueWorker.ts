import { Worker } from "bullmq";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { ISSUE_QUEUE_NAME } from "./issueQueue";
import { RoutingService } from "../routing/routing.service";
import { SpatialService } from "../spatial/spatial.service";
import {
  generateIssueNumber,
  generateIssueTitle,
  generateIssueDescription,
  priorityScore,
  getIssuePriority,
  calculateResponseDeadline,
  calculateResolutionDeadline,
} from "../service-requests/service-request.utils";
import { createCivicIssueHistory } from "../../utils/civicIssueHistory";
import { createAuditLog } from "../../utils/auditLogger";
import { LifecycleStatus, Action, Resource } from "../../../generated/prisma/client";

export const startIssueWorker = () => {
  const worker = new Worker(
    ISSUE_QUEUE_NAME,
    async (job) => {
      const { serviceRequestId } = job.data;
      console.log(`Processing background service request job for ID: ${serviceRequestId}`);

      try {
        await prisma.serviceRequest.update({
          where: { id: serviceRequestId },
          data: { processingStatus: "PROCESSING" },
        });

        const req = await prisma.serviceRequest.findUnique({
          where: { id: serviceRequestId },
          include: {
            location: true,
            category: true,
            municipality: true,
          },
        });

        if (!req) {
          throw new Error(`Service request ${serviceRequestId} not found.`);
        }

        // 1. Intelligent Routing & Classification
        const routeResult = await RoutingService.classifyAndRoute(
          req.municipalityId,
          req.description,
          req.categoryId || undefined
        );

        const categoryId = routeResult.categoryId;
        const departmentId = routeResult.departmentId;

        let category = null;
        if (categoryId) {
          category = await prisma.serviceCategory.findUnique({
            where: { id: categoryId },
          });
        }

        if (!category) {
          // Default fallback category if none found
          category = await prisma.serviceCategory.findFirst();
        }

        if (!category) {
          throw new Error("No service category available for routing.");
        }

        // 2. Spatial Duplicate Detection
        const duplicateIssue = await SpatialService.findDuplicateCivicIssue({
          municipalityId: req.municipalityId,
          categoryId: category.id,
          latitude: req.location?.latitude,
          longitude: req.location?.longitude,
          wardId: req.location?.wardId,
        });

        // 3. Priority & SLA calculation
        const baseSeverity = category.baseSeverity || 10;
        const reportedCount = duplicateIssue ? duplicateIssue.reportedCount + 1 : 1;
        const firstReportedTime = duplicateIssue ? duplicateIssue.firstReportedAt : new Date();
        const hoursSinceFirstReport = Math.max(
          1,
          (Date.now() - new Date(firstReportedTime).getTime()) / (1000 * 60 * 60)
        );

        const score = priorityScore(baseSeverity, reportedCount, hoursSinceFirstReport);
        const priorityCode = getIssuePriority(score);

        const priorityRecord = await prisma.priorityLevel.findFirst({
          where: { code: priorityCode },
        });

        const slaPolicy = await prisma.slaPolicy.findFirst({
          where: {
            municipalityId: req.municipalityId,
            categoryId: category.id,
            ...(priorityRecord ? { priorityId: priorityRecord.id } : {}),
            effectiveTo: null,
          },
        });

        const responseMinutes = slaPolicy?.responseMinutes || 120;
        const resolutionMinutes = slaPolicy?.resolutionMinutes || 1440;
        const responseDeadlineAt = calculateResponseDeadline(responseMinutes);
        const resolutionDeadlineAt = calculateResolutionDeadline(resolutionMinutes);

        let updatePriorityId = undefined;
        if (priorityRecord && (!duplicateIssue || duplicateIssue.priorityId !== priorityRecord.id)) {
          updatePriorityId = priorityRecord.id;
        }

        const issueNumber = await generateIssueNumber();
        const wardName = req.location?.wardId || "General Area";
        const zoneName = req.location?.zoneId || "";

        // 4. Transactional persistence
        await prisma.$transaction(
          async (tx) => {
            let civicIssueId: string;
            let finalStatus: LifecycleStatus;

            if (duplicateIssue) {
              await tx.civicIssue.update({
                where: { id: duplicateIssue.id },
                data: {
                  reportedCount,
                  lastReportedAt: new Date(),
                  ...(updatePriorityId ? { priorityId: updatePriorityId } : {}),
                  responseDeadlineAt,
                  resolutionDeadlineAt,
                },
              });

              civicIssueId = duplicateIssue.id;
              finalStatus = duplicateIssue.status;
            } else {
              const newIssue = await tx.civicIssue.create({
                data: {
                  issueNumber,
                  municipalityId: req.municipalityId,
                  categoryId: category.id,
                  locationId: req.locationId,
                  departmentId: departmentId || category.departmentId || null,
                  title: generateIssueTitle(category.name, wardName, zoneName),
                  description: generateIssueDescription(
                    category.name,
                    category.description,
                    {
                      address: req.location?.address,
                      wardId: wardName,
                      zoneId: zoneName,
                      landmark: req.location?.landmark,
                      postalCode: req.location?.postalCode,
                    },
                    req.description,
                    new Date()
                  ),
                  status: LifecycleStatus.IN_PROGRESS,
                  priorityId: priorityRecord?.id || (await prisma.priorityLevel.findFirst())?.id || "",
                  reportedCount: 1,
                  wardId: req.location?.wardId || null,
                  responseDeadlineAt,
                  resolutionDeadlineAt,
                },
              });

              civicIssueId = newIssue.id;
              finalStatus = newIssue.status;

              await createCivicIssueHistory({
                civicIssueId: newIssue.id,
                changedById: null,
                previousStatus: null,
                newStatus: finalStatus,
                notes: `Auto-routed & created from service request ${req.trackingNumber}`,
                tx,
              });
            }

            // Update service request
            await tx.serviceRequest.update({
              where: { id: serviceRequestId },
              data: {
                civicIssueId,
                categoryId: category.id,
                status: finalStatus,
                processingStatus: "COMPLETED",
              },
            });

            // Register reporter
            await tx.issueReporter.upsert({
              where: {
                civicIssueId_citizenId: {
                  civicIssueId,
                  citizenId: req.citizenId,
                },
              },
              update: {
                serviceRequestId: req.id,
              },
              create: {
                civicIssueId,
                serviceRequestId: req.id,
                citizenId: req.citizenId,
              },
            });

            await tx.citizenProfile.update({
              where: { userId: req.citizenId },
              data: { totalReports: { increment: 1 } },
            });

            await createAuditLog({
              userId: req.citizenId,
              action: Action.CREATE,
              resource: Resource.CIVIC_ISSUE,
              resourceId: civicIssueId,
              newValue: { serviceRequestId, civicIssueId, routeResult },
              tx,
            });
          },
          { maxWait: 5000, timeout: 15000 }
        );

        console.log(`Successfully processed service request ${serviceRequestId}`);
      } catch (error) {
        console.error(`Error processing service request ${serviceRequestId}:`, error);
        await prisma.serviceRequest.update({
          where: { id: serviceRequestId },
          data: { processingStatus: "FAILED" },
        });
        throw error;
      }
    },
    {
      connection: {
        host: config.redis_host,
        port: Number(config.redis_port),
        username: config.redis_user,
        password: config.redis_password,
      },
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error:`, err);
  });

  return worker;
};
