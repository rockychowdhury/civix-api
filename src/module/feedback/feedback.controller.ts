import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { FeedbackService } from "./feedback.service";

const submitFeedback = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await FeedbackService.submitFeedback(userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Feedback submitted successfully",
		data: result,
	});
});

const getFeedback = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, ["rating", "citizenId", "searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await FeedbackService.getAllFeedback(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Feedback retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getMunicipalityFeedback = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const municipalityId = req.params.municipalityId as string;

	const filters = pick(req.query, ["rating", "citizenId", "searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await FeedbackService.getFeedback(
		userId,
		municipalityId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipality feedback retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getDepartmentFeedback = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const departmentId = req.params.departmentId as string;

	const filters = pick(req.query, ["rating", "citizenId", "searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await FeedbackService.getDepartmentFeedback(
		userId,
		departmentId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department feedback retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getFeedbackById = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;

	const result = await FeedbackService.getFeedbackById(userId, id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Feedback retrieved successfully",
		data: result,
	});
});

export const FeedbackController = {
	submitFeedback,
	getFeedback,
	getMunicipalityFeedback,
	getDepartmentFeedback,
	getFeedbackById,
};
