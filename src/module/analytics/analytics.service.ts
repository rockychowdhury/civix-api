import httpStatus from "http-status";
import {
	Action,
	LifecycleStatus,
	Resource,
	ServiceCoverageStatus,
	UserStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	IMunicipalityPerformance,
	IPriorityStat,
	ISystemOverviewQuery,
	ISystemOverviewResponse,
	ISystemTrendPoint,
} from "./analytics.interface";

const getDashboardStats = async (municipalityId?: string) => {
	const where = municipalityId ? { municipalityId } : {};

	const totalIssues = await prisma.civicIssue.count({ where });

	const resolvedIssues = await prisma.civicIssue.count({
		where: { ...where, status: LifecycleStatus.RESOLVED },
	});

	const openIssues = await prisma.civicIssue.count({
		where: {
			...where,
			status: {
				notIn: [
					LifecycleStatus.RESOLVED,
					LifecycleStatus.CLOSED,
					LifecycleStatus.CANCELLED,
				],
			},
		},
	});

	// Breached issues (those that have escalations)
	const breachedIssues = await prisma.civicIssue.count({
		where: {
			...where,
			escalations: { some: {} },
		},
	});

	return {
		totalIssues,
		resolvedIssues,
		openIssues,
		breachedIssues,
		resolutionRate: totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0,
	};
};

const getIssuesByDepartment = async (municipalityId?: string) => {
	const where = municipalityId ? { municipalityId } : {};

	const departments = await prisma.department.findMany({
		where,
		include: {
			_count: {
				select: { civicIssues: true },
			},
		},
	});

	return departments.map((dept) => ({
		id: dept.id,
		name: dept.name,
		issueCount: dept._count.civicIssues,
	}));
};

const getIssuesByWard = async (municipalityId?: string) => {
	const where = municipalityId ? { zone: { municipalityId } } : {};

	const wards = await prisma.ward.findMany({
		where,
		include: {
			_count: {
				select: { civicIssues: true },
			},
		},
	});

	return wards.map((ward) => ({
		id: ward.id,
		name: ward.name,
		number: ward.number,
		issueCount: ward._count.civicIssues,
	}));
};

const getSystemOverview = async (
	userId: string,
	query: ISystemOverviewQuery = {},
): Promise<ISystemOverviewResponse> => {
	// 1. Verify global administrative privilege
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			userRoles: { include: { role: true } },
		},
	});

	if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "User not found");

	const roleCodes = user.userRoles.map((ur) => ur.role.code);
	const isGlobalAdmin = roleCodes.some((code) =>
		["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(code),
	);

	if (!isGlobalAdmin) {
		const hasWildcardPermission = await prisma.userRole.findFirst({
			where: {
				userId,
				role: {
					rolePermissions: {
						some: {
							permission: {
								OR: [
									{ action: Action.MANAGE, resource: Resource.ALL },
									{ action: Action.READ, resource: Resource.ALL },
									{ action: Action.READ_ALL, resource: Resource.ALL },
								],
							},
						},
					},
				},
			},
		});

		if (!hasWildcardPermission) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Access denied. Only Super Admin or Platform Admin can access full system overview stats.",
			);
		}
	}

	// 2. Resolve date range filters
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
			case "all_time": {
				startDate = null;
				endDate = null;
				break;
			}
			default: {
				startDate = null;
				endDate = null;
				break;
			}
		}
	}

	const dateFilter = startDate
		? { gte: startDate, ...(endDate ? { lte: endDate } : {}) }
		: undefined;

	const issueBaseWhere = {
		deletedAt: null,
		...(query.municipalityId ? { municipalityId: query.municipalityId } : {}),
	};
	const workOrderBaseWhere = {
		deletedAt: null,
		...(query.municipalityId
			? { civicIssue: { municipalityId: query.municipalityId } }
			: {}),
	};
	const serviceRequestBaseWhere = {
		deletedAt: null,
		...(query.municipalityId ? { municipalityId: query.municipalityId } : {}),
	};

	// 3. Parallel Query Execution for Full System Aggregation
	const [
		// Municipalities & System Geography
		totalMunicipalities,
		activeMunicipalities,
		totalDepartments,
		totalWards,
		// Users & Roles
		totalUsers,
		periodNewUsers,
		usersGroupByStatus,
		rolesWithCounts,
		totalCitizens,
		citizensTrustLevelGroupBy,
		totalStaff,
		availableTechnicians,
		busyTechnicians,
		// Civic Issues
		totalIssues,
		periodIssuesCount,
		resolvedIssuesCount,
		closedIssuesCount,
		openIssuesCount,
		unassignedIssuesCount,
		escalatedIssuesCount,
		overdueIssuesCount,
		issueGroupByStatus,
		issueGroupByPriority,
		priorityLevels,
		// Service Requests
		totalRequests,
		periodRequestsCount,
		requestGroupByStatus,
		// Work Orders
		totalWorkOrders,
		periodWorkOrdersCount,
		activeWorkOrdersCount,
		completedWorkOrdersCount,
		overdueWorkOrdersCount,
		workOrderGroupByStatus,
		// Municipalities Comparison & Distribution
		municipalitiesList,
		issuesByMunicipalityStatus,
		// Categories Distribution
		categoriesList,
		// Citizen Satisfaction Feedback
		feedbackAggregates,
		feedbackRatingDistribution,
		// SLA & Escalations
		totalEscalations,
		periodEscalations,
		unacknowledgedEscalations,
		resolvedEscalations,
		// Actionable Queues
		criticalIssuesQueue,
		recentEscalationsQueue,
		recentAuditLogsQueue,
		recentMunicipalitiesQueue,
	] = await Promise.all([
		// Municipalities & System Geography
		prisma.municipality.count(),
		prisma.municipality.count({
			where: { coverageStatus: ServiceCoverageStatus.ACTIVE },
		}),
		prisma.department.count({
			where: {
				deletedAt: null,
				...(query.municipalityId
					? { municipalityId: query.municipalityId }
					: {}),
			},
		}),
		prisma.ward.count({
			where: {
				...(query.municipalityId
					? { zone: { municipalityId: query.municipalityId } }
					: {}),
			},
		}),

		// Users & Roles
		prisma.user.count({ where: { deletedAt: null } }),
		dateFilter
			? prisma.user.count({ where: { deletedAt: null, createdAt: dateFilter } })
			: Promise.resolve(0),
		prisma.user.groupBy({
			by: ["status"],
			where: { deletedAt: null },
			_count: { id: true },
		}),
		prisma.role.findMany({
			select: {
				code: true,
				name: true,
				_count: {
					select: { userRoles: true },
				},
			},
			orderBy: { name: "asc" },
		}),
		prisma.citizenProfile.count(),
		prisma.citizenProfile.groupBy({
			by: ["trustLevel"],
			_count: { userId: true },
		}),
		prisma.staffProfile.count({
			where: query.municipalityId
				? { municipalityId: query.municipalityId }
				: undefined,
		}),
		prisma.staffProfile.count({
			where: {
				isAvailable: true,
				...(query.municipalityId
					? { municipalityId: query.municipalityId }
					: {}),
				user: {
					userRoles: {
						some: { role: { code: "TECHNICIAN" } },
					},
				},
			},
		}),
		prisma.staffProfile.count({
			where: {
				isAvailable: false,
				...(query.municipalityId
					? { municipalityId: query.municipalityId }
					: {}),
				user: {
					userRoles: {
						some: { role: { code: "TECHNICIAN" } },
					},
				},
			},
		}),

		// Civic Issues
		prisma.civicIssue.count({ where: issueBaseWhere }),
		dateFilter
			? prisma.civicIssue.count({
					where: { ...issueBaseWhere, createdAt: dateFilter },
				})
			: Promise.resolve(null),
		prisma.civicIssue.count({
			where: { ...issueBaseWhere, status: LifecycleStatus.RESOLVED },
		}),
		prisma.civicIssue.count({
			where: { ...issueBaseWhere, status: LifecycleStatus.CLOSED },
		}),
		prisma.civicIssue.count({
			where: {
				...issueBaseWhere,
				status: {
					notIn: [
						LifecycleStatus.RESOLVED,
						LifecycleStatus.CLOSED,
						LifecycleStatus.CANCELLED,
						LifecycleStatus.REJECTED,
					],
				},
			},
		}),
		prisma.civicIssue.count({
			where: {
				...issueBaseWhere,
				workOrders: { none: {} },
				status: {
					notIn: [
						LifecycleStatus.RESOLVED,
						LifecycleStatus.CLOSED,
						LifecycleStatus.CANCELLED,
						LifecycleStatus.REJECTED,
					],
				},
			},
		}),
		prisma.civicIssue.count({
			where: {
				...issueBaseWhere,
				escalations: { some: {} },
			},
		}),
		prisma.civicIssue.count({
			where: {
				...issueBaseWhere,
				status: {
					notIn: [
						LifecycleStatus.RESOLVED,
						LifecycleStatus.CLOSED,
						LifecycleStatus.CANCELLED,
						LifecycleStatus.REJECTED,
					],
				},
				OR: [
					{ responseDeadlineAt: { lt: now } },
					{ resolutionDeadlineAt: { lt: now } },
				],
			},
		}),
		prisma.civicIssue.groupBy({
			by: ["status"],
			where: {
				...issueBaseWhere,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),
		prisma.civicIssue.groupBy({
			by: ["priorityId"],
			where: {
				...issueBaseWhere,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),
		prisma.priorityLevel.findMany({
			where: { isActive: true },
			orderBy: { weight: "desc" },
			select: {
				id: true,
				code: true,
				name: true,
				weight: true,
				colorCode: true,
			},
		}),

		// Service Requests
		prisma.serviceRequest.count({ where: serviceRequestBaseWhere }),
		dateFilter
			? prisma.serviceRequest.count({
					where: { ...serviceRequestBaseWhere, createdAt: dateFilter },
				})
			: Promise.resolve(null),
		prisma.serviceRequest.groupBy({
			by: ["status"],
			where: {
				...serviceRequestBaseWhere,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),

		// Work Orders
		prisma.workOrder.count({ where: workOrderBaseWhere }),
		dateFilter
			? prisma.workOrder.count({
					where: { ...workOrderBaseWhere, createdAt: dateFilter },
				})
			: Promise.resolve(null),
		prisma.workOrder.count({
			where: {
				...workOrderBaseWhere,
				status: {
					in: [
						LifecycleStatus.ASSIGNED,
						LifecycleStatus.ACCEPTED,
						LifecycleStatus.IN_PROGRESS,
						LifecycleStatus.WORK_ORDER_CREATED,
						LifecycleStatus.TEAM_ASSIGNED,
					],
				},
			},
		}),
		prisma.workOrder.count({
			where: {
				...workOrderBaseWhere,
				status: { in: [LifecycleStatus.RESOLVED, LifecycleStatus.CLOSED] },
			},
		}),
		prisma.workOrder.count({
			where: {
				...workOrderBaseWhere,
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
		prisma.workOrder.groupBy({
			by: ["status"],
			where: {
				...workOrderBaseWhere,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),

		// Municipalities Comparison & Distribution
		prisma.municipality.findMany({
			where: query.municipalityId ? { id: query.municipalityId } : undefined,
			select: {
				id: true,
				name: true,
				code: true,
				coverageStatus: true,
				_count: {
					select: {
						departments: { where: { deletedAt: null } },
						staffProfiles: true,
						civicIssues: { where: { deletedAt: null } },
						serviceRequests: { where: { deletedAt: null } },
					},
				},
			},
			orderBy: { name: "asc" },
		}),
		prisma.civicIssue.groupBy({
			by: ["municipalityId", "status"],
			where: {
				deletedAt: null,
				...(query.municipalityId
					? { municipalityId: query.municipalityId }
					: {}),
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
			_count: { id: true },
		}),

		// Categories Distribution
		prisma.serviceCategory.findMany({
			where: { isActive: true },
			select: {
				id: true,
				name: true,
				slug: true,
				department: { select: { name: true } },
				_count: {
					select: {
						civicIssues: {
							where: {
								deletedAt: null,
								...(query.municipalityId
									? { municipalityId: query.municipalityId }
									: {}),
								...(dateFilter ? { createdAt: dateFilter } : {}),
							},
						},
					},
				},
			},
		}),

		// Citizen Satisfaction Feedback
		prisma.feedback.aggregate({
			_avg: { rating: true },
			_count: { id: true },
			where: {
				...(dateFilter ? { createdAt: dateFilter } : {}),
				...(query.municipalityId
					? { serviceRequest: { municipalityId: query.municipalityId } }
					: {}),
			},
		}),
		prisma.feedback.groupBy({
			by: ["rating"],
			where: {
				...(dateFilter ? { createdAt: dateFilter } : {}),
				...(query.municipalityId
					? { serviceRequest: { municipalityId: query.municipalityId } }
					: {}),
			},
			_count: { id: true },
		}),

		// SLA & Escalations
		prisma.escalation.count({
			where: query.municipalityId
				? { civicIssue: { municipalityId: query.municipalityId } }
				: undefined,
		}),
		prisma.escalation.count({
			where: {
				...(query.municipalityId
					? { civicIssue: { municipalityId: query.municipalityId } }
					: {}),
				...(dateFilter ? { escalatedAt: dateFilter } : {}),
			},
		}),
		prisma.escalation.count({
			where: {
				acknowledgedAt: null,
				...(query.municipalityId
					? { civicIssue: { municipalityId: query.municipalityId } }
					: {}),
			},
		}),
		prisma.escalation.count({
			where: {
				resolvedAt: { not: null },
				...(query.municipalityId
					? { civicIssue: { municipalityId: query.municipalityId } }
					: {}),
			},
		}),

		// Actionable Queues
		prisma.civicIssue.findMany({
			where: {
				...issueBaseWhere,
				status: {
					notIn: [
						LifecycleStatus.RESOLVED,
						LifecycleStatus.CLOSED,
						LifecycleStatus.CANCELLED,
					],
				},
			},
			orderBy: [{ priority: { weight: "desc" } }, { createdAt: "desc" }],
			take: 8,
			select: {
				id: true,
				issueNumber: true,
				title: true,
				status: true,
				createdAt: true,
				responseDeadlineAt: true,
				resolutionDeadlineAt: true,
				reportedCount: true,
				priority: {
					select: {
						id: true,
						code: true,
						name: true,
						colorCode: true,
						weight: true,
					},
				},
				municipality: {
					select: { id: true, name: true, code: true },
				},
				department: {
					select: { id: true, name: true, code: true },
				},
				ward: {
					select: { id: true, name: true, number: true },
				},
			},
		}),
		prisma.escalation.findMany({
			where: query.municipalityId
				? { civicIssue: { municipalityId: query.municipalityId } }
				: undefined,
			orderBy: { escalatedAt: "desc" },
			take: 6,
			select: {
				id: true,
				escalationLevel: true,
				reason: true,
				escalatedAt: true,
				acknowledgedAt: true,
				resolvedAt: true,
				civicIssue: {
					select: {
						id: true,
						issueNumber: true,
						title: true,
						status: true,
						municipality: { select: { id: true, name: true, code: true } },
						priority: { select: { code: true, colorCode: true } },
					},
				},
			},
		}),
		prisma.auditLog.findMany({
			orderBy: { createdAt: "desc" },
			take: 8,
			select: {
				id: true,
				action: true,
				resource: true,
				resourceId: true,
				createdAt: true,
				ipAddress: true,
				user: {
					select: { id: true, email: true, displayName: true },
				},
			},
		}),
		prisma.municipality.findMany({
			orderBy: { createdAt: "desc" },
			take: 5,
			select: {
				id: true,
				name: true,
				code: true,
				coverageStatus: true,
				createdAt: true,
				_count: {
					select: {
						departments: true,
						staffProfiles: true,
						civicIssues: true,
					},
				},
			},
		}),
	]);

	// 4. Generate Trend Time-Series
	const trendWindowDays = 30;
	let trendStartDate = startDate;
	let trendEndDate = endDate || now;

	if (
		!trendStartDate ||
		trendEndDate.getTime() - trendStartDate.getTime() > 90 * 24 * 60 * 60 * 1000
	) {
		trendStartDate = new Date(
			now.getTime() - trendWindowDays * 24 * 60 * 60 * 1000,
		);
		trendEndDate = now;
	}

	const [
		trendIssuesCreated,
		trendIssuesResolved,
		trendUsersCreated,
		trendWorkOrdersCreated,
	] = await Promise.all([
		prisma.civicIssue.findMany({
			where: {
				...issueBaseWhere,
				createdAt: { gte: trendStartDate, lte: trendEndDate },
			},
			select: { createdAt: true },
		}),
		prisma.civicIssue.findMany({
			where: {
				...issueBaseWhere,
				resolvedAt: { gte: trendStartDate, lte: trendEndDate },
			},
			select: { resolvedAt: true },
		}),
		prisma.user.findMany({
			where: {
				deletedAt: null,
				createdAt: { gte: trendStartDate, lte: trendEndDate },
			},
			select: { createdAt: true },
		}),
		prisma.workOrder.findMany({
			where: {
				...workOrderBaseWhere,
				createdAt: { gte: trendStartDate, lte: trendEndDate },
			},
			select: { createdAt: true },
		}),
	]);

	// Map trend data into date intervals
	const formatDateKey = (d: Date): string => d.toISOString().slice(0, 10);

	const trendMap = new Map<
		string,
		{
			issuesCreated: number;
			issuesResolved: number;
			newUsers: number;
			workOrdersCreated: number;
		}
	>();

	const currentIterDate = new Date(trendStartDate);
	while (currentIterDate <= trendEndDate) {
		const key = formatDateKey(currentIterDate);
		trendMap.set(key, {
			issuesCreated: 0,
			issuesResolved: 0,
			newUsers: 0,
			workOrdersCreated: 0,
		});
		currentIterDate.setDate(currentIterDate.getDate() + 1);
	}

	for (const issue of trendIssuesCreated) {
		const key = formatDateKey(issue.createdAt);
		const item = trendMap.get(key);
		if (item) item.issuesCreated += 1;
	}

	for (const issue of trendIssuesResolved) {
		if (issue.resolvedAt) {
			const key = formatDateKey(issue.resolvedAt);
			const item = trendMap.get(key);
			if (item) item.issuesResolved += 1;
		}
	}

	for (const u of trendUsersCreated) {
		const key = formatDateKey(u.createdAt);
		const item = trendMap.get(key);
		if (item) item.newUsers += 1;
	}

	for (const wo of trendWorkOrdersCreated) {
		const key = formatDateKey(wo.createdAt);
		const item = trendMap.get(key);
		if (item) item.workOrdersCreated += 1;
	}

	const trends: ISystemTrendPoint[] = Array.from(trendMap.entries()).map(
		([date, vals]) => {
			const d = new Date(date);
			const label = d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
			return {
				date,
				label,
				issuesCreated: vals.issuesCreated,
				issuesResolved: vals.issuesResolved,
				newUsers: vals.newUsers,
				workOrdersCreated: vals.workOrdersCreated,
			};
		},
	);

	// 5. Build Aggregates & Structures
	const activeUsersCount =
		usersGroupByStatus.find((u) => u.status === UserStatus.ACTIVE)?._count.id ||
		0;

	const usersByStatusMap: Record<string, number> = {};
	for (const item of usersGroupByStatus) {
		usersByStatusMap[item.status] = item._count.id;
	}

	const citizensTrustMap: Record<string, number> = {};
	for (const item of citizensTrustLevelGroupBy) {
		citizensTrustMap[item.trustLevel] = item._count.userId;
	}

	const issuesByStatusMap: Record<string, number> = {};
	for (const item of issueGroupByStatus) {
		issuesByStatusMap[item.status] = item._count.id;
	}

	const requestsByStatusMap: Record<string, number> = {};
	for (const item of requestGroupByStatus) {
		requestsByStatusMap[item.status] = item._count.id;
	}

	const workOrdersByStatusMap: Record<string, number> = {};
	for (const item of workOrderGroupByStatus) {
		workOrdersByStatusMap[item.status] = item._count.id;
	}

	// Priority Stats Breakdown
	const priorityCountMap = new Map<string, number>();
	for (const p of issueGroupByPriority) {
		priorityCountMap.set(p.priorityId, p._count.id);
	}

	const effectivePeriodIssueCount =
		periodIssuesCount !== null ? periodIssuesCount : totalIssues;

	const priorityStats: IPriorityStat[] = priorityLevels.map((p) => {
		const count = priorityCountMap.get(p.id) || 0;
		const percentage =
			effectivePeriodIssueCount > 0
				? Number(((count / effectivePeriodIssueCount) * 100).toFixed(1))
				: 0;
		return {
			id: p.id,
			code: p.code,
			name: p.name,
			weight: p.weight,
			colorCode: p.colorCode,
			count,
			percentage,
		};
	});

	// Municipality Performance Table
	const muniIssueStatsMap: Record<
		string,
		{ total: number; resolved: number; open: number }
	> = {};
	for (const item of issuesByMunicipalityStatus) {
		let stats = muniIssueStatsMap[item.municipalityId];
		if (!stats) {
			stats = {
				total: 0,
				resolved: 0,
				open: 0,
			};
			muniIssueStatsMap[item.municipalityId] = stats;
		}
		const count = item._count.id;
		stats.total += count;
		if (
			item.status === LifecycleStatus.RESOLVED ||
			item.status === LifecycleStatus.CLOSED
		) {
			stats.resolved += count;
		} else if (
			item.status !== LifecycleStatus.CANCELLED &&
			item.status !== LifecycleStatus.REJECTED
		) {
			stats.open += count;
		}
	}

	const municipalitiesPerformance: IMunicipalityPerformance[] =
		municipalitiesList.map((m) => {
			const stats = muniIssueStatsMap[m.id] || {
				total: m._count.civicIssues,
				resolved: 0,
				open: 0,
			};
			const resRate =
				stats.total > 0
					? Number(((stats.resolved / stats.total) * 100).toFixed(1))
					: 0;
			return {
				id: m.id,
				name: m.name,
				code: m.code,
				coverageStatus: m.coverageStatus,
				totalIssues: stats.total,
				openIssues: stats.open,
				resolvedIssues: stats.resolved,
				resolutionRate: resRate,
				departmentsCount: m._count.departments,
				staffCount: m._count.staffProfiles,
				serviceRequestsCount: m._count.serviceRequests,
			};
		});

	// Top Categories Distribution
	const sortedCategories = categoriesList
		.map((cat) => ({
			id: cat.id,
			name: cat.name,
			slug: cat.slug,
			departmentName: cat.department ? cat.department.name : null,
			issueCount: cat._count.civicIssues,
			percentage:
				effectivePeriodIssueCount > 0
					? Number(
							(
								(cat._count.civicIssues / effectivePeriodIssueCount) *
								100
							).toFixed(1),
						)
					: 0,
		}))
		.sort((a, b) => b.issueCount - a.issueCount)
		.slice(0, 10);

	// Citizen Satisfaction
	const ratingDistribution: Record<number, number> = {
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
	};
	let highRatingCount = 0;
	for (const fb of feedbackRatingDistribution) {
		ratingDistribution[fb.rating] = fb._count.id;
		if (fb.rating >= 4) {
			highRatingCount += fb._count.id;
		}
	}
	const totalFeedbacks = feedbackAggregates._count.id || 0;
	const averageRating = feedbackAggregates._avg.rating
		? Number(feedbackAggregates._avg.rating.toFixed(2))
		: 0;
	const satisfactionRate =
		totalFeedbacks > 0
			? Number(((highRatingCount / totalFeedbacks) * 100).toFixed(1))
			: 0;

	// Resolution Rate
	const systemResolutionRate =
		totalIssues > 0
			? Number(
					(
						((resolvedIssuesCount + closedIssuesCount) / totalIssues) *
						100
					).toFixed(1),
				)
			: 0;

	return {
		kpis: {
			totalMunicipalities,
			activeMunicipalities,
			totalUsers,
			activeUsers: activeUsersCount,
			totalCitizens,
			totalStaff,
			totalDepartments,
			totalWards,
			totalCivicIssues: totalIssues,
			periodCivicIssues: effectivePeriodIssueCount,
			resolvedCivicIssues: resolvedIssuesCount,
			closedCivicIssues: closedIssuesCount,
			openCivicIssues: openIssuesCount,
			breachedCivicIssues: escalatedIssuesCount,
			systemResolutionRate,
			totalWorkOrders,
			activeWorkOrders: activeWorkOrdersCount,
			averageCitizenRating: averageRating,
			totalFeedbacks,
		},
		timeRange: {
			filter: query.timeRange || (query.startDate ? "custom" : "all_time"),
			startDate: startDate ? startDate.toISOString() : null,
			endDate: endDate ? endDate.toISOString() : null,
		},
		civicIssues: {
			total: totalIssues,
			periodTotal: effectivePeriodIssueCount,
			openTotal: openIssuesCount,
			resolvedTotal: resolvedIssuesCount,
			closedTotal: closedIssuesCount,
			unassignedTotal: unassignedIssuesCount,
			escalatedTotal: escalatedIssuesCount,
			overdueTotal: overdueIssuesCount,
			resolutionRate: systemResolutionRate,
			byStatus: issuesByStatusMap,
			byPriority: priorityStats,
		},
		users: {
			total: totalUsers,
			periodNewUsers,
			byStatus: usersByStatusMap,
			byRole: rolesWithCounts.map((r) => ({
				roleCode: r.code,
				roleName: r.name,
				count: r._count.userRoles,
			})),
			citizens: {
				total: totalCitizens,
				byTrustLevel: citizensTrustMap,
			},
			staff: {
				total: totalStaff,
				availableTechnicians,
				busyTechnicians,
			},
		},
		workOrders: {
			total: totalWorkOrders,
			periodTotal:
				periodWorkOrdersCount !== null
					? periodWorkOrdersCount
					: totalWorkOrders,
			activeTotal: activeWorkOrdersCount,
			completedTotal: completedWorkOrdersCount,
			overdueTotal: overdueWorkOrdersCount,
			byStatus: workOrdersByStatusMap,
		},
		serviceRequests: {
			total: totalRequests,
			periodTotal:
				periodRequestsCount !== null ? periodRequestsCount : totalRequests,
			byStatus: requestsByStatusMap,
		},
		municipalities: municipalitiesPerformance,
		categories: sortedCategories,
		citizenSatisfaction: {
			averageRating,
			totalFeedbacks,
			satisfactionRate,
			ratingDistribution,
		},
		slaAndEscalations: {
			totalEscalations,
			periodEscalations,
			unacknowledgedEscalations,
			resolvedEscalations,
			activeEscalations: totalEscalations - resolvedEscalations,
			overdueIssuesCount,
		},
		trends,
		actionableQueues: {
			criticalIssues: criticalIssuesQueue,
			recentEscalations: recentEscalationsQueue,
			recentAuditLogs: recentAuditLogsQueue,
			recentMunicipalities: recentMunicipalitiesQueue.map((m) => ({
				id: m.id,
				name: m.name,
				code: m.code,
				coverageStatus: m.coverageStatus,
				createdAt: m.createdAt,
				counts: {
					departments: m._count.departments,
					staff: m._count.staffProfiles,
					issues: m._count.civicIssues,
				},
			})),
		},
	};
};

export const AnalyticsService = {
	getDashboardStats,
	getIssuesByDepartment,
	getIssuesByWard,
	getSystemOverview,
};
