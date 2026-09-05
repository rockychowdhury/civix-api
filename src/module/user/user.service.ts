import { prisma } from "../../lib/prisma";
import { UserStatus } from "../../../generated/prisma/enums";
import type { IUser } from "./user.interface";
import type { Request } from "express";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const getMe = async (req: Request): Promise<IUser> => {
	const userId = (req as any).user?.userId;

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
	req: Request,
): Promise<{
	data: IUser[];
	meta: { page: number; limit: number; total: number; totalPages: number };
}> => {
	const page = parseInt((req.query as any).page as string) || 1;
	const limit = parseInt((req.query as any).limit as string) || 10;
	const skip = (page - 1) * limit;

	const where = {
		deletedAt: null,
		status: UserStatus.ACTIVE,
	};

	const [users, total] = await Promise.all([
		prisma.user.findMany({
			where,
			include: {
				citizenProfile: true,
				staffProfile: true,
				userRoles: { include: { role: true } },
			},
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
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
	req: Request,
	payload: { firstName?: string; lastName?: string; phone?: string },
): Promise<IUser> => {
	const userId = (req as any).user?.userId;

	if (!userId) {
		throw new Error("User not authenticated");
	}

	const user = await prisma.user.update({
		where: { id: userId },
		data: {
			...(payload.firstName && {
				citizenProfile: { update: { firstName: payload.firstName } },
			}),
			...(payload.lastName && {
				citizenProfile: { update: { lastName: payload.lastName } },
			}),
			...(payload.phone !== undefined && { phone: payload.phone }),
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

const deleteMe = async (req: Request): Promise<IUser> => {
	const userId = (req as any).user?.userId;

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
	userId: string,
	payload: { status: UserStatus },
): Promise<IUser> => {
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

const deleteUser = async (userId: string): Promise<IUser> => {
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

const getUserRoles = async (userId: string) => {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

	const userRoles = await prisma.userRole.findMany({
		where: { userId },
		include: { role: true },
	});

	return userRoles.map((ur) => ur.role);
};

const assignRole = async (userId: string, roleId: string) => {
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

	return await getUserRoles(userId);
};

const removeRole = async (userId: string, roleId: string) => {
	const userRole = await prisma.userRole.findFirst({
		where: { userId, roleId },
	});

	if (!userRole) {
		throw new AppError(httpStatus.NOT_FOUND, "User does not have this role");
	}

	await prisma.userRole.delete({
		where: {
			userId_roleId: {
				userId,
				roleId,
			},
		},
	});

	return await getUserRoles(userId);
};

export const UserService = {
	getMe,
	getUsers,
	getUserById,
	updateMe,
	deleteMe,
	updateUserStatus,
	deleteUser,
	getUserRoles,
	assignRole,
	removeRole,
};
