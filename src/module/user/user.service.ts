import { prisma } from "../../lib/prisma";
import { UserStatus } from "../../../generated/prisma/enums";
import type { IUser, IUserUpdatePayload } from "./user.interface";
import type { Request } from "express";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { userSearchableFields } from "./user.constant";
import { checkRoleManagementPrivilege } from "../../utils/role.utils";

const getMe = async (userId: string): Promise<IUser> => {
	if (!userId) {
		throw new Error("User not authenticated");
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			citizenProfile: true,
			staffProfile: true,
			userRoles: { include: { role: true } },
		},
	});

	if (!user) {
		throw new Error("User not found");
	}

	const { passwordHash, ...userWithoutPassword } = user as any;

	return userWithoutPassword as IUser;
};

const getUsers = async (
	filters: any = {},
	options: any = {},
): Promise<{
	data: IUser[];
	meta: { page: number; limit: number; total: number; totalPages: number };
}> => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		userSearchableFields,
	);

	// Default filters
	if (!where.deletedAt) where.deletedAt = null;
	if (!where.status) where.status = UserStatus.ACTIVE;

	// Handle boolean conversion if needed
	if (
		where.isEmailVerified !== undefined &&
		typeof where.isEmailVerified === "string"
	) {
		where.isEmailVerified = where.isEmailVerified === "true";
	}

	const [users, total] = await Promise.all([
		prisma.user.findMany({
			where,
			include: {
				citizenProfile: true,
				staffProfile: true,
				userRoles: { include: { role: true } },
			},
			skip,
			take,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
		}),
		prisma.user.count({ where }),
	]);

	const formattedUsers = users.map((user): IUser => {
		const { passwordHash, ...userWithoutPassword } = user as any;
		return userWithoutPassword as IUser;
	});

	return {
		data: formattedUsers,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getUserById = async (userId: string): Promise<IUser> => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			citizenProfile: true,
			staffProfile: true,
			userRoles: { include: { role: true } },
		},
	});

	if (!user) {
		throw new Error("User not found");
	}

	const { passwordHash, ...userWithoutPassword } = user as any;

	return userWithoutPassword as IUser;
};

const updateMe = async (
	userId: string,
	payload: IUserUpdatePayload,
): Promise<IUser> => {
	if (!userId) {
		throw new Error("User not authenticated");
	}

	const existingUser = await prisma.user.findUnique({
		where: { id: userId },
		include: { userRoles: { include: { role: true } } },
	});

	if (!existingUser) {
		throw new Error("User not found");
	}

	const isCitizen = existingUser.userRoles.some((ur) => ur.role.code === "CITIZEN");
	if (!isCitizen) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Profile updates via this endpoint are only allowed for Citizens.",
		);
	}

	const user = await prisma.user.update({
		where: { id: userId },
		data: {
			...(payload.displayName !== undefined && { displayName: payload.displayName }),
			...(payload.phone !== undefined && { phone: payload.phone }),
			citizenProfile: {
				update: {
					...(payload.firstName && { firstName: payload.firstName }),
					...(payload.lastName && { lastName: payload.lastName }),
					...(payload.nidNumber && { nidNumber: payload.nidNumber }),
				},
			},
		},
		include: {
			citizenProfile: true,
			staffProfile: true,
			userRoles: { include: { role: true } },
		},
	});

	const { passwordHash, ...userWithoutPassword } = user as any;

	return userWithoutPassword as IUser;
};

const deleteMe = async (userId: string): Promise<IUser> => {
	if (!userId) {
		throw new Error("User not authenticated");
	}

	const user = await prisma.user.update({
		where: { id: userId },
		data: { deletedAt: new Date() },
		include: {
			citizenProfile: true,
			staffProfile: true,
			userRoles: { include: { role: true } },
		},
	});

	const { passwordHash, ...userWithoutPassword } = user as any;

	return userWithoutPassword as IUser;
};

const updateUserStatus = async (
	requesterId: string,
	userId: string,
	payload: { status: UserStatus },
): Promise<IUser> => {
	await checkRoleManagementPrivilege(requesterId, userId);

	const user = await prisma.user.update({
		where: { id: userId },
		data: { status: payload.status },
		include: {
			citizenProfile: true,
			staffProfile: true,
			userRoles: { include: { role: true } },
		},
	});

	const { passwordHash, ...userWithoutPassword } = user as any;

	return userWithoutPassword as IUser;
};

const deleteUser = async (requesterId: string, userId: string): Promise<IUser> => {
	await checkRoleManagementPrivilege(requesterId, userId);

	const user = await prisma.user.update({
		where: { id: userId },
		data: { deletedAt: new Date() },
		include: {
			citizenProfile: true,
			staffProfile: true,
			userRoles: { include: { role: true } },
		},
	});

	const { passwordHash, ...userWithoutPassword } = user as any;

	return userWithoutPassword as IUser;
};

const restoreUser = async (requesterId: string, userId: string): Promise<IUser> => {
	await checkRoleManagementPrivilege(requesterId, userId);

	const user = await prisma.user.update({
		where: { id: userId },
		data: { deletedAt: null },
		include: {
			citizenProfile: true,
			staffProfile: true,
			userRoles: { include: { role: true } },
		},
	});

	const { passwordHash, ...userWithoutPassword } = user as any;

	return userWithoutPassword as IUser;
};


export const UserService = {
	getMe,
	getUsers,
	getUserById,
	updateMe,
	deleteMe,
	updateUserStatus,
	deleteUser,
	restoreUser,
};
