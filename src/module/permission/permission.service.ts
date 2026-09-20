import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { permissionSearchableFields } from "./permission.constant";

const getPermissions = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		permissionSearchableFields,
	);

	const [data, total] = await Promise.all([
		prisma.permission.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { action: "asc" },
			skip,
			take,
		}),
		prisma.permission.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
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
