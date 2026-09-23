import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateRole,
	IReplaceRolePermissions,
	IUpdateRole,
} from "./role.interface";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { roleSearchableFields } from "./role.constant";
import { checkRoleManagementPrivilege } from "../../utils/role.utils";

const getRoles = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		roleSearchableFields,
	);

	const [data, total] = await Promise.all([
		prisma.role.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { name: "asc" },
			skip,
			take,
		}),
		prisma.role.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const createRole = async (payload: ICreateRole) => {
	const isRoleExists = await prisma.role.findUnique({
		where: { name: payload.name },
	});
	if (isRoleExists)
		throw new AppError(httpStatus.CONFLICT, "Role already exists");

	return await prisma.role.create({
		data: { ...payload, code: payload.name.toUpperCase().replace(/\s+/g, "_") },
	});
};

const getRoleById = async (roleId: string) => {
	const role = await prisma.role.findUnique({ where: { id: roleId } });
	if (!role) throw new AppError(httpStatus.NOT_FOUND, "Role not found");
	return role;
};

const updateRole = async (roleId: string, payload: IUpdateRole) => {
	const role = await prisma.role.findUnique({ where: { id: roleId } });
	if (!role) throw new AppError(httpStatus.NOT_FOUND, "Role not found");

	if (payload.name) {
		const isRoleExists = await prisma.role.findFirst({
			where: {
				name: payload.name,
				code: payload.name.toUpperCase().replace(/\s+/g, "_"),
				id: { not: roleId },
			},
		});
		if (isRoleExists)
			throw new AppError(httpStatus.CONFLICT, "Role name already exists");
	}

	return await prisma.role.update({
		where: { id: roleId },
		data: payload,
	});
};

const deleteRole = async (roleId: string) => {
	const role = await prisma.role.findUnique({ where: { id: roleId } });
	if (!role) throw new AppError(httpStatus.NOT_FOUND, "Role not found");

	return await prisma.role.delete({ where: { id: roleId } });
};


const getRolePermissions = async (roleId: string) => {
	const role = await prisma.role.findUnique({ where: { id: roleId } });
	if (!role) throw new AppError(httpStatus.NOT_FOUND, "Role not found");

	const rolePermissions = await prisma.rolePermission.findMany({
		where: { roleId },
		include: { permission: true },
	});

	return rolePermissions.map((rp) => rp.permission);
};

const replaceRolePermissions = async (
	roleId: string,
	payload: IReplaceRolePermissions,
) => {
	const role = await prisma.role.findUnique({ where: { id: roleId } });
	if (!role) throw new AppError(httpStatus.NOT_FOUND, "Role not found");

	const permissionIds = payload.permission_ids;

	const permissions = await prisma.permission.findMany({
		where: { id: { in: permissionIds } },
	});

	if (permissions.length !== permissionIds.length) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"One or more permission IDs are invalid",
		);
	}

	await prisma.$transaction([
		prisma.rolePermission.deleteMany({ where: { roleId } }),
		prisma.rolePermission.createMany({
			data: permissionIds.map((permissionId) => ({
				roleId,
				permissionId,
			})),
		}),
	]);

	return await getRolePermissions(roleId);
};

const getUserRoles = async (userId: string) => {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

	const userRoles = await prisma.userRole.findMany({
		where: { userId },
		include: { role: true },
	});

	return userRoles;
};

const assignRole = async (requesterId: string, userId: string, roleId: string) => {
	await checkRoleManagementPrivilege(requesterId, userId, roleId);

	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

	const role = await prisma.role.findUnique({ where: { id: roleId } });
	if (!role) throw new AppError(httpStatus.NOT_FOUND, "Role not found");

	const existingUserRole = await prisma.userRole.findFirst({
		where: { userId, roleId },
	});

	if (existingUserRole) {
		throw new AppError(httpStatus.CONFLICT, "User already has this role");
	}

	await prisma.userRole.create({
		data: { userId, roleId },
	});

	return getUserRoles(userId);
};

const removeRole = async (requesterId: string, userId: string, roleId: string) => {
	await checkRoleManagementPrivilege(requesterId, userId, roleId);

	const userRole = await prisma.userRole.findFirst({
		where: { userId, roleId },
	});

	if (!userRole) {
		throw new AppError(httpStatus.NOT_FOUND, "User does not have this role");
	}

	await prisma.userRole.delete({
		where: { userId_roleId: { userId, roleId } },
	});

	return getUserRoles(userId);
};

export const RoleService = {
	getRoles,
	createRole,
	getRoleById,
	updateRole,
	deleteRole,
	getRolePermissions,
	replaceRolePermissions,
	getUserRoles,
	assignRole,
	removeRole,
};
