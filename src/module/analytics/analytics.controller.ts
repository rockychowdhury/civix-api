import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AnalyticsService } from "./analytics.service";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
	const { municipalityId } = req.query;
	const result = await AnalyticsService.getDashboardStats(
		municipalityId as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard stats retrieved successfully",
		data: result,
	});
});

const getIssuesByDepartment = catchAsync(
	async (req: Request, res: Response) => {
		const { municipalityId } = req.query;
		const result = await AnalyticsService.getIssuesByDepartment(
			municipalityId as string,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department stats retrieved successfully",
			data: result,
		});
	},
);

const getIssuesByWard = catchAsync(async (req: Request, res: Response) => {
	const { municipalityId } = req.query;
	const result = await AnalyticsService.getIssuesByWard(
		municipalityId as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ward stats retrieved successfully",
		data: result,
	});
});

export const AnalyticsController = {
	getDashboardStats,
	getIssuesByDepartment,
	getIssuesByWard,
};
