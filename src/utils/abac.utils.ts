import httpStatus from "http-status";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";

/**
 * Checks if a user has access to a specific municipality's resources.
 * Global admins (SUPER_ADMIN, PLATFORM_ADMIN) always pass.
 * Staff members (CITY_ADMIN, DISPATCHER, DEPARTMENT_MANAGER, TECHNICIAN) must belong to the target municipality.
 * Citizens generally do not have access to internal municipality data unless explicitly granted elsewhere.
 */
export const checkMunicipalityAccess = async (
	userId: string,
	targetMunicipalityId: string,
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			userRoles: { include: { role: true } },
			staffProfile: true,
		},
	});

	if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "User not found");

	const roleCodes = user.userRoles.map((ur) => ur.role.code);
	const isGlobalAdmin = roleCodes.some((code) =>
		["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(code),
	);

	if (isGlobalAdmin) return true;

	// For all other roles, if they are trying to access municipality-bound data,
	// they MUST have a staff profile and it must match the target municipality.
	if (!user.staffProfile || user.staffProfile.municipalityId !== targetMunicipalityId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You do not have permission to access resources in this municipality",
		);
	}

	return true;
};

/**
 * Checks if a user has access to a specific department's resources.
 * Global admins always pass.
 * City Admins pass if the department belongs to their municipality.
 * Dispatchers, Managers, and Technicians must be explicitly assigned to the target department.
 */
export const checkDepartmentAccess = async (
	userId: string,
	targetDepartmentId: string,
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			userRoles: { include: { role: true } },
			staffProfile: { include: { departmentMembers: true } },
		},
	});

	if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "User not found");

	const roleCodes = user.userRoles.map((ur) => ur.role.code);
	const isGlobalAdmin = roleCodes.some((code) =>
		["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(code),
	);

	if (isGlobalAdmin) return true;

	if (!user.staffProfile) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You do not have a staff profile to access this resource",
		);
	}

	// City Admins can access any department within their municipality
	if (roleCodes.includes("CITY_ADMIN")) {
		const dept = await prisma.department.findUnique({
			where: { id: targetDepartmentId },
		});

		if (!dept || dept.municipalityId !== user.staffProfile.municipalityId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"This department does not belong to your municipality",
			);
		}
		return true;
	}

	// Other staff members (Dispatcher, Manager, Tech) must be explicitly a member of the department
	const isMember = user.staffProfile.departmentMembers.some(
		(dm) => dm.departmentId === targetDepartmentId,
	);

	if (!isMember) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not assigned to this department",
		);
	}

	return true;
};

/**
 * Checks if a user can interact with a civic issue (e.g. reopen).
 * Global admins always pass.
 * Staff members must belong to the civic issue's municipality.
 */
export const checkCivicIssueInteractionAccess = async (
	userId: string,
	civicIssueId: string,
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			userRoles: { include: { role: true } },
			staffProfile: true,
		},
	});

	if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "User not found");

	const roleCodes = user.userRoles.map((ur) => ur.role.code);
	const isGlobalAdmin = roleCodes.some((code) =>
		["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(code),
	);

	if (isGlobalAdmin) return true;

	const civicIssue = await prisma.civicIssue.findUnique({
		where: { id: civicIssueId },
	});

	if (!civicIssue) {
		throw new AppError(httpStatus.NOT_FOUND, "Civic issue not found");
	}

	if (!user.staffProfile) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You do not have a staff profile to interact with this resource",
		);
	}

	if (user.staffProfile.municipalityId !== civicIssue.municipalityId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You do not have permission to interact with this civic issue",
		);
	}

	return true;
};