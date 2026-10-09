import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { SlaPolicyService } from "./sla-policy.service";

const createSlaPolicy = catchAsync(async (req: Request, res: Response) => {
	const result = await SlaPolicyService.createSlaPolicy(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "SLA Policy created successfully",
		data: result,
	});
});

const getSlaPolicies = catchAsync(async (req: Request, res: Response) => {
	const result = await SlaPolicyService.getSlaPolicies(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "SLA Policies retrieved successfully",
		data: result,
	});
});

const updateSlaPolicy = catchAsync(async (req: Request, res: Response) => {
	const result = await SlaPolicyService.updateSlaPolicy(
		req.params.id as string,
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "SLA Policy updated successfully",
		data: result,
	});
});

const deleteSlaPolicy = catchAsync(async (req: Request, res: Response) => {
	const result = await SlaPolicyService.deleteSlaPolicy(
		req.params.id as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "SLA Policy deleted successfully",
		data: result,
	});
});

export const SlaPolicyController = {
	createSlaPolicy,
	getSlaPolicies,
	updateSlaPolicy,
	deleteSlaPolicy,
};
