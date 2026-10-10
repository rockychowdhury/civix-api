import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
	LifecycleStatus,
	ServiceCoverageStatus,
} from "../../../generated/prisma/enums";
import type {
	ICreateMunicipality,
	IUpdateMunicipality,
	IMunicipalityOverviewQuery,
	IMunicipalityOverviewResponse,
} from "./municipality.interface";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { municipalitySearchableFields } from "./municipality.constant";
import { checkMunicipalityAccess } from "../../utils/abac.utils";

const getMunicipalities = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		municipalitySearchableFields,
	);

	// Default active coverage if no specific status requested
	if (!where.coverageStatus) {
		where.coverageStatus = { not: ServiceCoverageStatus.INACTIVE };
	}

	const [data, total] = await Promise.all([
		prisma.municipality.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { name: "asc" },
			skip,
			take,
		}),
		prisma.municipality.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const createMunicipality = async (payload: ICreateMunicipality) => {
	const isExists = await prisma.municipality.findUnique({
		where: { code: payload.code },
	});
	if (isExists)
		throw new AppError(httpStatus.CONFLICT, "Municipality code already exists");

	return await prisma.municipality.create({ data: payload });
};

const getMunicipalityById = async (id: string) => {
	const municipality = await prisma.municipality.findUnique({ where: { id } });
	if (!municipality)
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");
	return municipality;
};

const updateMunicipality = async (id: string, payload: IUpdateMunicipality) => {
	const municipality = await prisma.municipality.findUnique({ where: { id } });
	if (!municipality)
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");

	if (payload.code) {
		const isExists = await prisma.municipality.findFirst({
			where: { code: payload.code, id: { not: id } },
		});
		if (isExists)
			throw new AppError(
				httpStatus.CONFLICT,
				"Municipality code already exists",
			);
	}

	return await prisma.municipality.update({ where: { id }, data: payload });
};

const deleteMunicipality = async (id: string) => {
	const municipality = await prisma.municipality.findUnique({ where: { id } });
	if (!municipality)
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");

	return await prisma.municipality.update({
		where: { id },
		data: { coverageStatus: ServiceCoverageStatus.INACTIVE },
	});
};

const getMunicipalityOverview = async (
	userId: string,
	municipalityId: string,
	query: IMunicipalityOverviewQuery = {},
): Promise<IMunicipalityOverviewResponse> => {
	await checkMunicipalityAccess(userId, municipalityId);

	const now = new Date();
	let startDate: Date | null = null;
	let endDate: Date | null = null;

	if (query.startDate) {
		startDate = new Date(query.startDate);
		endDate = query.endDate ? new Date(query.endDate) : now;
	} else if (query.timeRange) {
		switch (query.timeRange) {
			case "today": {
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				endDate = now;
				break;
			}
			case "this_week": {
				const startOfWeek = new Date(now);
				startOfWeek.setDate(now.getDate() - 7);
				startDate = startOfWeek;
				endDate = now;
				break;
			}
			case "this_month": {
				startDate = new Date(now.getFullYear(), now.getMonth(), 1);
				endDate = now;
				break;
			}
			case "this_year": {
				startDate = new Date(now.getFullYear(), 0, 1);
				endDate = now;
				break;
			}
			case "all_time":
			default:
				startDate = null;
				endDate = null;
				break;
		}
	}

	const dateFilter = startDate
		? { gte: startDate, ...(endDate ? { lte: endDate } : {}) }
		: undefined;

	// Execute queries in parallel for peak performance
	const [
		municipality,
		totalWards,
		// Civic Issues
		totalIssues,
		periodIssuesCount,
		issueGroupBy,
		priorityGroupBy,
		priorities,
		unassignedIssuesCount,
		escalatedIssuesCount,
		overdueIssuesCount,
		// Service Requests
		totalRequests,
		periodRequestsCount,
		requestGroupBy,
		// Work Orders
		totalWorkOrders,
		periodWorkOrdersCount,
		workOrderGroupBy,
		overdueWorkOrdersCount,
		// Staff & Technicians
		staffProfiles,
		// Departments performance
		departments,
		// Ward hotspots
		wardHotspotsRaw,
		// Citizen satisfaction feedbacks
		feedbacks,
		// Quick queues
		criticalEscalatedIssues,
		overdueWorkOrders,
		recentIssues,
	] = await Promise.all([
		// 1. Municipality info & core counts
		prisma.municipality.findUnique({
			where: { id: municipalityId },
			include: {
				_count: {
					select: {
						departments: { where: { status: "ACTIVE" } },
						zones: { where: { coverageStatus: "ACTIVE" } },
						staffProfiles: true,
						slaPolicies: true,
					},
				},
			},
		}),

		// 2. Total active wards in municipality
		prisma.ward.count({
			where: {
				zone: { municipalityId },
				coverageStatus: "ACTIVE",
			},
		}),

		// 3. Civic issues all-time total
		prisma.civicIssue.count({ where: { municipalityId } }),

		// 4. Civic issues in period
		dateFilter
			? prisma.civicIssue.count({
					where: { municipalityId, createdAt: dateFilter },
				})
			: Promise.resolve(null),

		// 5. Civic issues status breakdown
		prisma.civicIssue.groupBy({
			by: ["status"],
			where: {
				municipalityId,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),

		// 6. Civic issues priority breakdown
		prisma.civicIssue.groupBy({
			by: ["priorityId"],
			where: {
				municipalityId,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),

		// 7. Active priority levels metadata
		prisma.priorityLevel.findMany({
			where: { isActive: true },
			orderBy: { weight: "desc" },
			select: { id: true, code: true, name: true, weight: true, colorCode: true },
		}),

		// 8. Unassigned queue (open issues with no work order)
		prisma.civicIssue.count({
			where: {
				municipalityId,
				workOrders: { none: {} },
				status: {
					notIn: [
						LifecycleStatus.RESOLVED,
						LifecycleStatus.CLOSED,
						LifecycleStatus.CANCELLED,
					],
				},
			},
		}),

		// 9. Active unresolved escalations
		prisma.civicIssue.count({
			where: {
				municipalityId,
				escalations: { some: { resolvedAt: null } },
			},
		}),

		// 10. Overdue civic issues
		prisma.civicIssue.count({
			where: {
				municipalityId,
				status: {
					notIn: [
						LifecycleStatus.RESOLVED,
						LifecycleStatus.CLOSED,
						LifecycleStatus.CANCELLED,
					],
				},
				resolutionDeadlineAt: { lt: now },
			},
		}),

		// 11. Service Requests all-time total
		prisma.serviceRequest.count({ where: { municipalityId } }),

		// 12. Service Requests in period
		dateFilter
			? prisma.serviceRequest.count({
					where: { municipalityId, createdAt: dateFilter },
				})
			: Promise.resolve(null),

		// 13. Service Requests status breakdown
		prisma.serviceRequest.groupBy({
			by: ["status"],
			where: {
				municipalityId,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),

		// 14. Work Orders all-time total
		prisma.workOrder.count({ where: { department: { municipalityId } } }),

		// 15. Work Orders in period
		dateFilter
			? prisma.workOrder.count({
					where: { department: { municipalityId }, createdAt: dateFilter },
				})
			: Promise.resolve(null),

		// 16. Work Orders status breakdown
		prisma.workOrder.groupBy({
			by: ["status"],
			where: {
				department: { municipalityId },
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),

		// 17. Overdue Work Orders
		prisma.workOrder.count({
			where: {
				department: { municipalityId },
				status: {
					notIn: [
						LifecycleStatus.RESOLVED,
						LifecycleStatus.CLOSED,
						LifecycleStatus.CANCELLED,
					],
				},
				scheduledAt: { lt: now },
			},
		}),

		// 18. Staff profiles with roles and availability
		prisma.staffProfile.findMany({
			where: { municipalityId },
			select: {
				userId: true,
				isAvailable: true,
				user: {
					select: {
						userRoles: {
							select: {
								role: { select: { code: true } },
							},
						},
					},
				},
			},
		}),

		// 19. Departments with metrics
		prisma.department.findMany({
			where: { municipalityId, status: "ACTIVE" },
			select: {
				id: true,
				name: true,
				code: true,
				_count: {
					select: {
						members: { where: { leftAt: null } },
						workOrders: {
							where: {
								status: {
									in: [
										LifecycleStatus.WORK_ORDER_CREATED,
										LifecycleStatus.ASSIGNED,
										LifecycleStatus.IN_PROGRESS,
										LifecycleStatus.PENDING_VERIFICATION,
									],
								},
							},
						},
						civicIssues: {
							where: {
								status: {
									notIn: [
										LifecycleStatus.RESOLVED,
										LifecycleStatus.CLOSED,
										LifecycleStatus.CANCELLED,
									],
								},
							},
						},
					},
				},
				civicIssues: {
					where: {
						status: { in: [LifecycleStatus.RESOLVED, LifecycleStatus.CLOSED] },
					},
					select: { id: true },
				},
			},
			orderBy: { name: "asc" },
		}),

		// 20. Top Ward hotspots with open issues
		prisma.ward.findMany({
			where: { zone: { municipalityId } },
			select: {
				id: true,
				number: true,
				name: true,
				zone: { select: { name: true } },
				_count: {
					select: {
						civicIssues: {
							where: {
								status: {
									notIn: [
										LifecycleStatus.RESOLVED,
										LifecycleStatus.CLOSED,
										LifecycleStatus.CANCELLED,
									],
								},
							},
						},
					},
				},
			},
			orderBy: {
				civicIssues: { _count: "desc" },
			},
			take: 5,
		}),

		// 21. Citizen Feedback for municipality
		prisma.feedback.findMany({
			where: {
				serviceRequest: { municipalityId },
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			select: { rating: true },
		}),

		// 22. Quick Queue: Critical & Escalated Issues (top 5)
		prisma.civicIssue.findMany({
			where: {
				municipalityId,
				escalations: { some: { resolvedAt: null } },
			},
			include: {
				department: { select: { name: true } },
				priority: { select: { code: true, name: true, colorCode: true } },
				ward: { select: { number: true, name: true } },
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
		}),

		// 23. Quick Queue: Overdue or Pending Work Orders (top 5)
		prisma.workOrder.findMany({
			where: {
				department: { municipalityId },
				status: {
					in: [
						LifecycleStatus.WORK_ORDER_CREATED,
						LifecycleStatus.ASSIGNED,
						LifecycleStatus.IN_PROGRESS,
					],
				},
			},
			include: {
				department: { select: { name: true } },
				civicIssue: {
					select: {
						issueNumber: true,
						resolutionDeadlineAt: true,
						priority: { select: { code: true, name: true } },
					},
				},
			},
			orderBy: { createdAt: "asc" },
			take: 5,
		}),

		// 24. Quick Queue: Recent Issues (top 5)
		prisma.civicIssue.findMany({
			where: { municipalityId },
			include: {
				department: { select: { name: true } },
				priority: { select: { code: true, name: true, colorCode: true } },
			},
			orderBy: { createdAt: "desc" },
			take: 5,
		}),
	]);

	if (!municipality) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");
	}

	// Compute Issue Stats
	const issueStatusMap: Record<string, number> = {};
	issueGroupBy.forEach((g) => {
		issueStatusMap[g.status] = g._count.id;
	});

	const openIssuesCount = issueGroupBy
		.filter(
			(g) =>
				g.status !== LifecycleStatus.RESOLVED &&
				g.status !== LifecycleStatus.CLOSED &&
				g.status !== LifecycleStatus.CANCELLED,
		)
		.reduce((sum, g) => sum + g._count.id, 0);

	const resolvedIssuesTotal = issueStatusMap[LifecycleStatus.RESOLVED] || 0;
	const closedIssuesTotal = issueStatusMap[LifecycleStatus.CLOSED] || 0;
	const periodIssueSum = periodIssuesCount ?? totalIssues;
	const resolvedPlusClosed = resolvedIssuesTotal + closedIssuesTotal;
	const resolutionRate =
		totalIssues > 0
			? Number(((resolvedPlusClosed / totalIssues) * 100).toFixed(1))
			: 0;

	const priorityCountMap: Record<string, number> = {};
	priorityGroupBy.forEach((g) => {
		if (g.priorityId) {
			priorityCountMap[g.priorityId] = g._count.id;
		}
	});

	const issuePriorityStats = priorities.map((p) => ({
		id: p.id,
		code: p.code,
		name: p.name,
		weight: p.weight,
		colorCode: p.colorCode,
		count: priorityCountMap[p.id] || 0,
	}));

	// Compute Service Request Stats
	const requestStatusMap: Record<string, number> = {};
	requestGroupBy.forEach((g) => {
		requestStatusMap[g.status] = g._count.id;
	});

	const srQueueCount =
		(requestStatusMap[LifecycleStatus.SUBMITTED] || 0) +
		(requestStatusMap[LifecycleStatus.TRIAGED] || 0);

	const srInProgressCount =
		(requestStatusMap[LifecycleStatus.ASSIGNED] || 0) +
		(requestStatusMap[LifecycleStatus.IN_PROGRESS] || 0) +
		(requestStatusMap[LifecycleStatus.PENDING_VERIFICATION] || 0);

	const srResolvedCount =
		(requestStatusMap[LifecycleStatus.RESOLVED] || 0) +
		(requestStatusMap[LifecycleStatus.CLOSED] || 0);

	// Compute Work Order Stats
	const woStatusMap: Record<string, number> = {};
	workOrderGroupBy.forEach((g) => {
		woStatusMap[g.status] = g._count.id;
	});

	const needCrewCount = woStatusMap[LifecycleStatus.WORK_ORDER_CREATED] || 0;
	const woAssignedCount =
		(woStatusMap[LifecycleStatus.ASSIGNED] || 0) +
		(woStatusMap[LifecycleStatus.TEAM_ASSIGNED] || 0);
	const woInProgressCount = woStatusMap[LifecycleStatus.IN_PROGRESS] || 0;
	const woPendingVerificationCount =
		woStatusMap[LifecycleStatus.PENDING_VERIFICATION] || 0;
	const woResolvedCount = woStatusMap[LifecycleStatus.RESOLVED] || 0;
	const woClosedCount = woStatusMap[LifecycleStatus.CLOSED] || 0;
	const woActiveTotal =
		needCrewCount +
		woAssignedCount +
		woInProgressCount +
		woPendingVerificationCount;

	// Compute Staff Stats
	const staffByRoleMap: Record<string, number> = {};
	let totalTechnicians = 0;
	let availableTechnicians = 0;
	let busyTechnicians = 0;

	staffProfiles.forEach((sp) => {
		const roles = sp.user?.userRoles?.map((ur) => ur.role.code) || [];
		roles.forEach((r) => {
			staffByRoleMap[r] = (staffByRoleMap[r] || 0) + 1;
		});

		if (roles.includes("TECHNICIAN")) {
			totalTechnicians++;
			if (sp.isAvailable) {
				availableTechnicians++;
			} else {
				busyTechnicians++;
			}
		}
	});

	// Compute Department Performance
	const departmentPerformance = departments.map((d) => ({
		id: d.id,
		name: d.name,
		code: d.code,
		staffCount: d._count.members,
		activeWorkOrders: d._count.workOrders,
		openIssues: d._count.civicIssues,
		resolvedIssues: d.civicIssues.length,
		escalatedIssues: 0,
	}));

	// Compute Ward Hotspots
	const wardHotspots = wardHotspotsRaw.map((w) => ({
		id: w.id,
		wardNumber: w.number,
		name: w.name,
		zoneName: w.zone.name,
		openIssuesCount: w._count.civicIssues,
		totalIssuesCount: w._count.civicIssues,
	}));

	// Compute Feedback / Citizen Satisfaction
	const ratingDistribution: Record<number, number> = {
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
	};
	let ratingSum = 0;
	feedbacks.forEach((f) => {
		if (f.rating >= 1 && f.rating <= 5) {
			ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1;
		}
		ratingSum += f.rating;
	});

	const averageRating =
		feedbacks.length > 0
			? Number((ratingSum / feedbacks.length).toFixed(2))
			: 0;

	return {
		municipality: {
			id: municipality.id,
			name: municipality.name,
			code: municipality.code,
			countryCode: municipality.countryCode,
			timezone: municipality.timezone,
			coverageStatus: municipality.coverageStatus,
			counts: {
				totalDepartments: municipality._count.departments,
				totalZones: municipality._count.zones,
				totalWards,
				totalStaff: municipality._count.staffProfiles,
				totalSlaPolicies: municipality._count.slaPolicies,
			},
		},
		timeRange: {
			filter: query.timeRange || (query.startDate ? "custom" : "all_time"),
			startDate: startDate ? startDate.toISOString() : null,
			endDate: endDate ? endDate.toISOString() : null,
		},
		issueStats: {
			total: totalIssues,
			periodTotal: periodIssueSum,
			openTotal: openIssuesCount,
			unassignedQueue: unassignedIssuesCount,
			escalatedCount: escalatedIssuesCount,
			overdueCount: overdueIssuesCount,
			resolvedTotal: resolvedIssuesTotal,
			closedTotal: closedIssuesTotal,
			resolutionRate,
			byStatus: issueStatusMap,
			byPriority: issuePriorityStats,
		},
		serviceRequestStats: {
			total: totalRequests,
			periodTotal: periodRequestsCount ?? totalRequests,
			queueCount: srQueueCount,
			inProgressCount: srInProgressCount,
			resolvedCount: srResolvedCount,
			byStatus: requestStatusMap,
		},
		workOrderStats: {
			total: totalWorkOrders,
			periodTotal: periodWorkOrdersCount ?? totalWorkOrders,
			needCrew: needCrewCount,
			assigned: woAssignedCount,
			inProgress: woInProgressCount,
			pendingVerification: woPendingVerificationCount,
			resolved: woResolvedCount,
			closed: woClosedCount,
			activeTotal: woActiveTotal,
			overdueCount: overdueWorkOrdersCount,
		},
		staffStats: {
			totalStaff: staffProfiles.length,
			byRole: staffByRoleMap,
			technicians: {
				total: totalTechnicians,
				available: availableTechnicians,
				busy: busyTechnicians,
			},
		},
		departmentPerformance,
		wardHotspots,
		citizenSatisfaction: {
			averageRating,
			totalFeedbacks: feedbacks.length,
			ratingDistribution,
		},
		quickQueues: {
			criticalEscalatedIssues,
			overdueWorkOrders,
			recentIssues,
		},
	};
};

export const MunicipalityService = {
	getMunicipalities,
	createMunicipality,
	getMunicipalityById,
	updateMunicipality,
	deleteMunicipality,
	getMunicipalityOverview,
};

