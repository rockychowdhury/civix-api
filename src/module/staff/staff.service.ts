import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type { ICreateStaffPayload, IStaffFilter } from "./staff.interface";
import config from "../../config";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { staffSearchableFields } from "./staff.constant";
import { DepartmentRole } from "../../../generated/prisma/enums";

// Utility for generating random passwords if none provided
const generatePassword = () => Math.random().toString(36).slice(-8);

// Utility for unique Employee IDs
const generateEmployeeId = (rolePrefix: string) => {
	const rand = Math.floor(1000 + Math.random() * 9000);
	return `${rolePrefix}-${Date.now().toString().slice(-4)}${rand}`;
};

const createPlatformAdmin = async (payload: ICreateStaffPayload) => {
	const role = await prisma.role.findUnique({
		where: { code: "PLATFORM_ADMIN" },
	});
	if (!role)
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"PLATFORM_ADMIN role not found in system.",
		);

	const existingUser = await prisma.user.findUnique({
		where: { email: payload.email },
	});
	if (existingUser)
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists.",
		);

	const password = payload.password || generatePassword();
	const passwordHash = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds) || 10,
	);

	return prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				email: payload.email,
				phone: payload.phone,
				passwordHash,
				displayName: `${payload.firstName} ${payload.lastName}`,
				status: "ACTIVE",
				isEmailVerified: true,
				userRoles: { create: { roleId: role.id } },
				staffProfile: {
					create: {
						employeeId: generateEmployeeId("PA"),
						firstName: payload.firstName,
						lastName: payload.lastName,
						designation: payload.designation || "Platform Admin",
					},
				},
			},
			omit: { passwordHash: true },
			include: { staffProfile: true },
		});
		return user;
	});
};

const createCityAdmin = async (payload: ICreateStaffPayload) => {
	if (!payload.municipalityId)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"municipalityId is required for City Admin",
		);
	const role = await prisma.role.findUnique({ where: { code: "CITY_ADMIN" } });
	if (!role)
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"CITY_ADMIN role missing.",
		);

	const existingUser = await prisma.user.findUnique({
		where: { email: payload.email },
	});
	if (existingUser)
		throw new AppError(httpStatus.CONFLICT, "User already exists.");

	const password = payload.password || generatePassword();
	const passwordHash = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds) || 10,
	);

	return prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				email: payload.email,
				phone: payload.phone,
				passwordHash,
				displayName: `${payload.firstName} ${payload.lastName}`,
				status: "ACTIVE",
				isEmailVerified: true,
				userRoles: { create: { roleId: role.id } },
				staffProfile: {
					create: {
						employeeId: generateEmployeeId("CA"),
						firstName: payload.firstName,
						lastName: payload.lastName,
						designation: payload.designation || "City Admin",
						municipalityId: payload.municipalityId,
					},
				},
			},
			omit: { passwordHash: true },
			include: { staffProfile: true },
		});
		return user;
	});
};

const _createDepartmentStaff = async (
	payload: ICreateStaffPayload,
	roleCode: string,
	deptRole: DepartmentRole,
	prefix: string,
	requesterUserId: string,
) => {
	if (!payload.departmentId)
		throw new AppError(httpStatus.BAD_REQUEST, "departmentId is required.");
	const role = await prisma.role.findUnique({ where: { code: roleCode } });
	if (!role)
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			`${roleCode} role missing.`,
		);

	const existingUser = await prisma.user.findUnique({
		where: { email: payload.email },
	});
	if (existingUser)
		throw new AppError(httpStatus.CONFLICT, "User already exists.");

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

	if (!requester)
		throw new AppError(httpStatus.FORBIDDEN, "Requester profile not found");

	const requesterRoleCodes = requester.user.userRoles.map((ur) => ur.role.code);
	const isGlobalAdmin =
		requesterRoleCodes.includes("SUPER_ADMIN") ||
		requesterRoleCodes.includes("PLATFORM_ADMIN");
	const isCityAdmin =
		requesterRoleCodes.includes("CITY_ADMIN") &&
		requester.municipalityId === department.municipalityId;

	const deptMembership = requester.departmentMembers.find(
		(dm) => dm.departmentId === payload.departmentId,
	);
	const isDeptManager =
		deptMembership?.role === DepartmentRole.MANAGER ||
		deptMembership?.role === DepartmentRole.HEAD;
	const isDispatcherCreatingTech =
		deptMembership?.role === DepartmentRole.DISPATCHER &&
		deptRole === DepartmentRole.TECHNICIAN;

	if (
		!isGlobalAdmin &&
		!isCityAdmin &&
		!isDeptManager &&
		!isDispatcherCreatingTech
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You do not have permission to create staff in this department.",
		);
	}

	const password = payload.password || generatePassword();
	const passwordHash = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds) || 10,
	);

	return prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				email: payload.email,
				phone: payload.phone,
				passwordHash,
				displayName: `${payload.firstName} ${payload.lastName}`,
				status: "ACTIVE",
				isEmailVerified: true,
				userRoles: { create: { roleId: role.id } },
				staffProfile: {
					create: {
						employeeId: generateEmployeeId(prefix),
						firstName: payload.firstName,
						lastName: payload.lastName,
						designation: payload.designation || roleCode.replace("_", " "),
						municipalityId: department.municipalityId,
						departmentMembers: {
							create: {
								departmentId: payload.departmentId!,
								role: deptRole,
							},
						},
					},
				},
			},
			omit: { passwordHash: true },
			include: { staffProfile: true },
		});
		return user;
	});
};

const createDepartmentManager = (
	payload: ICreateStaffPayload,
	reqUserId: string,
) =>
	_createDepartmentStaff(
		payload,
		"DEPARTMENT_MANAGER",
		DepartmentRole.MANAGER,
		"MGR",
		reqUserId,
	);

const createDispatcher = (payload: ICreateStaffPayload, reqUserId: string) =>
	_createDepartmentStaff(
		payload,
		"DISPATCHER",
		DepartmentRole.DISPATCHER,
		"DSP",
		reqUserId,
	);

const createTechnician = (payload: ICreateStaffPayload, reqUserId: string) =>
	_createDepartmentStaff(
		payload,
		"TECHNICIAN",
		DepartmentRole.TECHNICIAN,
		"TEC",
		reqUserId,
	);

const getAllStaff = async (
	reqUserId: string,
	filters: IStaffFilter,
	options: any = {},
) => {
	const requester = await prisma.staffProfile.findUnique({
		where: { userId: reqUserId },
		include: {
			departmentMembers: true,
			user: { include: { userRoles: { include: { role: true } } } },
		},
	});

	if (!requester) {
		// Fallback for SUPER_ADMIN which might not have a staff profile if initialized raw,
		// but our seed script gives SUPER_ADMIN a staff profile.
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Requester staff profile not found",
		);
	}

	const requesterRoleCodes = requester.user.userRoles.map((ur) => ur.role.code);
	const isGlobal =
		requesterRoleCodes.includes("SUPER_ADMIN") ||
		requesterRoleCodes.includes("PLATFORM_ADMIN");

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		staffSearchableFields,
	);

	// Contextual Filtering
	if (!isGlobal) {
		if (requesterRoleCodes.includes("CITY_ADMIN")) {
			where.municipalityId = requester.municipalityId;
		} else {
			// They are department staff, limit to their departments
			const deptIds = requester.departmentMembers.map((dm) => dm.departmentId);
			where.departmentMembers = { some: { departmentId: { in: deptIds } } };
		}
	}

	// Additional manual filter for department if requested
	if (filters.departmentId) {
		where.departmentMembers = {
			...(where.departmentMembers || {}),
			some: { departmentId: filters.departmentId },
		};
	}

	// Filter by role if requested
	if (filters.role) {
		where.user = { userRoles: { some: { role: { code: filters.role } } } };
	}

	const [data, total] = await Promise.all([
		prisma.staffProfile.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				user: {
					select: {
						email: true,
						status: true,
						userRoles: { include: { role: { select: { code: true } } } },
					},
				},
				departmentMembers: {
					include: {
						department: { select: { name: true, municipalityId: true } },
					},
				},
			},
		}),
		prisma.staffProfile.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

export const StaffService = {
	createPlatformAdmin,
	createCityAdmin,
	createDepartmentManager,
	createDispatcher,
	createTechnician,
	getAllStaff,
};
