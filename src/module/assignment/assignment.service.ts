import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type {
	ICreateAssignmentPayload,
	IUpdateAssignmentStatusPayload,
	IReassignAssignmentPayload,
} from "./assignment.interface";
import {
	Action,
	Resource,
	LifecycleStatus,
	AssignmentStatus,
	NotificationType,
} from "../../../generated/prisma/enums";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { createCivicIssueHistory } from "../../utils/civicIssueHistory";
import { checkDepartmentAccess } from "../../utils/abac.utils";
import { assignmentSearchableFields } from "./assignment.constant";

const createAssignment = async (
	userId: string,
	payload: ICreateAssignmentPayload,
) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id: payload.workOrderId },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	}

	await checkDepartmentAccess(userId, workOrder.departmentId);

	let targetUserId: string | null = null;
	let assignedTeamId: string | null = null;
	let lifecycleStatus: LifecycleStatus = LifecycleStatus.ASSIGNED;

	if (payload.teamId) {
		const team = await prisma.team.findUnique({
			where: { id: payload.teamId },
		});
		if (!team || team.status !== "ACTIVE") {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Team is invalid or not active",
			);
		}
		if (!team.leaderId) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Team must have a leader to be assigned work",
			);
		}
		targetUserId = team.leaderId;
		assignedTeamId = team.id;
		lifecycleStatus = LifecycleStatus.TEAM_ASSIGNED;
	} else if (payload.assignedToId) {
		targetUserId = payload.assignedToId;
	} else {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Must provide either teamId or assignedToId",
		);
	}

	const technician = await prisma.staffProfile.findUnique({
		where: { userId: targetUserId },
	});

	if (!technician) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Target technician/leader not found",
		);
	}

	if (!technician.isAvailable) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Technician/Leader is currently unavailable",
		);
	}

	if (technician.currentWorkload >= technician.maxWorkload) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Technician/Leader has reached maximum workload",
		);
	}

	const assigner = await prisma.staffProfile.findUnique({
		where: { userId },
	});

	const result = await prisma.$transaction(async (tx) => {
		// Create Assignment
		const assignment = await tx.assignment.create({
			data: {
				workOrderId: payload.workOrderId,
				assignedToId: targetUserId,
				assignedById: assigner ? userId : null,
				teamId: assignedTeamId,
				status: AssignmentStatus.PENDING,
			},
		});

		// Update WorkOrder current assignee
		await tx.workOrder.update({
			where: { id: payload.workOrderId },
			data: {
				currentAssigneeId: targetUserId,
				status: lifecycleStatus, // Move to assigned state
			},
		});

		// Update CivicIssue status
		await tx.civicIssue.update({
			where: { id: workOrder.civicIssueId },
			data: { status: lifecycleStatus },
		});

		// Sync ServiceRequest status
		await tx.serviceRequest.updateMany({
			where: { civicIssueId: workOrder.civicIssueId },
			data: { status: lifecycleStatus },
		});

		// Record status transition in timeline
		await createCivicIssueHistory({
			civicIssueId: workOrder.civicIssueId,
			changedById: userId,
			previousStatus: workOrder.status as LifecycleStatus,
			newStatus: lifecycleStatus,
			notes: assignedTeamId
				? `Assigned to team`
				: `Assigned to technician`,
			tx,
		});

		// Increase technician/leader workload
		await tx.staffProfile.update({
			where: { userId: targetUserId },
			data: { currentWorkload: { increment: 1 } },
		});

		// Send Notification to Technician/Leader
		await tx.notification.create({
			data: {
				userId: targetUserId,
				type: NotificationType.REQUEST_ASSIGNED,
				title: assignedTeamId
					? "New Work Order Assigned to Team"
					: "New Work Order Assigned",
				message: `You have been assigned to Work Order: ${workOrder.title}`,
				resourceType: Resource.WORK_ORDER,
				resourceId: workOrder.id,
			},
		});

		// Audit Log
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.ASSIGN,
				resource: Resource.ASSIGNMENT,
				resourceId: assignment.id,
				newValue: JSON.parse(JSON.stringify(assignment)),
			},
		});

		return assignment;
	});

	return result;
};

const getMyAssignments = async (
	userId: string,
	filters: any = {},
	options: any = {},
) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		assignmentSearchableFields,
	);

	// Fetch teams the user belongs to
	const userTeamMemberships = await prisma.teamMember.findMany({
		where: { staffId: userId },
		select: { teamId: true },
	});
	const userTeamIds = userTeamMemberships.map((tm) => tm.teamId);

	// Enforce visibility: User is assigned directly OR User is in the assigned Team
	where.OR = [{ assignedToId: userId }, { teamId: { in: userTeamIds } }];

	const [data, total] = await Promise.all([
		prisma.assignment.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				workOrder: {
					include: {
						civicIssue: {
							select: { issueNumber: true, location: true, priority: true },
						},
					},
				},
				team: {
					select: { name: true },
				},
			},
		}),
		prisma.assignment.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const updateAssignmentStatus = async (
	userId: string,
	assignmentId: string,
	payload: IUpdateAssignmentStatusPayload,
) => {
	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: { workOrder: true },
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	// Fetch user roles to allow SUPER_ADMIN and PLATFORM_ADMIN to bypass
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { userRoles: { include: { role: true } } },
	});
	const isSuperOrPlatformAdmin = user?.userRoles.some(
		(ur) => ur.role.code === "SUPER_ADMIN" || ur.role.code === "PLATFORM_ADMIN"
	);

	// Security: Only the assigned tech, team lead, or admin can accept/reject
	if (assignment.assignedToId !== userId && !isSuperOrPlatformAdmin) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only update your own assignments or team assignments where you are the lead",
		);
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedAssignment = await tx.assignment.update({
			where: { id: assignmentId },
			data: {
				status: payload.status as AssignmentStatus,
				notes: payload.notes,
			},
		});

		// If accepted, update work order status
		if (payload.status === AssignmentStatus.ACCEPTED) {
			await tx.workOrder.update({
				where: { id: assignment.workOrderId },
				data: { status: LifecycleStatus.ACCEPTED },
			});

			await tx.civicIssue.update({
				where: { id: assignment.workOrder.civicIssueId },
				data: { status: LifecycleStatus.ACCEPTED },
			});

			await tx.workUpdate.create({
				data: {
					workOrderId: assignment.workOrderId,
					technicianId: userId,
					updateType: "ACCEPTED",
					note: "Assignment accepted.",
				},
			});

			await createCivicIssueHistory({
				civicIssueId: assignment.workOrder.civicIssueId,
				changedById: userId,
				previousStatus: assignment.workOrder.status as LifecycleStatus,
				newStatus: LifecycleStatus.ACCEPTED,
				notes: "Technician accepted the assignment.",
				tx,
			});
		}

		// If rejected, remove from tech's workload and reset work order
		if (payload.status === AssignmentStatus.REJECTED) {
			if (assignment.assignedToId) {
				await tx.staffProfile.update({
					where: { userId: assignment.assignedToId },
					data: { currentWorkload: { decrement: 1 } },
				});
			}

			await tx.workOrder.update({
				where: { id: assignment.workOrderId },
				data: {
					currentAssigneeId: null,
					status: LifecycleStatus.TRIAGED, // Revert to unassigned state
				},
			});

			await tx.civicIssue.update({
				where: { id: assignment.workOrder.civicIssueId },
				data: { status: LifecycleStatus.TRIAGED },
			});

			await createCivicIssueHistory({
				civicIssueId: assignment.workOrder.civicIssueId,
				changedById: userId,
				previousStatus: assignment.workOrder.status as LifecycleStatus,
				newStatus: LifecycleStatus.TRIAGED,
				notes: `Assignment rejected${payload.notes ? `: ${payload.notes}` : "."}`,
				tx,
			});

			// Notify Dispatcher about rejection
			if (assignment.assignedById) {
				await tx.notification.create({
					data: {
						userId: assignment.assignedById,
						type: NotificationType.SYSTEM,
						title: "Assignment Rejected",
						message: `Technician/Lead rejected Work Order: ${assignment.workOrder.title}`,
						resourceType: Resource.WORK_ORDER,
						resourceId: assignment.workOrderId,
					},
				});
			}
		}

		// Audit
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.UPDATE,
				resource: Resource.ASSIGNMENT,
				resourceId: assignmentId,
				oldValue: { status: assignment.status },
				newValue: { status: payload.status },
			},
		});

		return updatedAssignment;
	});

	return result;
};

const getAllAssignments = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		assignmentSearchableFields,
	);

	const [data, total] = await Promise.all([
		prisma.assignment.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				workOrder: {
					select: { title: true, priority: true, status: true },
				},
				team: {
					select: { name: true },
				},
				assignedTo: {
					select: { firstName: true, lastName: true },
				},
			},
		}),
		prisma.assignment.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getDepartmentAssignments = async (
	userId: string,
	departmentId: string,
	filters: any = {},
	options: any = {},
) => {
	await checkDepartmentAccess(userId, departmentId);

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		assignmentSearchableFields,
	);

	// Scope to the specific department via the WorkOrder relation
	const departmentWhere = {
		...where,
		workOrder: {
			...(where.workOrder || {}),
			departmentId,
		},
	};

	const [data, total] = await Promise.all([
		prisma.assignment.findMany({
			where: departmentWhere,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				workOrder: {
					select: { title: true, priority: true, status: true },
				},
				team: {
					select: { name: true },
				},
				assignedTo: {
					select: { firstName: true, lastName: true },
				},
			},
		}),
		prisma.assignment.count({ where: departmentWhere }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getAssignmentById = async (userId: string, id: string) => {
	const assignment = await prisma.assignment.findUnique({
		where: { id },
		include: {
			workOrder: {
				include: { civicIssue: true },
			},
			team: {
				include: {
					members: {
						include: { staff: { select: { firstName: true, lastName: true } } },
					},
				},
			},
			assignedTo: {
				select: { firstName: true, lastName: true, designation: true },
			},
			assignedBy: { select: { firstName: true, lastName: true } },
		},
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	await checkDepartmentAccess(userId, assignment.workOrder.civicIssue.departmentId as string);

	return assignment;
};

const reassignAssignment = async (
	userId: string,
	assignmentId: string,
	payload: IReassignAssignmentPayload,
) => {
	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: { workOrder: true },
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	await checkDepartmentAccess(userId, assignment.workOrder.departmentId);

	if (assignment.status === AssignmentStatus.UNASSIGNED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot reassign an already unassigned record. Create a new assignment instead.",
		);
	}

	let newTargetUserId: string | null = null;
	let newAssignedTeamId: string | null = null;
	let lifecycleStatus: LifecycleStatus = LifecycleStatus.ASSIGNED;

	if (payload.teamId) {
		const team = await prisma.team.findUnique({
			where: { id: payload.teamId },
		});
		if (!team || team.status !== "ACTIVE")
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Target Team is invalid or inactive",
			);
		if (!team.leaderId)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Target Team must have a leader",
			);
		newTargetUserId = team.leaderId;
		newAssignedTeamId = team.id;
		lifecycleStatus = LifecycleStatus.TEAM_ASSIGNED;
	} else if (payload.assignedToId) {
		newTargetUserId = payload.assignedToId;
	} else {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Must provide teamId or assignedToId",
		);
	}

	if (newTargetUserId === assignment.assignedToId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Assignment is already assigned to this target",
		);
	}

	const newTechnician = await prisma.staffProfile.findUnique({
		where: { userId: newTargetUserId },
	});
	if (!newTechnician)
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Target technician/leader not found",
		);
	if (!newTechnician.isAvailable)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Target technician is unavailable",
		);
	if (newTechnician.currentWorkload >= newTechnician.maxWorkload)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Target technician has reached maximum workload",
		);

	const assigner = await prisma.staffProfile.findUnique({ where: { userId } });

	const result = await prisma.$transaction(async (tx) => {
		if (
			assignment.assignedToId &&
			assignment.status !== AssignmentStatus.REJECTED
		) {
			await tx.staffProfile.update({
				where: { userId: assignment.assignedToId },
				data: { currentWorkload: { decrement: 1 } },
			});
		}

		const updatedAssignment = await tx.assignment.update({
			where: { id: assignmentId },
			data: {
				assignedToId: newTargetUserId,
				teamId: newAssignedTeamId,
				assignedById: assigner ? userId : null,
				status: AssignmentStatus.PENDING,
				reason: payload.reason || "Reassigned",
			},
		});

		await tx.workOrder.update({
			where: { id: assignment.workOrderId },
			data: { currentAssigneeId: newTargetUserId, status: lifecycleStatus },
		});
		await tx.civicIssue.update({
			where: { id: assignment.workOrder.civicIssueId },
			data: { status: lifecycleStatus },
		});

		await createCivicIssueHistory({
			civicIssueId: assignment.workOrder.civicIssueId,
			changedById: userId,
			previousStatus: assignment.workOrder.status as LifecycleStatus,
			newStatus: lifecycleStatus,
			notes: `Reassigned${payload.reason ? `: ${payload.reason}` : ""}`,
			tx,
		});

		await tx.staffProfile.update({
			where: { userId: newTargetUserId },
			data: { currentWorkload: { increment: 1 } },
		});

		await tx.notification.create({
			data: {
				userId: newTargetUserId,
				type: NotificationType.REQUEST_ASSIGNED,
				title: "Work Order Reassigned To You",
				message: `You have been reassigned Work Order: ${assignment.workOrder.title}`,
				resourceType: Resource.WORK_ORDER,
				resourceId: assignment.workOrderId,
			},
		});

		await tx.auditLog.create({
			data: {
				userId,
				action: Action.REASSIGN,
				resource: Resource.ASSIGNMENT,
				resourceId: assignmentId,
				oldValue: {
					assignedToId: assignment.assignedToId,
					teamId: assignment.teamId,
				},
				newValue: { assignedToId: newTargetUserId, teamId: newAssignedTeamId },
			},
		});

		return updatedAssignment;
	});

	return result;
};

const unassignAssignment = async (userId: string, assignmentId: string) => {
	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: { workOrder: true },
	});

	if (!assignment)
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");

	await checkDepartmentAccess(userId, assignment.workOrder.departmentId);

	if (assignment.status === AssignmentStatus.UNASSIGNED)
		throw new AppError(httpStatus.BAD_REQUEST, "Already unassigned");

	const result = await prisma.$transaction(async (tx) => {
		if (
			assignment.assignedToId &&
			assignment.status !== AssignmentStatus.REJECTED
		) {
			await tx.staffProfile.update({
				where: { userId: assignment.assignedToId },
				data: { currentWorkload: { decrement: 1 } },
			});
		}

		const updatedAssignment = await tx.assignment.update({
			where: { id: assignmentId },
			data: {
				status: AssignmentStatus.UNASSIGNED,
				unassignedAt: new Date(),
			},
		});

		await tx.workOrder.update({
			where: { id: assignment.workOrderId },
			data: { currentAssigneeId: null, status: LifecycleStatus.TRIAGED },
		});
		await tx.civicIssue.update({
			where: { id: assignment.workOrder.civicIssueId },
			data: { status: LifecycleStatus.TRIAGED },
		});

		await createCivicIssueHistory({
			civicIssueId: assignment.workOrder.civicIssueId,
			changedById: userId,
			previousStatus: assignment.workOrder.status as LifecycleStatus,
			newStatus: LifecycleStatus.TRIAGED,
			notes: "Assignment removed. Awaiting re-dispatch.",
			tx,
		});

		if (assignment.assignedToId) {
			await tx.notification.create({
				data: {
					userId: assignment.assignedToId,
					type: NotificationType.SYSTEM,
					title: "Work Order Unassigned",
					message: `Work Order ${assignment.workOrder.title} has been removed from your queue.`,
					resourceType: Resource.WORK_ORDER,
					resourceId: assignment.workOrderId,
				},
			});
		}

		await tx.auditLog.create({
			data: {
				userId,
				action: Action.UPDATE,
				resource: Resource.ASSIGNMENT,
				resourceId: assignmentId,
				oldValue: { status: assignment.status },
				newValue: { status: AssignmentStatus.UNASSIGNED },
			},
		});

		return updatedAssignment;
	});

	return result;
};

export const AssignmentService = {
	createAssignment,
	getMyAssignments,
	updateAssignmentStatus,
	getAllAssignments,
	getDepartmentAssignments,
	getAssignmentById,
	reassignAssignment,
	unassignAssignment,
};
