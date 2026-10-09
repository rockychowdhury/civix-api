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
	WorkUpdateType,
} from "../../../generated/prisma/enums";
import { sendIssueResolvedEmail } from "../../utils/email.service";
import { createCivicIssueHistory } from "../../utils/civicIssueHistory";
import { checkDepartmentAccess } from "../../utils/abac.utils";

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

	// ABAC Check: Must have department access
	await checkDepartmentAccess(userId, workOrder.departmentId);

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

		// Update WorkOrder status to PENDING_VERIFICATION
		await tx.workOrder.update({
			where: { id: workOrderId },
			data: {
				status: LifecycleStatus.PENDING_VERIFICATION,
				completedAt: new Date(),
			},
		});

		// Create a COMPLETED work update entry
		await tx.workUpdate.create({
			data: {
				workOrderId,
				technicianId: userId,
				updateType: WorkUpdateType.COMPLETED,
				note: payload.summary || "Work completed and resolution submitted.",
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

		// Notify reporters that resolution is submitted and feedback is requested
		const reporters = await tx.issueReporter.findMany({
			where: { civicIssueId: workOrder.civicIssueId },
		});

		for (const reporter of reporters) {
			await tx.notification.create({
				data: {
					userId: reporter.citizenId,
					type: NotificationType.FEEDBACK_REQUESTED,
					title: "Resolution Submitted - Feedback Requested",
					message: `A resolution has been submitted for your reported issue. Please review and provide your feedback!`,
					resourceType: Resource.SERVICE_REQUEST,
					resourceId: reporter.serviceRequestId,
				},
			});
		}

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

	// ABAC Check: Must have department access to verify
	await checkDepartmentAccess(userId, resolution.workOrder.departmentId);

	const emailPromises: Promise<void>[] = [];

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
					emailPromises.push(
						sendIssueResolvedEmail(
							reporter.citizen.user.email,
							reporter.citizen.firstName,
							updatedIssue.title,
							reporter.serviceRequest.trackingNumber,
						),
					);
				}
			}
		} else if (payload.status === "REOPENED") {
			// If REOPENED, reset work order back to TRIAGED so dispatchers can re-assign
			await tx.workOrder.update({
				where: { id: resolution.workOrderId },
				data: {
					status: LifecycleStatus.TRIAGED,
					completedAt: null,
					currentAssigneeId: null,
				},
			});

			const updatedIssue = await tx.civicIssue.update({
				where: { id: resolution.workOrder.civicIssueId },
				data: {
					status: LifecycleStatus.REOPENED,
					resolvedAt: null,
					closedAt: null,
				},
			});

			await tx.serviceRequest.updateMany({
				where: { civicIssueId: resolution.workOrder.civicIssueId },
				data: { status: LifecycleStatus.REOPENED },
			});

			await createCivicIssueHistory({
				civicIssueId: resolution.workOrder.civicIssueId,
				changedById: userId,
				previousStatus: LifecycleStatus.PENDING_VERIFICATION,
				newStatus: LifecycleStatus.REOPENED,
				notes: `Resolution rejected and issue reopened: ${payload.notes || "Feedback was unsatisfactory / resolution invalid"}`,
				tx,
			});

			// Release technician workload if assigned
			if (resolution.workOrder.currentAssigneeId) {
				await tx.staffProfile.update({
					where: { userId: resolution.workOrder.currentAssigneeId },
					data: { currentWorkload: { decrement: 1 } },
				});
			}

			// Notify Reporters (Citizens)
			const reporters = await tx.issueReporter.findMany({
				where: { civicIssueId: updatedIssue.id },
			});

			for (const reporter of reporters) {
				await tx.notification.create({
					data: {
						userId: reporter.citizenId,
						type: NotificationType.STATUS_CHANGED,
						title: "Issue Reopened",
						message: `Your reported issue "${updatedIssue.title}" has been reopened for further work following resolution review.`,
						resourceType: Resource.CIVIC_ISSUE,
						resourceId: updatedIssue.id,
					},
				});
			}

			// Notify Technician about rejection/reopening
			if (resolution.submittedByUserId) {
				await tx.notification.create({
					data: {
						userId: resolution.submittedByUserId,
						type: NotificationType.SYSTEM,
						title: "Resolution Rejected - Issue Reopened",
						message: `Resolution for Work Order: ${resolution.workOrder.title} was rejected and reopened. Reason: ${payload.notes || "Unsatisfactory resolution"}`,
						resourceType: Resource.WORK_ORDER,
						resourceId: resolution.workOrderId,
					},
				});
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

		// Record ResolutionVerification history entry
		await tx.resolutionVerification.create({
			data: {
				civicIssueId: resolution.workOrder.civicIssueId,
				resolutionId: resolution.id,
				verifiedById: userId,
				status: isVerified ? "VERIFIED" : "REJECTED",
				notes:
					payload.notes ||
					(payload.status === "REOPENED"
						? "Issue reopened by dispatcher"
						: null),
			},
		});

		// Audit
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.VERIFY,
				resource: Resource.RESOLUTION,
				resourceId: resolutionId,
				newValue: { status: payload.status, notes: payload.notes },
			},
		});

		return updatedResolution;
	});

	// Fire emails asynchronously in the background so the response isn't blocked
	if (emailPromises.length > 0) {
		Promise.allSettled(emailPromises).catch(console.error);
	}

	return result;
};

const getResolutionById = async (userId: string, id: string) => {
	const resolution = await prisma.resolution.findUnique({
		where: { id },
		include: {
			workOrder: true,
			attachments: true,
			submittedByUser: {
				include: { user: { select: { displayName: true, email: true } } },
			},
			feedbacks: {
				include: {
					citizen: {
						select: {
							firstName: true,
							lastName: true,
							avatarUrl: true,
							user: { select: { email: true } },
						},
					},
					serviceRequest: {
						select: {
							id: true,
							trackingNumber: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			},
			verifications: {
				include: {
					verifiedBy: {
						include: {
							user: { select: { displayName: true, email: true } },
						},
					},
				},
				orderBy: { createdAt: "desc" },
			},
		},
	});

	if (!resolution) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolution not found");
	}

	await checkDepartmentAccess(userId, resolution.workOrder.departmentId);

	return resolution;
};

const getResolutionFeedback = async (userId: string, id: string) => {
	const resolution = await prisma.resolution.findUnique({
		where: { id },
		include: { workOrder: true },
	});

	if (!resolution) {
		throw new AppError(httpStatus.NOT_FOUND, "Resolution not found");
	}

	await checkDepartmentAccess(userId, resolution.workOrder.departmentId);

	return prisma.feedback.findMany({
		where: {
			OR: [
				{ resolutionId: id },
				{
					serviceRequest: {
						civicIssueId: resolution.workOrder.civicIssueId,
					},
				},
			],
		},
		include: {
			citizen: {
				select: {
					firstName: true,
					lastName: true,
					avatarUrl: true,
					user: { select: { email: true } },
				},
			},
			serviceRequest: {
				select: {
					id: true,
					trackingNumber: true,
					status: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});
};

const getResolutionByWorkOrderId = async (
	userId: string,
	workOrderId: string,
) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id: workOrderId },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	}

	await checkDepartmentAccess(userId, workOrder.departmentId);

	const resolution = await prisma.resolution.findUnique({
		where: { workOrderId },
		include: {
			attachments: true,
			submittedByUser: {
				include: { user: { select: { displayName: true, email: true } } },
			},
			feedbacks: {
				include: {
					citizen: {
						select: {
							firstName: true,
							lastName: true,
							avatarUrl: true,
							user: { select: { email: true } },
						},
					},
				},
			},
			verifications: {
				include: {
					verifiedBy: {
						include: {
							user: { select: { displayName: true, email: true } },
						},
					},
				},
				orderBy: { createdAt: "desc" },
			},
		},
	});

	if (!resolution) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Resolution not found for this work order",
		);
	}

	return resolution;
};

const getAllResolutions = async (query: Record<string, unknown>) => {
	const resolutions = await prisma.resolution.findMany({
		include: {
			workOrder: true,
			attachments: true,
			submittedByUser: {
				include: { user: { select: { displayName: true, email: true } } },
			},
			feedbacks: true,
			verifications: true,
		},
		orderBy: { createdAt: "desc" },
	});

	return resolutions;
};

export const ResolutionService = {
	submitResolution,
	verifyResolution,
	getResolutionById,
	getResolutionFeedback,
	getResolutionByWorkOrderId,
	getAllResolutions,
};
