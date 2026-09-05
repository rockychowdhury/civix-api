import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { RoleService } from "./role.service";

const getRoles = catchAsync(async (req: Request, res: Response) => {
	const result = await RoleService.getRoles();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Roles retrieved successfully",
		data: result,
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
	const { roleId } = req.params;
	const result = await RoleService.getRoleById(roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role retrieved successfully",
		data: result,
	});
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
	const { roleId } = req.params;
	const result = await RoleService.updateRole(roleId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role updated successfully",
		data: result,
	});
});

const deleteRole = catchAsync(async (req: Request, res: Response) => {
	const { roleId } = req.params;
	const result = await RoleService.deleteRole(roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role deleted successfully",
		data: result,
	});
});

const getRolePermissions = catchAsync(async (req: Request, res: Response) => {
	const { roleId } = req.params;
	const result = await RoleService.getRolePermissions(roleId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role permissions retrieved successfully",
		data: result,
	});
});

const replaceRolePermissions = catchAsync(async (req: Request, res: Response) => {
	const { roleId } = req.params;
	const result = await RoleService.replaceRolePermissions(roleId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Role permissions replaced successfully",
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
};

