import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ResolutionService } from "./resolution.service";

const submitResolution = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const workOrderId = req.params.workOrderId as string;

	const result = await ResolutionService.submitResolution(
		userId,
		workOrderId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Resolution submitted successfully, pending verification.",
		data: result,
	});
});

const verifyResolution = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string; // Resolution ID

	const result = await ResolutionService.verifyResolution(userId, id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resolution verification processed",
		data: result,
	});
});

const getResolutionById = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;

	const result = await ResolutionService.getResolutionById(userId, id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resolution retrieved successfully",
		data: result,
	});
});

const getResolutionsByWorkOrderId = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const workOrderId = req.params.workOrderId as string;

	const result = await ResolutionService.getResolutionByWorkOrderId(userId, workOrderId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resolution retrieved successfully",
		data: result,
	});
});

const getAllResolutions = catchAsync(async (req: Request, res: Response) => {
	const result = await ResolutionService.getAllResolutions(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All resolutions retrieved successfully",
		data: result,
	});
});

export const ResolutionController = {
	submitResolution,
	verifyResolution,
	getResolutionById,
	getResolutionsByWorkOrderId,
	getAllResolutions,
};
