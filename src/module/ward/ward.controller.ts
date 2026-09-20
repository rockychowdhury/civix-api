import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { WardService } from "./ward.service";

const getWards = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, [
		"zoneId",
		"municipalityId",
		"coverageStatus",
		"searchTerm",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await WardService.getWards(filters, options);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Wards retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const createWard = catchAsync(async (req: Request, res: Response) => {
	const result = await WardService.createWard(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Ward created successfully",
		data: result,
	});
});

const getWardById = catchAsync(async (req: Request, res: Response) => {
	const { wardId } = req.params as { wardId: string };
	const result = await WardService.getWardById(wardId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ward retrieved successfully",
		data: result,
	});
});

const updateWard = catchAsync(async (req: Request, res: Response) => {
	const { wardId } = req.params as { wardId: string };
	const result = await WardService.updateWard(wardId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ward updated successfully",
		data: result,
	});
});

const deleteWard = catchAsync(async (req: Request, res: Response) => {
	const { wardId } = req.params as { wardId: string };
	const result = await WardService.deleteWard(wardId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ward deactivated successfully",
		data: result,
	});
});

const getWardDepartments = catchAsync(async (req: Request, res: Response) => {
	const { wardId } = req.params as { wardId: string };
	const result = await WardService.getWardDepartments(wardId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Departments serving ward retrieved successfully",
		data: result,
	});
});

export const WardController = {
	getWards,
	createWard,
	getWardById,
	updateWard,
	deleteWard,
	getWardDepartments,
};
