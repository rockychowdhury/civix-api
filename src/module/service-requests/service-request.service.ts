import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type { ICreateServiceRequestPayload } from "./service-request.interface";
import {
	generateTrackingNumber,
	generateIssueNumber,
} from "../../utils/generateTrackingNumber"; // We will create this utility
import {
	Action,
	Resource,
	AttachmentPurpose,
	LifecycleStatus,
} from "../../../generated/prisma/enums";
import { createAuditLog } from "../../utils/auditLogger";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { serviceRequestSearchableFields } from "./service-request.constant";

const createServiceRequest = async (
	userId: string,
	payload: ICreateServiceRequestPayload,
) => {
	const citizen = await prisma.citizenProfile.findUnique({
		where: { userId },
	});

	if (!citizen) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only registered citizens are allowed to submit requests",
		);
	}

	const municipality = await prisma.municipality.findUnique({
		where: { id: payload.location.municipalityId },
	});

	if (!municipality) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid municipality ID");
	}

	const trackingNumber = await generateTrackingNumber();
	const issueNumber = await generateIssueNumber();

	const result = await prisma.$transaction(async (tx) => {
		const category = await tx.serviceCategory.findUnique({
			where: { id: payload.request.categoryId },
		});

		if (!category) {
			throw new AppError(httpStatus.BAD_REQUEST, "Invalid category ID");
		}

		// const civicIssue = await tx.civicIssue.create({
		// 	data: {
		// 		issueNumber,
		// 		municipalityId: payload.request.municipalityId,
		// 		categoryId: payload.request.categoryId,
		// 		locationId: location.id,
		// 		departmentId: category.departmentId,
		// 		title: payload.request.title,
		// 		description: payload.request.description,
		// 		status: LifecycleStatus.SUBMITTED,
		// 	},
		// });

		// Create WorkOrder if department is assigned
		// if (category.departmentId) {
		// 	await tx.workOrder.create({
		// 		data: {
		// 			civicIssueId: civicIssue.id,
		// 			title: `Fix: ${payload.request.title}`,

		// 			description: payload.request.description,
		// 		},
		// 	});
		// }

		const location = await tx.location.create({
			data: {
				latitude: payload.location.latitude,
				longitude: payload.location.longitude,
				address: payload.location.address,
				landmark: payload.location.landmark,
				postalCode: payload.location.postalCode,
				wardId: payload.location.wardId,
				zoneId: payload.location.zoneId,
				municipalityId: payload.location.municipalityId,
			},
		});
		const request = await tx.serviceRequest.create({
			data: {
				trackingNumber,
				title: payload.request.title,
				description: payload.request.description,
				municipalityId: payload.location.municipalityId,
				categoryId: category.id,
				citizenId: userId,
				locationId: location.id,
			},
		});
		await createAuditLog({
			userId,
			action: Action.CREATE,
			resource: Resource.SERVICE_REQUEST,
			resourceId: request.id,
			newValue: request,
			tx,
		});

		await tx.citizenProfile.update({
			where: { userId },
			data: { totalReports: { increment: 1 } },
		});
		return tx.serviceRequest.findUnique({
			where: { id: request.id },
			include: {
				attachments: true,
				location: true,
				category: true,
				civicIssue: true,
			},
		});
	});

	return result;
};

const getMyServiceRequests = async (
	userId: string,
	filters: any = {},
	options: any = {},
) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		serviceRequestSearchableFields,
	);

	where.citizenId = userId;

	const [data, total] = await Promise.all([
		prisma.serviceRequest.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				location: true,
				attachments: true,
				civicIssue: {
					select: { status: true, issueNumber: true, priority: true },
				},
			},
		}),
		prisma.serviceRequest.count({ where }),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getServiceRequestById = async (id: string, userId?: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: { id },
		include: {
			citizen: {
				select: {
					firstName: true,
					lastName: true,
					trustLevel: true,
					user: { select: { email: true } },
				},
			},
			location: true,
			attachments: true,
			civicIssue: true,
		},
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	// Security: If not anonymous, or if this user is a staff/admin, it's fine.
	// But if it IS anonymous, we should hide the citizen info unless the requester is staff.
	// We'll leave advanced RBAC logic for the controller/middleware,
	// but here we can strip out citizen info if it's anonymous and requested by a non-staff user.

	return request;
};

const getAllServiceRequests = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		serviceRequestSearchableFields,
	);

	const [data, total] = await Promise.all([
		prisma.serviceRequest.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "asc" }, // Oldest first for triage
			skip,
			take,
			include: {
				citizen: {
					select: { firstName: true, lastName: true, trustLevel: true },
				},
				location: true,
			},
		}),
		prisma.serviceRequest.count({ where }),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

export const ServiceRequestService = {
	createServiceRequest,
	getMyServiceRequests,
	getServiceRequestById,
	getAllServiceRequests,
};
