import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateRole, IReplaceRolePermissions, IUpdateRole } from "./role.interface";

const getRoles = async () => {
	return await prisma.role.findMany();
};

const createRole = async (payload: ICreateRole) => {
	const isRoleExists = await prisma.role.findUnique({
		where: { name: payload.name },
	});
	if (isRoleExists) throw new AppError(httpStatus.CONFLICT, "Role already exists");

	return await prisma.role.create({ data: payload });
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
			where: { name: payload.name, id: { not: roleId } },
		});
		if (isRoleExists) throw new AppError(httpStatus.CONFLICT, "Role name already exists");
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

const replaceRolePermissions = async (roleId: string, payload: IReplaceRolePermissions) => {
	const role = await prisma.role.findUnique({ where: { id: roleId } });
	if (!role) throw new AppError(httpStatus.NOT_FOUND, "Role not found");

	const permissionIds = payload.permission_ids;

	const permissions = await prisma.permission.findMany({
		where: { id: { in: permissionIds } },
	});

	if (permissions.length !== permissionIds.length) {
		throw new AppError(httpStatus.BAD_REQUEST, "One or more permission IDs are invalid");
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

export const RoleService = {
	getRoles,
	createRole,
	getRoleById,
	updateRole,
	deleteRole,
	getRolePermissions,
	replaceRolePermissions,
};

