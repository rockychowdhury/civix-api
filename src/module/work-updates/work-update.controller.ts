import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { WorkUpdateService } from "./work-update.service";

const createWorkUpdate = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const workOrderId = req.params.workOrderId as string;

	const result = await WorkUpdateService.createWorkUpdate(
		userId,
		workOrderId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Work update posted successfully",
		data: result,
	});
});

export const WorkUpdateController = {
	createWorkUpdate,
};
