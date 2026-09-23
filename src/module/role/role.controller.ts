import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { RoleService } from "./role.service";

const getRoles = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, ["searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await RoleService.getRoles(filters, options);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Roles retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const createRole = catchAsync(async (req: Request, res: Response) => {
	const result = await RoleService.createRole(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Role created successfully",
		data: result,
	});
});

const getRoleById = catchAsync(async (req: Request, res: Response) => {
	const roleId = req.params.roleId as string;
	const result = await RoleService.getRoleById(roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role retrieved successfully",
		data: result,
	});
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
	const roleId = req.params.roleId as string;
	const result = await RoleService.updateRole(roleId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role updated successfully",
		data: result,
	});
});

const deleteRole = catchAsync(async (req: Request, res: Response) => {
	const roleId = req.params.roleId as string;
	const result = await RoleService.deleteRole(roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role deleted successfully",
		data: result,
	});
});

const getRolePermissions = catchAsync(async (req: Request, res: Response) => {
	const roleId = req.params.roleId as string;
	const result = await RoleService.getRolePermissions(roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role permissions retrieved successfully",
		data: result,
	});
});

const replaceRolePermissions = catchAsync(
	async (req: Request, res: Response) => {
		const roleId = req.params.roleId as string;
		const result = await RoleService.replaceRolePermissions(roleId, req.body);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Role permissions replaced successfully",
			data: result,
		});
	},
);

const getUserRoles = catchAsync(async (req: Request, res: Response) => {
	const { userId } = req.params as { userId: string };
	const result = await RoleService.getUserRoles(userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User roles retrieved successfully",
		data: result,
	});
});

const assignRole = catchAsync(async (req: Request, res: Response) => {
	const requesterId = (req as any).user.userId;
	const { userId } = req.params as { userId: string };
	const { roleId } = req.body;
	const result = await RoleService.assignRole(requesterId, userId, roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role assigned successfully",
		data: result,
	});
});

const removeRole = catchAsync(async (req: Request, res: Response) => {
	const requesterId = (req as any).user.userId;
	const { userId, roleId } = req.params as { userId: string; roleId: string };
	const result = await RoleService.removeRole(requesterId, userId, roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role removed successfully",
		data: result,
	});
});

export const RoleController = {
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
