import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { enqueueIssueProcessing } from "../queue/issueQueue";
import {
	checkMunicipalityAccess,
	checkDepartmentAccess,
} from "../../utils/abac.utils";
import httpStatus from "http-status";
import type { ICreateServiceRequestPayload } from "./service-request.interface";
import {
	Action,
	Resource,
	LifecycleStatus,
} from "../../../generated/prisma/enums";
import { createAuditLog } from "../../utils/auditLogger";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { serviceRequestSearchableFields } from "./service-request.constant";
import { generateTrackingNumber } from "./service-request.utils";

const createServiceRequest = async (
	userId: string,
	payload: ICreateServiceRequestPayload,
	idempotencyKey?: string,
) => {
	// Validate mandatory fields
	if (!userId) throw new AppError(httpStatus.FORBIDDEN, "User ID missing");

	const trackingNumber = await generateTrackingNumber();

	return await prisma.$transaction(async (tx) => {
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
				description: payload.request.description,
				municipalityId: payload.location.municipalityId,
				categoryId: payload.request.categoryId,
				citizenId: userId,
				locationId: location.id,
				status: LifecycleStatus.SUBMITTED,
				idempotencyKey,
				processingStatus: "PENDING",
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

		// Enqueue background processing
		await enqueueIssueProcessing(request.id);

		return request;
	});
};

const getMyServiceRequests = async (
	userId: string,
	filters: any = {},
	options: any = {},
) => {
	const isPendingFeedback =
		filters.pendingFeedback === "true" || filters.pendingFeedback === true;
	delete filters.pendingFeedback;

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		serviceRequestSearchableFields,
	);

	where.citizenId = userId;

	if (isPendingFeedback) {
		where.feedback = { is: null };
		where.civicIssue = {
			...(where.civicIssue || {}),
			workOrders: {
				some: {
					resolution: {
						is: {
							rejectedAt: null,
						},
					},
				},
			},
		};
	}

	const [data, total] = await Promise.all([
		prisma.serviceRequest.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				location: true,
				attachments: true,
				category: true,
				feedback: true,
				civicIssue: {
					select: {
						id: true,
						status: true,
						issueNumber: true,
						priority: true,
						workOrders: {
							where: {
								resolution: {
									is: {
										rejectedAt: null,
									},
								},
							},
							select: {
								id: true,
								status: true,
								resolution: {
									select: {
										id: true,
										summary: true,
										submittedAt: true,
										approvedAt: true,
										rejectedAt: true,
										attachments: true,
									},
								},
							},
							orderBy: { createdAt: "desc" },
							take: 1,
						},
					},
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

const getPendingFeedbackServiceRequests = async (
	userId: string,
	filters: any = {},
	options: any = {},
) => {
	return getMyServiceRequests(
		userId,
		{ ...filters, pendingFeedback: true },
		options,
	);
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

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
	}

	if (request.citizenId !== userId && request.location?.municipalityId) {
		await checkMunicipalityAccess(userId, request.location.municipalityId);
	}

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

const getServiceRequestsByCivicIssue = async (
	civicIssueId: string,
	userId: string,
	filters: any = {},
	options: any = {},
) => {
	const civicIssue = await prisma.civicIssue.findUnique({
		where: { id: civicIssueId },
	});

	if (!civicIssue) {
		throw new AppError(httpStatus.NOT_FOUND, "Civic issue not found");
	}

	await checkMunicipalityAccess(userId, civicIssue.municipalityId);

	filters.civicIssueId = civicIssueId;
	return getAllServiceRequests(filters, options);
};

const getMunicipalityServiceRequests = async (
	userId: string,
	municipalityId: string,
	filters: any = {},
	options: any = {},
) => {
	await checkMunicipalityAccess(userId, municipalityId);
	filters.municipalityId = municipalityId;
	return getAllServiceRequests(filters, options);
};

const getDepartmentServiceRequests = async (
	userId: string,
	departmentId: string,
	filters: any = {},
	options: any = {},
) => {
	await checkDepartmentAccess(userId, departmentId);

	const { stage, wardId, categoryId, ...restFilters } = filters;

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		restFilters,
		options,
		serviceRequestSearchableFields,
	);

	const departmentScope = {
		OR: [
			{ category: { departmentId } },
			{ civicIssue: { departmentId } },
		],
	};

	const additionalConditions: any[] = [departmentScope];

	if (categoryId) {
		additionalConditions.push({ categoryId });
	}

	if (wardId) {
		additionalConditions.push({
			location: { wardId },
		});
	}

	if (stage === "queue") {
		// New intake requests awaiting triage / resolution
		additionalConditions.push({
			status: {
				in: [LifecycleStatus.SUBMITTED, LifecycleStatus.TRIAGED],
			},
		});
	} else if (stage === "in_progress") {
		// Requests linked to ongoing issues / field work
		additionalConditions.push({
			status: {
				in: [
					LifecycleStatus.ASSIGNED,
					LifecycleStatus.TEAM_ASSIGNED,
					LifecycleStatus.IN_PROGRESS,
					LifecycleStatus.PENDING_VERIFICATION,
				],
			},
		});
	} else if (stage === "resolved") {
		// Requests marked as resolved or closed
		additionalConditions.push({
			status: {
				in: [LifecycleStatus.RESOLVED, LifecycleStatus.CLOSED],
			},
		});
	}

	if (where.AND) {
		where.AND = [...where.AND, ...additionalConditions];
	} else {
		where.AND = additionalConditions;
	}

	const [data, total] = await Promise.all([
		prisma.serviceRequest.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				citizen: {
					select: {
						userId: true,
						firstName: true,
						lastName: true,
						trustLevel: true,
						user: { select: { email: true, phone: true } },
					},
				},
				category: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
				location: true,
				attachments: true,
				feedback: true,
				civicIssue: {
					select: {
						id: true,
						issueNumber: true,
						title: true,
						status: true,
						priority: {
							select: {
								id: true,
								code: true,
								name: true,
								colorCode: true,
							},
						},
						workOrders: {
							orderBy: { createdAt: "desc" },
							take: 1,
							select: {
								id: true,
								title: true,
								status: true,
								currentAssignee: {
									select: {
										employeeId: true,
										firstName: true,
										lastName: true,
									},
								},
							},
						},
					},
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

const getServiceRequestByTrackingNumber = async (trackingNumber: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: { trackingNumber },
		include: {
			location: true,
			category: true,
			attachments: true,
			civicIssue: {
				include: {
					priority: true,
					department: { select: { id: true, name: true, email: true, phone: true } },
					history: {
						orderBy: { createdAt: "desc" },
					},
					workOrders: {
						include: {
							assignments: {
								include: { assignedTo: { select: { firstName: true, lastName: true } } },
							},
							resolution: true,
						},
					},
				},
			},
		},
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found with this tracking number");
	}

	return request;
};

export const ServiceRequestService = {
	createServiceRequest,
	getMyServiceRequests,
	getPendingFeedbackServiceRequests,
	getServiceRequestById,
	getServiceRequestByTrackingNumber,
	getAllServiceRequests,
	getServiceRequestsByCivicIssue,
	getMunicipalityServiceRequests,
	getDepartmentServiceRequests,
};
