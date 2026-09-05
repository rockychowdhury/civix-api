import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { JwtPayload } from "jsonwebtoken";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";

export interface RequestUser {
	email: string;
	userId: string;
}

declare global {
	namespace Express {
		interface Request {
			user?: RequestUser;
		}
	}
}

export const requirePermission = (action: string, resource: string) => {
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const token = req.cookies.accessToken
			? req.cookies.accessToken
			: req.headers.authorization?.startsWith("Bearer ")
				? req.headers.authorization?.split(" ")[1]
				: req.headers.authorization;

		if (!token) {
			throw new AppError(
				httpStatus.UNAUTHORIZED,
				"You are not logged in. Please log in to access this resource.",
			);
		}

		const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

		if (!verifiedToken.success) {
			throw new AppError(httpStatus.UNAUTHORIZED, verifiedToken.error);
		}

		const { userId, email } = verifiedToken.data as JwtPayload;

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, email: true, status: true },
		});

		if (!user) {
			throw new AppError(
				httpStatus.UNAUTHORIZED,
				"User not found. Please log in again.",
			);
		}

		if (user.status !== "ACTIVE") {
			throw new AppError(
				httpStatus.FORBIDDEN,
				`Your account is ${user.status}. Please contact support.`,
			);
		}

		const hasPermission = await prisma.userRole.findFirst({
			where: {
				userId,
				role: {
					rolePermissions: {
						some: {
							permission: {
								OR: [
									{ action, resource },
									{ action: "manage", resource: "all" },
								],
							},
						},
					},
				},
			},
		});

		if (!hasPermission) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Forbidden. You don't have permission to access this resource.",
			);
		}

		req.user = {
			email: user.email,
			userId: user.id,
		};

		next();
	});
};
