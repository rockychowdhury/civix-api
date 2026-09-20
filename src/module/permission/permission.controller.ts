import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { PermissionService } from "./permission.service";

const getPermissions = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, ["action", "resource", "searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await PermissionService.getPermissions(filters, options);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Permissions retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getPermissionById = catchAsync(async (req: Request, res: Response) => {
	const permissionId = req.params.permissionId as string;
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
