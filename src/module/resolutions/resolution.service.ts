import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type {
	ISubmitResolutionPayload,
	IVerifyResolutionPayload,
} from "./resolution.interface";
import {
	Action,
	Resource,
	LifecycleStatus,
	NotificationType,
} from "../../../generated/prisma/enums";
import { sendIssueResolvedEmail } from "../../utils/email.service";
import { createCivicIssueHistory } from "../../utils/civicIssueHistory";

const submitResolution = async (
	userId: string,
	workOrderId: string,
	payload: ISubmitResolutionPayload,
) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id: workOrderId },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	}

	if (workOrder.currentAssigneeId !== userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only the assigned technician can submit a resolution",
		);
	}

	const existingResolution = await prisma.resolution.findUnique({
		where: { workOrderId },
	});

	if (existingResolution && existingResolution.rejectedAt === null) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A pending or verified resolution already exists for this work order",
		);
	}

	const result = await prisma.$transaction(async (tx) => {
		// Create resolution
		const resolutionData = {
			workOrderId,
			submittedByUserId: userId,
			summary: payload.summary,
			approvedAt: null,
			rejectedAt: null,
		};

		let resolution;

		if (existingResolution) {
			resolution = await tx.resolution.update({
				where: { id: existingResolution.id },
				data: resolutionData,
			});
		} else {
			resolution = await tx.resolution.create({
				data: resolutionData,
			});
		}

		if (payload.attachmentIds && payload.attachmentIds.length > 0) {
			// Update attachments logic if needed
		}

		// Update WorkOrder status to PENDING_VERIFICATION
		await tx.workOrder.update({
			where: { id: workOrderId },
			data: {
				status: LifecycleStatus.PENDING_VERIFICATION,
				completedAt: new Date(),
			},
		});

		// Update CivicIssue status
		await tx.civicIssue.update({
			where: { id: workOrder.civicIssueId },
			data: { status: LifecycleStatus.PENDING_VERIFICATION },
		});

		// Sync child SRs
		await tx.serviceRequest.updateMany({
			where: { civicIssueId: workOrder.civicIssueId },
			data: { status: LifecycleStatus.PENDING_VERIFICATION },
		});

		// Record timeline entry
		await createCivicIssueHistory({
			civicIssueId: workOrder.civicIssueId,
			changedById: userId,
			previousStatus: workOrder.status as LifecycleStatus,
			newStatus: LifecycleStatus.PENDING_VERIFICATION,
			notes: `Resolution submitted for verification`,
			tx,
		});

		// Create Audit Log
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.CREATE,
				resource: Resource.RESOLUTION,
				resourceId: resolution.id,
				newValue: JSON.parse(JSON.stringify(resolution)),
			},
		});

		return tx.resolution.findUnique({
			where: { id: resolution.id },
		});
	});

	return result;
};

const verifyResolution = async (
	userId: string,
	resolutionId: string,
	payload: IVerifyResolutionPayload,
) => {
	const resolution = await prisma.resolution.findUnique({
		where: { id: resolutionId },
		include: { workOrder: true },
	});

	if (!resolution) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolution not found");
	}

	const result = await prisma.$transaction(async (tx) => {
		const isVerified = payload.status === "VERIFIED";
		// Update resolution
		const updatedResolution = await tx.resolution.update({
			where: { id: resolutionId },
			data: {
				approvedAt: isVerified ? new Date() : null,
				rejectedAt: !isVerified ? new Date() : null,
			},
		});

		// If VERIFIED, close work order, resolve civic issue
		if (isVerified) {
			await tx.workOrder.update({
				where: { id: resolution.workOrderId },
				data: { status: LifecycleStatus.RESOLVED },
			});

			const updatedIssue = await tx.civicIssue.update({
				where: { id: resolution.workOrder.civicIssueId },
				data: {
					status: LifecycleStatus.RESOLVED,
					resolvedAt: new Date(),
				},
			});

			await tx.serviceRequest.updateMany({
				where: { civicIssueId: resolution.workOrder.civicIssueId },
				data: { status: LifecycleStatus.RESOLVED },
			});

			await createCivicIssueHistory({
				civicIssueId: resolution.workOrder.civicIssueId,
				changedById: userId,
				previousStatus: LifecycleStatus.PENDING_VERIFICATION,
				newStatus: LifecycleStatus.RESOLVED,
				notes: "Resolution verified and approved.",
				tx,
			});

			// Release technician workload
			if (resolution.workOrder.currentAssigneeId) {
				await tx.staffProfile.update({
					where: { userId: resolution.workOrder.currentAssigneeId },
					data: { currentWorkload: { decrement: 1 } },
				});
			}

			// Notify Reporters (Citizens)
			const reporters = await tx.issueReporter.findMany({
				where: { civicIssueId: updatedIssue.id },
				include: {
					citizen: { include: { user: true } },
					serviceRequest: true,
				},
			});

			for (const reporter of reporters) {
				await tx.notification.create({
					data: {
						userId: reporter.citizenId,
						type: NotificationType.STATUS_CHANGED,
						title: "Issue Resolved",
						message: `Your reported issue "${updatedIssue.title}" has been resolved!`,
						resourceType: Resource.SERVICE_REQUEST,
						resourceId: reporter.serviceRequestId,
					},
				});

				// Send Email Notification
				if (reporter.citizen.user.email) {
					await sendIssueResolvedEmail(
						reporter.citizen.user.email,
						reporter.citizen.firstName,
						updatedIssue.title,
						reporter.serviceRequest.trackingNumber,
					);
				}
			}
		} else {
			// If REJECTED, bounce work order back to IN_PROGRESS
			await tx.workOrder.update({
				where: { id: resolution.workOrderId },
				data: { status: LifecycleStatus.IN_PROGRESS, completedAt: null },
			});

			await tx.civicIssue.update({
				where: { id: resolution.workOrder.civicIssueId },
				data: { status: LifecycleStatus.IN_PROGRESS },
			});

			await tx.serviceRequest.updateMany({
				where: { civicIssueId: resolution.workOrder.civicIssueId },
				data: { status: LifecycleStatus.IN_PROGRESS },
			});

			await createCivicIssueHistory({
				civicIssueId: resolution.workOrder.civicIssueId,
				changedById: userId,
				previousStatus: LifecycleStatus.PENDING_VERIFICATION,
				newStatus: LifecycleStatus.IN_PROGRESS,
				notes: `Resolution rejected${payload.notes ? `: ${payload.notes}` : ""}`,
				tx,
			});

			// Notify Technician about rejection
			if (resolution.submittedByUserId) {
				await tx.notification.create({
					data: {
						userId: resolution.submittedByUserId,
						type: NotificationType.SYSTEM,
						title: "Resolution Rejected",
						message: `Your resolution for Work Order: ${resolution.workOrder.title} was rejected. Reason: ${payload.notes}`,
						resourceType: Resource.WORK_ORDER,
						resourceId: resolution.workOrderId,
					},
				});
			}
		}

		// Audit
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.VERIFY,
				resource: Resource.RESOLUTION,
				resourceId: resolutionId,
				newValue: { status: payload.status },
			},
		});

		return updatedResolution;
	});

	return result;
};

export const ResolutionService = {
	submitResolution,
	verifyResolution,
};
