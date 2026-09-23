import httpStatus from "http-status";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";

// Define the role hierarchy mapping:
// Which roles can a given requester role MANAGE (assign, remove, suspend, delete)?
const ROLE_MANAGEMENT_MATRIX: Record<string, string[]> = {
	SUPER_ADMIN: [
		"PLATFORM_ADMIN",
		"CITY_ADMIN",
		"DEPARTMENT_MANAGER",
		"DISPATCHER",
		"TECHNICIAN",
		"CITIZEN",
	],
	PLATFORM_ADMIN: [
		"CITY_ADMIN",
		"DEPARTMENT_MANAGER",
		"DISPATCHER",
		"TECHNICIAN",
		"CITIZEN",
	],
	CITY_ADMIN: ["DEPARTMENT_MANAGER", "DISPATCHER", "TECHNICIAN", "CITIZEN"],
	DEPARTMENT_MANAGER: ["DISPATCHER", "TECHNICIAN", "CITIZEN"],
	DISPATCHER: ["TECHNICIAN", "CITIZEN"],
	TECHNICIAN: [],
	CITIZEN: [],
};

// Roles ranked from highest (0) to lowest
const ROLE_RANKING = [
	"SUPER_ADMIN",
	"PLATFORM_ADMIN",
	"CITY_ADMIN",
	"DEPARTMENT_MANAGER",
	"DISPATCHER",
	"TECHNICIAN",
	"CITIZEN",
];

export const checkRoleManagementPrivilege = async (
	requesterId: string,
	targetUserId?: string,
	targetRoleId?: string,
) => {
	// 1. Get the requester's highest ranking role
	const requester = await prisma.user.findUnique({
		where: { id: requesterId },
		include: { userRoles: { include: { role: true } } },
	});

	if (!requester) throw new AppError(httpStatus.UNAUTHORIZED, "Requester not found");

	const requesterRoles = requester.userRoles.map((ur) => ur.role.code);
	let highestRequesterRole = "CITIZEN";
	let highestRank = 999;

	for (const roleCode of requesterRoles) {
		const rank = ROLE_RANKING.indexOf(roleCode);
		if (rank !== -1 && rank < highestRank) {
			highestRank = rank;
			highestRequesterRole = roleCode;
		}
	}

	const allowedToManage = ROLE_MANAGEMENT_MATRIX[highestRequesterRole] || [];
	const isRequesterSuperAdmin = highestRequesterRole === "SUPER_ADMIN";

	// 2. Check Target Role (if assigning or removing a role)
	if (targetRoleId) {
		const role = await prisma.role.findUnique({ where: { id: targetRoleId } });
		if (!role) throw new AppError(httpStatus.NOT_FOUND, "Target role not found");

		// Special case: Nobody can manage the SUPER_ADMIN role except SUPER_ADMIN
		if (role.code === "SUPER_ADMIN" && !isRequesterSuperAdmin) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Only a Super Admin can assign or remove the Super Admin role.",
			);
		}

		if (role.code !== "SUPER_ADMIN" && !allowedToManage.includes(role.code)) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				`Your role (${highestRequesterRole}) is not authorized to manage the ${role.code} role.`,
			);
		}
	}

	// 3. Check Target User (if updating status, soft-deleting, or modifying roles of a user)
	if (targetUserId) {
		const targetUser = await prisma.user.findUnique({
			where: { id: targetUserId },
			include: { userRoles: { include: { role: true } } },
		});

		if (!targetUser) throw new AppError(httpStatus.NOT_FOUND, "Target user not found");

		const targetRoles = targetUser.userRoles.map((ur) => ur.role.code);
		let highestTargetRole = "CITIZEN";
		let highestTargetRank = 999;

		for (const roleCode of targetRoles) {
			const rank = ROLE_RANKING.indexOf(roleCode);
			if (rank !== -1 && rank < highestTargetRank) {
				highestTargetRank = rank;
				highestTargetRole = roleCode;
			}
		}

		// A SUPER_ADMIN cannot be managed by anyone (except themselves/another SUPER_ADMIN)
		if (highestTargetRole === "SUPER_ADMIN" && !isRequesterSuperAdmin) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You cannot modify the account or roles of a Super Admin.",
			);
		}

		// General hierarchical check: You can only manage a user whose highest role is lower than yours in the matrix
		if (highestTargetRole !== "SUPER_ADMIN" && !allowedToManage.includes(highestTargetRole)) {
			// Exception: A user can always update their own non-role data if the controller allows it,
			// but for administrative actions like suspension/deletion/role assignment, they must outrank the target.
			// We assume this check is only called for administrative actions on OTHERS.
			if (requesterId !== targetUserId) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					`Your role (${highestRequesterRole}) cannot manage a user with the ${highestTargetRole} role.`,
				);
			}
		}
	}
};
