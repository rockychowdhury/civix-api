import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";
import { UserValidation } from "./user.validation";

const getMe = catchAsync(async (req: Request, res: Response) => {
	const result = await UserService.getMe(req);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile retrieved successfully",
		data: result,
	});
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
	const result = await UserService.updateMe(req, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile updated successfully",
		data: result,
	});
});

const deleteMe = catchAsync(async (req: Request, res: Response) => {
	const result = await UserService.deleteMe(req);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Account soft-deleted successfully",
		data: result,
	});
});

const getUsers = catchAsync(async (req: Request, res: Response) => {
	const result = await UserService.getUsers(req);

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
	const { userId } = req.params as { userId: string };
	const { status } = req.body;

	const result = await UserService.updateUserStatus(userId, { status });

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User status updated successfully",
		data: result,
	});
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
	const { userId } = req.params as { userId: string };

	const result = await UserService.deleteUser(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User soft-deleted successfully",
		data: result,
	});
});

const getUserRoles = catchAsync(async (req: Request, res: Response) => {
	const { userId } = req.params as { userId: string };
	const result = await UserService.getUserRoles(userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User roles retrieved successfully",
		data: result,
	});
});

const assignRole = catchAsync(async (req: Request, res: Response) => {
	const { userId } = req.params as { userId: string };
	const { role_id } = req.body;
	const result = await UserService.assignRole(userId, role_id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role assigned successfully",
		data: result,
	});
});

const removeRole = catchAsync(async (req: Request, res: Response) => {
	const { userId, roleId } = req.params as { userId: string; roleId: string };
	const result = await UserService.removeRole(userId, roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role removed successfully",
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
	getUserRoles,
	assignRole,
	removeRole,
};
