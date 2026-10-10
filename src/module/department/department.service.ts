import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateDepartmentPayload,
	IUpdateDepartmentPayload,
	IDepartmentOverviewQuery,
	IDepartmentOverviewResponse,
} from "./department.interface";
import {
	LifecycleStatus,
	DepartmentRole,
} from "../../../generated/prisma/enums";
import { checkDepartmentAccess } from "../../utils/abac.utils";

const createDepartment = async (payload: ICreateDepartmentPayload) => {
	const exists = await prisma.department.findFirst({
		where: { municipalityId: payload.municipalityId, code: payload.code },
	});
	if (exists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Department code already exists in this municipality",
		);
	}

	return prisma.department.create({
		data: payload,
	});
};

const getDepartments = async (municipalityId?: string) => {
	const where = municipalityId ? { municipalityId } : {};
	return prisma.department.findMany({
		where,
		include: {
			municipality: { select: { name: true } },
		},
		orderBy: { name: "asc" },
	});
};

const getDepartmentById = async (id: string) => {
	const dept = await prisma.department.findUnique({
		where: { id },
		include: {
			serviceAreas: {
				include: { ward: true },
				where: { effectiveTo: null },
			},
			serviceCategories: {
				where: { isActive: true },
			},
		},
	});
	if (!dept) throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	return dept;
};

const updateDepartment = async (
	id: string,
	payload: IUpdateDepartmentPayload,
) => {
	const dept = await prisma.department.findUnique({ where: { id } });
	if (!dept) throw new AppError(httpStatus.NOT_FOUND, "Department not found");

	return prisma.department.update({
		where: { id },
		data: payload,
	});
};

const addServiceArea = async (departmentId: string, wardId: string) => {
	const exists = await prisma.departmentServiceArea.findUnique({
		where: { departmentId_wardId: { departmentId, wardId } },
	});

	if (exists && !exists.effectiveTo) {
		throw new AppError(httpStatus.CONFLICT, "Service area already active");
	}

	if (exists && exists.effectiveTo) {
		return prisma.departmentServiceArea.update({
			where: { id: exists.id },
			data: { effectiveTo: null },
		});
	}

	return prisma.departmentServiceArea.create({
		data: { departmentId, wardId },
	});
};

const removeServiceArea = async (departmentId: string, areaId: string) => {
	return prisma.departmentServiceArea.update({
		where: { id: areaId, departmentId },
		data: { effectiveTo: new Date() },
	});
};

const getDepartmentOverview = async (
	userId: string,
	departmentId: string,
	query: IDepartmentOverviewQuery = {},
): Promise<IDepartmentOverviewResponse> => {
	await checkDepartmentAccess(userId, departmentId);

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

	// Execute all queries in parallel for high efficiency
	const [
		department,
		// Work order metrics
		totalWorkOrders,
		workOrderGroupBy,
		periodWorkOrdersCount,
		overdueWorkOrders,
		// Civic issues metrics
		totalIssues,
		issueGroupBy,
		priorityGroupBy,
		priorities,
		overdueIssues,
		// Staff & Technicians
		members,
		// Resolutions
		totalResolutions,
		periodResolutionsCount,
		pendingResolutions,
		verifiedResolutions,
		rejectedResolutions,
		// Actionable Queues
		unassignedWorkOrders,
		activeWorkOrders,
		pendingVerificationWorkOrders,
		recentWorkUpdates,
	] = await Promise.all([
		// 1. Department info & counts
		prisma.department.findUnique({
			where: { id: departmentId },
			include: {
				municipality: { select: { id: true, name: true, code: true } },
				_count: {
					select: {
						members: { where: { leftAt: null } },
						teams: { where: { status: "ACTIVE" } },
						serviceAreas: { where: { effectiveTo: null } },
						serviceCategories: { where: { isActive: true } },
					},
				},
			},
		}),

		// 2. Work Orders: All-time count
		prisma.workOrder.count({ where: { departmentId } }),

		// 3. Work Orders: GroupBy status (all-time current breakdown)
		prisma.workOrder.groupBy({
			by: ["status"],
			where: { departmentId },
			_count: { id: true },
		}),

		// 4. Work Orders: Created in time period (if dateFilter applied)
		dateFilter
			? prisma.workOrder.count({ where: { departmentId, createdAt: dateFilter } })
			: Promise.resolve(null),

		// 5. Work Orders: Overdue (scheduled date passed and not completed)
		prisma.workOrder.count({
			where: {
				departmentId,
				status: {
					notIn: [LifecycleStatus.RESOLVED, LifecycleStatus.CLOSED],
				},
				scheduledAt: { lt: now },
			},
		}),

		// 6. Civic Issues: Total count
		prisma.civicIssue.count({ where: { departmentId } }),

		// 7. Civic Issues: GroupBy status
		prisma.civicIssue.groupBy({
			by: ["status"],
			where: { departmentId },
			_count: { id: true },
		}),

		// 8. Civic Issues: GroupBy priority
		prisma.civicIssue.groupBy({
			by: ["priorityId"],
			where: { departmentId },
			_count: { id: true },
		}),

		// 9. Priority list for metadata
		prisma.priorityLevel.findMany({
			where: { isActive: true },
			orderBy: { weight: "desc" },
			select: { id: true, code: true, name: true, weight: true, colorCode: true },
		}),

		// 10. Overdue Issues (resolutionDeadlineAt passed)
		prisma.civicIssue.count({
			where: {
				departmentId,
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

		// 11. Staff members with profiles and workload
		prisma.departmentMember.findMany({
			where: { departmentId, leftAt: null },
			include: {
				staff: {
					include: {
						user: { select: { email: true, phone: true } },
					},
				},
			},
		}),

		// 12. Resolutions: Total
		prisma.resolution.count({ where: { workOrder: { departmentId } } }),

		// 13. Resolutions: in period
		dateFilter
			? prisma.resolution.count({
					where: { workOrder: { departmentId }, createdAt: dateFilter },
				})
			: Promise.resolve(null),

		// 14. Resolutions: Pending Verification
		prisma.resolution.count({
			where: {
				workOrder: { departmentId },
				approvedAt: null,
				rejectedAt: null,
			},
		}),

		// 15. Resolutions: Verified
		prisma.resolution.count({
			where: {
				workOrder: { departmentId },
				approvedAt: { not: null },
			},
		}),

		// 16. Resolutions: Rejected
		prisma.resolution.count({
			where: {
				workOrder: { departmentId },
				rejectedAt: { not: null },
			},
		}),

		// 17. Unassigned Work Orders Queue
		prisma.workOrder.findMany({
			where: { departmentId, status: LifecycleStatus.WORK_ORDER_CREATED },
			take: 5,
			orderBy: [
				{ civicIssue: { priority: { weight: "desc" } } },
				{ createdAt: "desc" },
			],
			include: {
				civicIssue: {
					include: {
						priority: { select: { name: true, code: true, colorCode: true } },
						location: { select: { address: true, landmark: true } },
					},
				},
			},
		}),

		// 18. Active Work Orders Queue
		prisma.workOrder.findMany({
			where: {
				departmentId,
				status: {
					in: [
						LifecycleStatus.ASSIGNED,
						LifecycleStatus.TEAM_ASSIGNED,
						LifecycleStatus.IN_PROGRESS,
					],
				},
			},
			take: 5,
			orderBy: { updatedAt: "desc" },
			include: {
				currentAssignee: {
					select: {
						userId: true,
						employeeId: true,
						firstName: true,
						lastName: true,
					},
				},
				civicIssue: {
					include: {
						priority: { select: { name: true, code: true, colorCode: true } },
					},
				},
			},
		}),

		// 19. Pending Verification Work Orders Queue
		prisma.workOrder.findMany({
			where: { departmentId, status: LifecycleStatus.PENDING_VERIFICATION },
			take: 5,
			orderBy: { updatedAt: "desc" },
			include: {
				civicIssue: {
					include: {
						priority: { select: { name: true, code: true, colorCode: true } },
					},
				},
				resolution: {
					include: {
						attachments: true,
						submittedByUser: {
							select: {
								employeeId: true,
								firstName: true,
								lastName: true,
							},
						},
					},
				},
			},
		}),

		// 20. Recent Work Updates
		prisma.workUpdate.findMany({
			where: { workOrder: { departmentId } },
			take: 5,
			orderBy: { createdAt: "desc" },
			include: {
				technician: {
					select: {
						employeeId: true,
						firstName: true,
						lastName: true,
					},
				},
				workOrder: {
					select: {
						id: true,
						title: true,
						civicIssue: { select: { issueNumber: true } },
					},
				},
			},
		}),
	]);

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	// Process Work Order breakdown
	const woStatusMap: Record<string, number> = {};
	workOrderGroupBy.forEach((g) => {
		woStatusMap[g.status] = g._count.id;
	});

	const needCrew = woStatusMap[LifecycleStatus.WORK_ORDER_CREATED] || 0;
	const assigned =
		(woStatusMap[LifecycleStatus.ASSIGNED] || 0) +
		(woStatusMap[LifecycleStatus.TEAM_ASSIGNED] || 0);
	const inProgress = woStatusMap[LifecycleStatus.IN_PROGRESS] || 0;
	const pendingVerification =
		woStatusMap[LifecycleStatus.PENDING_VERIFICATION] || 0;
	const resolved = woStatusMap[LifecycleStatus.RESOLVED] || 0;
	const closed = woStatusMap[LifecycleStatus.CLOSED] || 0;
	const activeTotal = assigned + inProgress;

	// Process Civic Issues breakdown
	const issueStatusMap: Record<string, number> = {};
	let openTotal = 0;
	issueGroupBy.forEach((g) => {
		issueStatusMap[g.status] = g._count.id;
		if (
			g.status !== LifecycleStatus.RESOLVED &&
			g.status !== LifecycleStatus.CLOSED &&
			g.status !== LifecycleStatus.CANCELLED
		) {
			openTotal += g._count.id;
		}
	});

	const priorityCountMap: Record<string, number> = {};
	priorityGroupBy.forEach((g) => {
		if (g.priorityId) {
			priorityCountMap[g.priorityId] = g._count.id;
		}
	});

	const byPriority = priorities.map((p) => ({
		id: p.id,
		code: p.code,
		name: p.name,
		weight: p.weight,
		colorCode: p.colorCode,
		count: priorityCountMap[p.id] || 0,
	}));

	// Process Staff & Technicians
	const heads: any[] = [];
	const managers: any[] = [];
	const technicians: any[] = [];
	let dispatchersCount = 0;

	let totalCurrentWorkload = 0;
	let totalCapacity = 0;
	let availableTechnicians = 0;
	let busyTechnicians = 0;

	members.forEach((m) => {
		const s = m.staff;
		const name = `${s.firstName} ${s.lastName}`.trim();
		const info = {
			userId: s.userId,
			employeeId: s.employeeId,
			name,
			designation: s.designation,
			email: s.user.email,
			phone: s.user.phone,
		};

		if (m.role === DepartmentRole.HEAD) {
			heads.push(info);
		} else if (m.role === DepartmentRole.MANAGER) {
			managers.push(info);
		} else if (m.role === DepartmentRole.DISPATCHER) {
			dispatchersCount++;
		} else if (m.role === DepartmentRole.TECHNICIAN) {
			totalCurrentWorkload += s.currentWorkload;
			totalCapacity += s.maxWorkload;

			const isBusy = !s.isAvailable || s.currentWorkload >= s.maxWorkload;
			if (isBusy) {
				busyTechnicians++;
			} else {
				availableTechnicians++;
			}

			technicians.push({
				...info,
				isAvailable: s.isAvailable,
				currentWorkload: s.currentWorkload,
				maxWorkload: s.maxWorkload,
				utilization:
					s.maxWorkload > 0
						? Math.round((s.currentWorkload / s.maxWorkload) * 100)
						: 0,
			});
		}
	});

	technicians.sort((a, b) => b.currentWorkload - a.currentWorkload);

	const utilizationRate =
		totalCapacity > 0
			? Math.round((totalCurrentWorkload / totalCapacity) * 1000) / 10
			: 0;

	// Process Resolutions
	const verified = verifiedResolutions;
	const rejected = rejectedResolutions;
	const totalDecided = verified + rejected;
	const approvalRate =
		totalDecided > 0 ? Math.round((verified / totalDecided) * 1000) / 10 : 0;

	return {
		department: {
			id: department.id,
			name: department.name,
			code: department.code,
			description: department.description,
			email: department.email,
			phone: department.phone,
			status: department.status,
			municipality: department.municipality,
			leadership: {
				heads,
				managers,
			},
			counts: {
				totalMembers: department._count.members,
				totalTeams: department._count.teams,
				totalServiceAreas: department._count.serviceAreas,
				totalCategories: department._count.serviceCategories,
			},
		},
		timeRange: {
			filter: query.timeRange || (query.startDate ? "custom" : "all_time"),
			startDate: startDate ? startDate.toISOString() : null,
			endDate: endDate ? endDate.toISOString() : null,
		},
		workOrderStats: {
			total: totalWorkOrders,
			periodTotal: periodWorkOrdersCount ?? totalWorkOrders,
			needCrew,
			assigned,
			inProgress,
			pendingVerification,
			resolved,
			closed,
			activeTotal,
			overdueCount: overdueWorkOrders,
		},
		issueQueueStats: {
			total: totalIssues,
			openTotal,
			periodTotal: totalIssues,
			overdueCount: overdueIssues,
			byStatus: issueStatusMap,
			byPriority,
		},
		staffStats: {
			totalStaff: members.length,
			technicians: {
				total: technicians.length,
				available: availableTechnicians,
				busy: busyTechnicians,
				totalCurrentWorkload,
				totalCapacity,
				utilizationRate,
			},
			dispatchersCount,
			technicianRoster: technicians,
		},
		resolutionStats: {
			total: totalResolutions,
			periodTotal: periodResolutionsCount ?? totalResolutions,
			pendingVerification: pendingResolutions,
			verified,
			rejected,
			approvalRate,
		},
		queues: {
			unassignedWorkOrders,
			activeWorkOrders,
			pendingVerificationWorkOrders,
			recentWorkUpdates,
		},
	};
};

export const DepartmentService = {
	createDepartment,
	getDepartments,
	getDepartmentById,
	updateDepartment,
	addServiceArea,
	removeServiceArea,
	getDepartmentOverview,
};

