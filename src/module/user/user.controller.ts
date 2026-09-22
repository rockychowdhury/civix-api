import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { UserService } from "./user.service";
import { UserValidation } from "./user.validation";

const getMe = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await UserService.getMe(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile retrieved successfully",
		data: result,
	});
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await UserService.updateMe(userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile updated successfully",
		data: result,
	});
});

const deleteMe = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await UserService.deleteMe(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Account soft-deleted successfully",
		data: result,
	});
});

const getUsers = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, ["status", "isEmailVerified", "searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await UserService.getUsers(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Users retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
	const { userId } = req.params as { userId: string };

	const result = await UserService.getUserById(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User retrieved successfully",
		data: result,
	});
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
	const requesterId = (req as any).user.userId;
	const { userId } = req.params as { userId: string };
	const { status } = req.body;

	const result = await UserService.updateUserStatus(requesterId, userId, { status });

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User status updated successfully",
		data: result,
	});
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
	const requesterId = (req as any).user.userId;
	const { userId } = req.params as { userId: string };

	const result = await UserService.deleteUser(requesterId, userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User soft-deleted successfully",
		data: result,
	});
});

const restoreUser = catchAsync(async (req: Request, res: Response) => {
	const requesterId = (req as any).user.userId;
	const { userId } = req.params as { userId: string };

	const result = await UserService.restoreUser(requesterId, userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User restored successfully",
		data: result,
	});
});


export const UserController = {
	getMe,
	updateMe,
	deleteMe,
	getUsers,
	getUserById,
	updateUserStatus,
	deleteUser,
	restoreUser,

};
