import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type { ICreateServiceRequestPayload } from "./service-request.interface";

import {
	Action,
	Resource,
	AttachmentPurpose,
	LifecycleStatus,
} from "../../../generated/prisma/enums";
import { createAuditLog } from "../../utils/auditLogger";
import { createCivicIssueHistory } from "../../utils/civicIssueHistory";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { serviceRequestSearchableFields } from "./service-request.constant";
import {
	generateIssueTitle,
	generateIssueDescription,
	priorityScore,
	getIssuePriority,
	calculateResponseDeadline,
	calculateResolutionDeadline,
	generateTrackingNumber,
	generateIssueNumber,
} from "./service-request.utils";

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
				categoryId: category.id,
				citizenId: userId,
				locationId: location.id,
			},
		});

		const threeDaysAgo = new Date();
		threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

		const duplicateIssue = await tx.civicIssue.findFirst({
			where: {
				categoryId: category.id,
				wardId: payload.location.wardId,
				createdAt: { gte: threeDaysAgo },
				status: {
					in: [
						LifecycleStatus.IN_PROGRESS,
						LifecycleStatus.REOPENED,
						LifecycleStatus.ASSIGNED,
					],
				},
			},
		});

		let finalStatus: LifecycleStatus = LifecycleStatus.SUBMITTED;

		if (duplicateIssue) {
			const reportedCount = duplicateIssue.reportedCount + 1;
			const hoursSinceFirstReport =
				Math.abs(
					new Date().getTime() - duplicateIssue.firstReportedAt.getTime(),
				) / 3600000;
			const pScore = priorityScore(
				category.baseSeverity,
				reportedCount,
				hoursSinceFirstReport,
			);
			const newPriority = getIssuePriority(pScore);

			let responseDeadlineAt = duplicateIssue.responseDeadlineAt;
			let resolutionDeadlineAt = duplicateIssue.resolutionDeadlineAt;

			if (
				newPriority !== duplicateIssue.priority &&
				duplicateIssue.status === LifecycleStatus.IN_PROGRESS
			) {
				const slaPolicy = await tx.slaPolicy.findFirst({
					where: {
						municipalityId: payload.location.municipalityId,
						categoryId: category.id,
						priority: newPriority,
					},
				});
				if (slaPolicy) {
					responseDeadlineAt = calculateResponseDeadline(
						slaPolicy.responseMinutes,
						duplicateIssue.createdAt,
					);
					resolutionDeadlineAt = calculateResolutionDeadline(
						slaPolicy.resolutionMinutes,
						duplicateIssue.createdAt,
					);
				}
			}

			await tx.civicIssue.update({
				where: { id: duplicateIssue.id },
				data: {
					reportedCount,
					lastReportedAt: new Date(),
					priority: newPriority,
					responseDeadlineAt,
					resolutionDeadlineAt,
				},
			});

			finalStatus = duplicateIssue.status;

			await tx.serviceRequest.update({
				where: { id: request.id },
				data: { civicIssueId: duplicateIssue.id, status: finalStatus },
			});
			(request as any).status = finalStatus;
			(request as any).civicIssueId = duplicateIssue.id;
		} else {
			const pScore = priorityScore(category.baseSeverity, 1, 0);
			const initialPriority = getIssuePriority(pScore);
			const slaPolicy = await tx.slaPolicy.findFirst({
				where: {
					municipalityId: payload.location.municipalityId,
					categoryId: category.id,
					priority: initialPriority,
				},
			});

			let responseDeadlineAt = null;
			let resolutionDeadlineAt = null;
			if (slaPolicy) {
				responseDeadlineAt = calculateResponseDeadline(
					slaPolicy.responseMinutes,
				);
				resolutionDeadlineAt = calculateResolutionDeadline(
					slaPolicy.resolutionMinutes,
				);
			}

			let wardName = payload.location.wardId;
			if (payload.location.wardId) {
				const ward = await tx.ward.findUnique({
					where: { id: payload.location.wardId },
				});
				if (ward) wardName = ward.name;
			}

			let zoneName = payload.location.zoneId;
			if (payload.location.zoneId) {
				const zone = await tx.zone.findUnique({
					where: { id: payload.location.zoneId },
				});
				if (zone) zoneName = zone.name;
			}

			const newIssue = await tx.civicIssue.create({
				data: {
					issueNumber,
					municipalityId: payload.location.municipalityId,
					categoryId: category.id,
					locationId: location.id,
					departmentId: category.departmentId,
					title: generateIssueTitle(category.name, wardName, zoneName),
					description: generateIssueDescription(
						category.name,
						category.description,
						{
							...payload.location,
							wardId: wardName,
							zoneId: zoneName,
						},
						payload.request.description,
						new Date(),
					),
					status: LifecycleStatus.IN_PROGRESS,
					priority: initialPriority,
					reportedCount: 1,
					wardId: payload.location.wardId,
					responseDeadlineAt,
					resolutionDeadlineAt,
				},
			});

			finalStatus = newIssue.status;

			// Record the birth of this civic issue in the history timeline
			await createCivicIssueHistory({
				civicIssueId: newIssue.id,
				changedById: null, // System-generated from citizen report
				previousStatus: null,
				newStatus: finalStatus,
				notes: `Auto-created from service request ${trackingNumber}`,
				tx,
			});

			await tx.serviceRequest.update({
				where: { id: request.id },
				data: { civicIssueId: newIssue.id, status: finalStatus },
			});
			(request as any).status = finalStatus;
			(request as any).civicIssueId = newIssue.id;
		}
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
		where: { id, },
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

	if (request.citizenId !== userId) {
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true },
		});
		
		const roleCodes = userRoles.map((ur) => ur.role.code);
		
		const hasAccess = roleCodes.some((code) => 
			["SUPER_ADMIN", "PLATFORM_ADMIN", "CITY_ADMIN", "DEPARTMENT_MANAGER", "DISPATCHER"].includes(code)
		);
		
		if (!hasAccess) {
			throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to view this service request");
		}
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

export const ServiceRequestService = {
	createServiceRequest,
	getMyServiceRequests,
	getServiceRequestById,
	getAllServiceRequests,
};
