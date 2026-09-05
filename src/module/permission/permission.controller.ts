import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PermissionService } from "./permission.service";

const getPermissions = catchAsync(async (req: Request, res: Response) => {
	const result = await PermissionService.getPermissions();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Permissions retrieved successfully",
		data: result,
	});
});

const getPermissionById = catchAsync(async (req: Request, res: Response) => {
	const { permissionId } = req.params;
	const result = await PermissionService.getPermissionById(permissionId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Permission retrieved successfully",
		data: result,
	});
});

export const PermissionController = {
	getPermissions,
	getPermissionById,
};

