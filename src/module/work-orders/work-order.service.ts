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
	type LifecycleStatus,
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
				priority: civicIssue.priority, // Inherit priority
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
				: { priority: "desc", createdAt: "desc" },
			skip,
			take,
			include: {
				civicIssue: { select: { issueNumber: true, location: true } },
				currentAssignee: { select: { firstName: true, lastName: true } },
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
				: { priority: "desc", createdAt: "desc" },
			skip,
			take,
			include: {
				civicIssue: { select: { issueNumber: true, location: true } },
				currentAssignee: { select: { firstName: true, lastName: true } },
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
				: { priority: "desc", createdAt: "desc" },
			skip,
			take,
			include: {
				civicIssue: { select: { issueNumber: true, location: true } },
				currentAssignee: { select: { firstName: true, lastName: true } },
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
			civicIssue: true,
			currentAssignee: true,
			assignments: true,
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

export const WorkOrderService = {
	createWorkOrder,
	getWorkOrders,
	getWorkOrdersByMunicipality,
	getWorkOrdersByDepartment,
	getWorkOrderById,
	updateWorkOrderStatus,
};
