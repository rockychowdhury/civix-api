import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type {
	ITriagePayload,
	IMergePayload,
	IUpdateStatusPayload,
} from "./civic-issue.interface";
import { generateIssueNumber } from "../service-requests/service-request.utils";
import {
	Action,
	Resource,
	LifecycleStatus,
	NotificationType,
} from "../../../generated/prisma/enums";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { createCivicIssueHistory } from "../../utils/civicIssueHistory";
import { civicIssueSearchableFields } from "./civic-issue.constant";

const triageServiceRequest = async (
	userId: string,
	payload: ITriagePayload,
) => {
	const request = await prisma.serviceRequest.findUnique({
		where: { id: payload.serviceRequestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	if (request.civicIssueId) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Service request is already triaged",
		);
	}

	// Lookup SLA
	const slaPolicy = await prisma.slaPolicy.findFirst({
		where: {
			municipalityId: request.municipalityId,
			categoryId: payload.categoryId,
			priority: payload.priority,
			effectiveTo: null,
		},
	});

	if (!slaPolicy) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"No SLA policy found for this category and priority",
		);
	}

	const now = new Date();
	const targetResponseAt = new Date(
		now.getTime() + slaPolicy.responseMinutes * 60000,
	);
	const targetResolutionAt = new Date(
		now.getTime() + slaPolicy.resolutionMinutes * 60000,
	);

	const issueNumber = await generateIssueNumber();

	const result = await prisma.$transaction(async (tx) => {
		const civicIssue = await tx.civicIssue.create({
			data: {
				issueNumber,
				municipalityId: request.municipalityId,
				categoryId: payload.categoryId,
				locationId: request.locationId, // Default to the first report's location
				departmentId: payload.departmentId,
				wardId: payload.wardId,
				title: "Service Request " + request.trackingNumber,
				description: request.description,
				status: LifecycleStatus.TRIAGED,
				priority: payload.priority,
				reportedCount: 1,
			},
		});

		// Update ServiceRequest
		await tx.serviceRequest.update({
			where: { id: request.id },
			data: {
				civicIssueId: civicIssue.id,
				status: LifecycleStatus.TRIAGED,
			},
		});

		// Add reporter
		await tx.issueReporter.create({
			data: {
				civicIssueId: civicIssue.id,
				citizenId: request.citizenId,
				serviceRequestId: request.id,
			},
		});

		// Audit Log
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.CREATE,
				resource: Resource.CIVIC_ISSUE,
				resourceId: civicIssue.id,
				newValue: JSON.parse(JSON.stringify(civicIssue)),
			},
		});

		// Record issue creation in the status timeline
		await createCivicIssueHistory({
			civicIssueId: civicIssue.id,
			changedById: userId,
			previousStatus: null,
			newStatus: LifecycleStatus.TRIAGED,
			notes: `Triaged from service request`,
			tx,
		});

		return tx.civicIssue.findUnique({
			where: { id: civicIssue.id },
			include: { category: true, department: true, ward: true },
		});
	});

	return result;
};

const mergeServiceRequest = async (
	userId: string,
	civicIssueId: string,
	payload: IMergePayload,
) => {
	const civicIssue = await prisma.civicIssue.findUnique({
		where: { id: civicIssueId },
	});

	if (!civicIssue) {
		throw new AppError(httpStatus.NOT_FOUND, "Civic issue not found");
	}

	const request = await prisma.serviceRequest.findUnique({
		where: { id: payload.serviceRequestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	if (request.civicIssueId) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Service request is already grouped",
		);
	}

	const result = await prisma.$transaction(async (tx) => {
		// Update SR
		await tx.serviceRequest.update({
			where: { id: request.id },
			data: {
				civicIssueId: civicIssue.id,
				status: civicIssue.status, // Inherit status
			},
		});

		// Add reporter (using findFirst to avoid unique constraint violation if citizen reported twice)
		const existingReporter = await tx.issueReporter.findFirst({
			where: { civicIssueId: civicIssue.id, citizenId: request.citizenId },
		});

		if (!existingReporter) {
			await tx.issueReporter.create({
				data: {
					civicIssueId: civicIssue.id,
					citizenId: request.citizenId,
					serviceRequestId: request.id,
				},
			});
		}

		// Update CivicIssue report count & timestamp
		const updatedIssue = await tx.civicIssue.update({
			where: { id: civicIssue.id },
			data: {
				reportedCount: { increment: 1 },
				lastReportedAt: new Date(),
			},
		});

		// Audit
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.MERGE,
				resource: Resource.CIVIC_ISSUE,
				resourceId: civicIssue.id,
				metadata: { mergedServiceRequestId: request.id },
			},
		});

		return updatedIssue;
	});

	return result;
};

const updateStatus = async (
	userId: string,
	civicIssueId: string,
	payload: IUpdateStatusPayload,
) => {
	const civicIssue = await prisma.civicIssue.findUnique({
		where: { id: civicIssueId },
	});

	if (!civicIssue) {
		throw new AppError(httpStatus.NOT_FOUND, "Civic issue not found");
	}

	const result = await prisma.$transaction(async (tx) => {
		const updateData: any = { status: payload.status };

		// Handle specific terminal states
		if (payload.status === LifecycleStatus.CLOSED) {
			updateData.closedAt = new Date();
		} else if (payload.status === LifecycleStatus.RESOLVED) {
			updateData.resolvedAt = new Date();
		}

		const updatedIssue = await tx.civicIssue.update({
			where: { id: civicIssueId },
			data: updateData,
		});

		// Sync status down to all child ServiceRequests
		await tx.serviceRequest.updateMany({
			where: { civicIssueId },
			data: { status: payload.status },
		});

		// Create history entry
		await createCivicIssueHistory({
			civicIssueId,
			changedById: userId,
			previousStatus: civicIssue.status,
			newStatus: payload.status,
			notes: payload.notes,
			tx,
		});

		// Audit
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.UPDATE,
				resource: Resource.CIVIC_ISSUE,
				resourceId: civicIssue.id,
				oldValue: { status: civicIssue.status },
				newValue: { status: payload.status },
			},
		});

		return updatedIssue;
	});

	return result;
};

const getCivicIssues = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		civicIssueSearchableFields,
	);

	const [data, total] = await Promise.all([
		prisma.civicIssue.findMany({
			where,
			orderBy: Object.keys(orderBy).length
				? orderBy
				: { priority: "desc", createdAt: "asc" },
			skip,
			take,
			include: {
				category: { select: { name: true } },
				department: { select: { name: true } },
				ward: { select: { name: true, number: true } },
				location: true,
			},
		}),
		prisma.civicIssue.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getCivicIssueById = async (id: string) => {
	const issue = await prisma.civicIssue.findUnique({
		where: { id },
		include: {
			category: true,
			department: true,
			ward: true,
			location: true,
			serviceRequests: {
				include: { attachments: true },
			},
			statusHistory: {
				include: { changedBy: { select: { email: true, displayName: true } } },
				orderBy: { createdAt: "desc" },
			},
			workOrders: true,
		},
	});

	if (!issue) {
		throw new AppError(httpStatus.NOT_FOUND, "Civic issue not found");
	}

	return issue;
};

const reopenCivicIssue = async (
	userId: string,
	civicIssueId: string,
	payload: { reason?: string },
) => {
	const civicIssue = await prisma.civicIssue.findUnique({
		where: { id: civicIssueId },
		include: {
			workOrders: {
				orderBy: { createdAt: "desc" },
				take: 1,
			},
		},
	});

	if (!civicIssue) {
		throw new AppError(httpStatus.NOT_FOUND, "Civic issue not found");
	}

	if (
		civicIssue.status !== LifecycleStatus.RESOLVED &&
		civicIssue.status !== LifecycleStatus.CLOSED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only resolved or closed issues can be reopened",
		);
	}

	const result = await prisma.$transaction(async (tx) => {
		// Reopen the civic issue
		const updatedIssue = await tx.civicIssue.update({
			where: { id: civicIssueId },
			data: {
				status: LifecycleStatus.REOPENED,
				resolvedAt: null,
				closedAt: null,
			},
		});

		// Reset the most recent work order back to TRIAGED so dispatchers can re-assign
		const latestWorkOrder = civicIssue.workOrders[0];
		if (latestWorkOrder) {
			await tx.workOrder.update({
				where: { id: latestWorkOrder.id },
				data: {
					status: LifecycleStatus.TRIAGED,
					completedAt: null,
					currentAssigneeId: null,
				},
			});
		}

		// Sync child service requests
		await tx.serviceRequest.updateMany({
			where: { civicIssueId },
			data: { status: LifecycleStatus.REOPENED },
		});

		// Record in timeline
		await createCivicIssueHistory({
			civicIssueId,
			changedById: userId,
			previousStatus: civicIssue.status,
			newStatus: LifecycleStatus.REOPENED,
			notes: payload.reason || "Reopened by dispatcher/manager.",
			tx,
		});

		// Audit
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.REOPEN,
				resource: Resource.CIVIC_ISSUE,
				resourceId: civicIssueId,
				oldValue: { status: civicIssue.status },
				newValue: { status: LifecycleStatus.REOPENED },
			},
		});

		// Notify reporters that the issue was reopened
		const reporters = await tx.issueReporter.findMany({
			where: { civicIssueId },
		});

		for (const reporter of reporters) {
			await tx.notification.create({
				data: {
					userId: reporter.citizenId,
					type: NotificationType.STATUS_CHANGED,
					title: "Issue Reopened",
					message: `Your reported issue "${civicIssue.title}" has been reopened for further action.`,
					resourceType: Resource.CIVIC_ISSUE,
					resourceId: civicIssueId,
				},
			});
		}

		return updatedIssue;
	});

	return result;
};

export const CivicIssueService = {
	triageServiceRequest,
	mergeServiceRequest,
	updateStatus,
	getCivicIssues,
	getCivicIssueById,
	reopenCivicIssue,
};
