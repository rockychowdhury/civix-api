import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type {
	ICreateWorkOrderPayload,
	IUpdateWorkOrderStatusPayload,
} from "./work-order.interface";
import {
	Action,
	Resource,
	LifecycleStatus,
} from "../../../generated/prisma/enums";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { workOrderSearchableFields } from "./work-order.constant";
import {
	generateWorkOrderTitle,
	generateWorkOrderDescription,
} from "./work-order.utils";
import {
	checkDepartmentAccess,
	checkMunicipalityAccess,
} from "../../utils/abac.utils";
import { createCivicIssueHistory } from "../../utils/civicIssueHistory";

const createWorkOrder = async (
	userId: string,
	payload: ICreateWorkOrderPayload,
) => {
	const civicIssue = await prisma.civicIssue.findUnique({
		where: { id: payload.civicIssueId },
		include: {
			category: true,
			location: true,
		},
	});

	if (!civicIssue) {
		throw new AppError(httpStatus.NOT_FOUND, "Civic issue not found");
	}

	const title =
		payload.title ||
		generateWorkOrderTitle(
			civicIssue.category?.name || "Issue",
			civicIssue.issueNumber,
		);
	const description =
		payload.description ||
		generateWorkOrderDescription(
			civicIssue.category?.workInstructions || null,
			civicIssue.location,
		);

	const departmentId = civicIssue.departmentId;
	if (!departmentId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Civic issue must be assigned to a department to create a work order",
		);
	}

	await checkDepartmentAccess(userId, departmentId);

	const result = await prisma.$transaction(async (tx) => {
		const workOrder = await tx.workOrder.create({
			data: {
				civicIssueId: payload.civicIssueId,
				departmentId,
				title,
				description,
				scheduledAt: payload.scheduledAt,
			},
		});

		// Audit
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.CREATE,
				resource: Resource.WORK_ORDER,
				resourceId: workOrder.id,
				newValue: JSON.parse(JSON.stringify(workOrder)),
			},
		});

		return workOrder;
	});

	return result;
};

const getWorkOrders = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		workOrderSearchableFields,
	);

	const [data, total] = await Promise.all([
		prisma.workOrder.findMany({
			where,
			orderBy: Object.keys(orderBy).length
				? orderBy
				: { civicIssue: { priority: { weight: "desc" } }, createdAt: "desc" },
			skip,
			take,
			include: {
				civicIssue: { include: { location: true, priority: true } },
				currentAssignee: {
					select: {
						firstName: true,
						lastName: true,
						user: { select: { email: true, phone: true } },
					},
				},
				department: true,
				assignments: {
					include: {
						assignedTo: {
							select: {
								firstName: true,
								lastName: true,
								user: { select: { email: true } },
							},
						},
					},
				},
				resolution: {
					include: { attachments: true },
				},
			},
		}),
		prisma.workOrder.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getWorkOrdersByMunicipality = async (
	userId: string,
	municipalityId: string,
	filters: any = {},
	options: any = {},
) => {
	await checkMunicipalityAccess(userId, municipalityId);

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		workOrderSearchableFields,
	);

	// Scope to the specific municipality
	const municipalityWhere = {
		...where,
		civicIssue: {
			...(where.civicIssue || {}),
			municipalityId,
		},
	};

	const [data, total] = await Promise.all([
		prisma.workOrder.findMany({
			where: municipalityWhere,
			orderBy: Object.keys(orderBy).length
				? orderBy
				: { civicIssue: { priority: { weight: "desc" } }, createdAt: "desc" },
			skip,
			take,
			include: {
				civicIssue: { include: { location: true, priority: true } },
				currentAssignee: {
					select: {
						firstName: true,
						lastName: true,
						user: { select: { email: true, phone: true } },
					},
				},
				department: true,
				assignments: {
					include: {
						assignedTo: {
							select: {
								firstName: true,
								lastName: true,
								user: { select: { email: true } },
							},
						},
					},
				},
				resolution: {
					include: { attachments: true },
				},
			},
		}),
		prisma.workOrder.count({ where: municipalityWhere }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getWorkOrdersByDepartment = async (
	userId: string,
	departmentId: string,
	filters: any = {},
	options: any = {},
) => {
	await checkDepartmentAccess(userId, departmentId);

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		workOrderSearchableFields,
	);

	// Scope to the specific department
	const departmentWhere = {
		...where,
		departmentId,
	};

	const [data, total] = await Promise.all([
		prisma.workOrder.findMany({
			where: departmentWhere,
			orderBy: Object.keys(orderBy).length
				? orderBy
				: { civicIssue: { priority: { weight: "desc" } }, createdAt: "desc" },
			skip,
			take,
			include: {
				civicIssue: { include: { location: true, priority: true } },
				currentAssignee: {
					select: {
						employeeId: true,
						firstName: true,
						lastName: true,
						user: { select: { email: true, phone: true } },
					},
				},
				department: true,
				assignments: {
					include: {
						assignedTo: {
							select: {
								employeeId: true,
								firstName: true,
								lastName: true,
								user: { select: { email: true } },
							},
						},
					},
				},
				resolution: {
					include: { attachments: true },
				},
			},
		}),
		prisma.workOrder.count({ where: departmentWhere }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getWorkOrderById = async (userId: string, id: string) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id },
		include: {
			civicIssue: { include: { priority: true, location: true } },
			currentAssignee: true,
			department: true,
			assignments: { include: { assignedTo: true } },
			updates: {
				orderBy: { createdAt: "desc" },
				include: { attachments: true },
			},
			resolution: { include: { attachments: true } },
		},
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	}

	await checkDepartmentAccess(userId, workOrder.departmentId);

	return workOrder;
};

const updateWorkOrderStatus = async (
	userId: string,
	id: string,
	payload: IUpdateWorkOrderStatusPayload,
) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	}

	await checkDepartmentAccess(userId, workOrder.departmentId);

	const result = await prisma.$transaction(async (tx) => {
		const updatedWorkOrder = await tx.workOrder.update({
			where: { id },
			data: { status: payload.status as LifecycleStatus },
		});

		// If work order is closed, also close assignments?
		// For MVP, we just update the work order.

		// Audit
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.UPDATE,
				resource: Resource.WORK_ORDER,
				resourceId: workOrder.id,
				oldValue: { status: workOrder.status },
				newValue: { status: payload.status },
			},
		});

		return updatedWorkOrder;
	});

	return result;
};

const getMyWorkOrders = async (
	userId: string,
	filters: any = {},
	options: any = {},
) => {
	const { stage, ...restFilters } = filters;

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		restFilters,
		options,
		workOrderSearchableFields,
	);

	// Fetch teams user belongs to
	const userTeamMemberships = await prisma.teamMember.findMany({
		where: { staffId: userId },
		select: { teamId: true },
	});
	const userTeamIds = userTeamMemberships.map((tm) => tm.teamId);

	// Scope: assigned directly or via team
	const assigneeScope = {
		OR: [
			{ currentAssigneeId: userId },
			{
				assignments: {
					some: {
						OR: [
							{ assignedToId: userId },
							...(userTeamIds.length > 0
								? [{ teamId: { in: userTeamIds } }]
								: []),
						],
					},
				},
			},
		],
	};

	const additionalConditions: any[] = [assigneeScope];

	if (stage === "active") {
		additionalConditions.push({
			status: { in: [LifecycleStatus.ACCEPTED, LifecycleStatus.IN_PROGRESS] },
		});
	} else if (stage === "pending") {
		additionalConditions.push({
			status: { in: [LifecycleStatus.ASSIGNED, LifecycleStatus.TEAM_ASSIGNED] },
		});
	} else if (stage === "verification") {
		additionalConditions.push({
			status: LifecycleStatus.PENDING_VERIFICATION,
		});
	} else if (stage === "completed") {
		additionalConditions.push({
			status: { in: [LifecycleStatus.RESOLVED, LifecycleStatus.CLOSED] },
		});
	}

	if (where.AND) {
		where.AND = [...where.AND, ...additionalConditions];
	} else {
		where.AND = additionalConditions;
	}

	const [data, total] = await Promise.all([
		prisma.workOrder.findMany({
			where,
			orderBy: Object.keys(orderBy).length
				? orderBy
				: [
						{ civicIssue: { priority: { weight: "desc" } } },
						{ createdAt: "desc" },
					],
			skip,
			take,
			include: {
				civicIssue: {
					include: {
						priority: true,
						location: true,
					},
				},
				department: {
					select: { id: true, name: true, code: true },
				},
				assignments: {
					where: {
						OR: [
							{ assignedToId: userId },
							...(userTeamIds.length > 0
								? [{ teamId: { in: userTeamIds } }]
								: []),
						],
					},
					include: {
						team: { select: { name: true } },
					},
				},
				updates: {
					orderBy: { createdAt: "desc" },
					take: 3,
					include: { attachments: true },
				},
				resolution: {
					include: { attachments: true },
				},
			},
		}),
		prisma.workOrder.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const quickActionWorkOrder = async (
	userId: string,
	id: string,
	payload: {
		action: "START" | "PAUSE" | "RESUME";
		notes?: string;
		attachmentIds?: string[];
	},
) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id },
		include: { civicIssue: true },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	}

	// Security: check department access
	await checkDepartmentAccess(userId, workOrder.departmentId);

	let newStatus: LifecycleStatus = workOrder.status;
	let updateType: "ON_SITE" | "PAUSED" | "RESUMED" = "ON_SITE";
	let noteText = payload.notes || "";

	if (payload.action === "START") {
		newStatus = LifecycleStatus.IN_PROGRESS;
		updateType = "ON_SITE";
		noteText = payload.notes || "Technician arrived on-site and began work.";
	} else if (payload.action === "PAUSE") {
		updateType = "PAUSED";
		noteText = payload.notes || "Work paused by technician.";
	} else if (payload.action === "RESUME") {
		newStatus = LifecycleStatus.IN_PROGRESS;
		updateType = "RESUMED";
		noteText = payload.notes || "Technician resumed work.";
	}

	const result = await prisma.$transaction(async (tx) => {
		// Update work order
		const updatedWorkOrder = await tx.workOrder.update({
			where: { id },
			data: {
				status: newStatus,
				...(payload.action === "START" &&
					!workOrder.startedAt && { startedAt: new Date() }),
			},
		});

		// Sync civic issue & service requests if status changed
		if (newStatus !== workOrder.status) {
			await tx.civicIssue.update({
				where: { id: workOrder.civicIssueId },
				data: { status: newStatus },
			});

			await tx.serviceRequest.updateMany({
				where: { civicIssueId: workOrder.civicIssueId },
				data: { status: newStatus },
			});

			await createCivicIssueHistory({
				civicIssueId: workOrder.civicIssueId,
				changedById: userId,
				previousStatus: workOrder.status as LifecycleStatus,
				newStatus,
				notes: `Quick action ${payload.action}: ${noteText}`,
				tx,
			});
		}

		// Log work update
		const update = await tx.workUpdate.create({
			data: {
				workOrderId: id,
				technicianId: userId,
				updateType,
				note: noteText,
			},
		});

		// Attach any photos
		if (payload.attachmentIds && payload.attachmentIds.length > 0) {
			await tx.attachment.updateMany({
				where: { id: { in: payload.attachmentIds }, uploadedById: userId },
				data: { workUpdateId: update.id },
			});
		}

		return updatedWorkOrder;
	});

	return result;
};

export const WorkOrderService = {
	createWorkOrder,
	getWorkOrders,
	getWorkOrdersByMunicipality,
	getWorkOrdersByDepartment,
	getWorkOrderById,
	updateWorkOrderStatus,
	getMyWorkOrders,
	quickActionWorkOrder,
};

