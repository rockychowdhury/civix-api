import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const getPermissions = async () => {
	return await prisma.permission.findMany();
};

const getPermissionById = async (permissionId: string) => {
	const permission = await prisma.permission.findUnique({
		where: { id: permissionId },
	});
	if (!permission) {
		throw new AppError(httpStatus.NOT_FOUND, "Permission not found");
	}
	return permission;
};

export const PermissionService = {
	getPermissions,
	getPermissionById,
};

