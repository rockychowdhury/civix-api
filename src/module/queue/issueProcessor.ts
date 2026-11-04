import { prisma } from "../../lib/prisma";
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

/**
 * Core business processor for background service request evaluation,
 * LLM categorization & routing, duplicate detection, and civic issue persistence.
 */
export const processServiceRequestJob = async (serviceRequestId: string): Promise<void> => {
  console.log(`[Queue Processor] Processing service request ID: ${serviceRequestId}`);

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

    // 1. Intelligent Routing & Classification via LLM
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

    // If no department matched or confidence is low, keep request on hold for manual review
    if (!departmentId || !category) {
      console.log(`[Queue Processor] Service request ${serviceRequestId} queued for manual review. Reasoning: ${routeResult.reasoning}`);
      await prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          categoryId: category?.id || null,
          status: LifecycleStatus.SUBMITTED,
          processingStatus: "COMPLETED",
        },
      });
      return;
    }

    // 2. Spatial & Road Duplicate Detection
    const duplicateIssue = await SpatialService.findDuplicateCivicIssue({
      municipalityId: req.municipalityId,
      categoryId: category.id,
      latitude: req.location?.latitude,
      longitude: req.location?.longitude,
      wardId: req.location?.wardId,
      roadId: req.location?.roadId,
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

    let updatePriorityId: string | undefined = undefined;
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

    console.log(`[Queue Processor] Successfully processed service request ${serviceRequestId}`);
  } catch (error) {
    console.error(`[Queue Processor] Error processing service request ${serviceRequestId}:`, error);
    await prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: { processingStatus: "FAILED" },
    }).catch((err) => {
      console.error(`[Queue Processor] Failed to update processingStatus to FAILED:`, err);
    });
    throw error;
  }
};

