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

export const ResolutionController = {
	submitResolution,
	verifyResolution,
};
