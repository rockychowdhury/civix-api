import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type { ICreateTeamPayload, ITeamFilter } from "./team.interface";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { teamSearchableFields } from "./team.constant";
import { DepartmentRole, TeamRole } from "../../../generated/prisma/enums";

const createTeam = async (
	payload: ICreateTeamPayload,
	requesterUserId: string,
) => {
	const department = await prisma.department.findUnique({
		where: { id: payload.departmentId },
	});
	if (!department)
		throw new AppError(httpStatus.NOT_FOUND, "Department not found.");

	// Contextual Check: The requester must have authority over this department
	const requester = await prisma.staffProfile.findUnique({
		where: { userId: requesterUserId },
		include: {
			departmentMembers: true,
			user: { include: { userRoles: { include: { role: true } } } },
		},
	});

	if (!requester) {
		const user = await prisma.user.findUnique({
			where: { id: requesterUserId },
			include: { userRoles: { include: { role: true } } },
		});
		if (user?.userRoles.some((r) => r.role.code === "SUPER_ADMIN")) {
			// SUPER_ADMIN override (if no staff profile exists for some reason, though seed gives one)
		} else {
			throw new AppError(httpStatus.FORBIDDEN, "Requester profile not found");
		}
	}

	let isGlobalAdmin = false;
	let isCityAdmin = false;
	let isDeptManagerOrDispatcher = false;

	if (requester) {
		const requesterRoleCodes = requester.user.userRoles.map(
			(ur) => ur.role.code,
		);
		isGlobalAdmin =
			requesterRoleCodes.includes("SUPER_ADMIN") ||
			requesterRoleCodes.includes("PLATFORM_ADMIN");
		isCityAdmin =
			requesterRoleCodes.includes("CITY_ADMIN") &&
			requester.municipalityId === department.municipalityId;

		const deptMembership = requester.departmentMembers.find(
			(dm) => dm.departmentId === payload.departmentId,
		);
		isDeptManagerOrDispatcher =
			deptMembership?.role === DepartmentRole.MANAGER ||
			deptMembership?.role === DepartmentRole.HEAD ||
			deptMembership?.role === DepartmentRole.DISPATCHER;
	} else {
		isGlobalAdmin = true; // Fallback for SUPER_ADMIN with no staff profile
	}

	if (!isGlobalAdmin && !isCityAdmin && !isDeptManagerOrDispatcher) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You do not have permission to create teams in this department.",
		);
	}

	// Check if team code already exists
	const existingTeam = await prisma.team.findUnique({
		where: { code: payload.code },
	});
	if (existingTeam)
		throw new AppError(httpStatus.CONFLICT, "Team code already exists.");

	return prisma.$transaction(async (tx) => {
		const team = await tx.team.create({
			data: {
				name: payload.name,
				code: payload.code,
				departmentId: payload.departmentId,
				leaderId: payload.leaderId,
			},
		});

		if (payload.memberIds && payload.memberIds.length > 0) {
			const memberData = payload.memberIds.map((id) => ({
				teamId: team.id,
				staffId: id,
				role: TeamRole.MEMBER,
			}));
			await tx.teamMember.createMany({ data: memberData });
		}

		// If a leader was specified and they aren't in memberIds, add them as lead
		if (payload.leaderId && !payload.memberIds?.includes(payload.leaderId)) {
			await tx.teamMember.create({
				data: {
					teamId: team.id,
					staffId: payload.leaderId,
					role: TeamRole.LEAD,
				},
			});
		}

		return team;
	});
};

const getAllTeams = async (
	reqUserId: string,
	filters: ITeamFilter,
	options: any = {},
) => {
	const requester = await prisma.staffProfile.findUnique({
		where: { userId: reqUserId },
		include: {
			departmentMembers: true,
			user: { include: { userRoles: { include: { role: true } } } },
		},
	});

	let isGlobal = false;
	let where: any = {};

	if (requester) {
		const requesterRoleCodes = requester.user.userRoles.map(
			(ur) => ur.role.code,
		);
		isGlobal =
			requesterRoleCodes.includes("SUPER_ADMIN") ||
			requesterRoleCodes.includes("PLATFORM_ADMIN");

		const {
			where: builtWhere,
			orderBy,
			skip,
			take,
			page,
			limit,
		} = buildPrismaQuery(filters, options, teamSearchableFields);
		where = builtWhere;

		// Contextual Filtering
		if (!isGlobal) {
			if (requesterRoleCodes.includes("CITY_ADMIN")) {
				where.department = { municipalityId: requester.municipalityId };
			} else {
				// They are department staff, limit to their departments
				const deptIds = requester.departmentMembers.map(
					(dm) => dm.departmentId,
				);
				where.departmentId = { in: deptIds };
			}
		}
	} else {
		// Verify super admin
		const user = await prisma.user.findUnique({
			where: { id: reqUserId },
			include: { userRoles: { include: { role: true } } },
		});
		if (user?.userRoles.some((r) => r.role.code === "SUPER_ADMIN")) {
			isGlobal = true;
			where = buildPrismaQuery(filters, options, teamSearchableFields).where;
		} else {
			throw new AppError(httpStatus.FORBIDDEN, "Requester not found");
		}
	}

	const { orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		teamSearchableFields,
	);

	const [data, total] = await Promise.all([
		prisma.team.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				department: { select: { name: true } },
				leader: {
					select: { firstName: true, lastName: true, employeeId: true },
				},
				_count: { select: { members: true } },
			},
		}),
		prisma.team.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

export const TeamService = {
	createTeam,
	getAllTeams,
};
