import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { TeamService } from "./team.service";
import { pick } from "../../utils/pick";

const createTeam = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await TeamService.createTeam(req.body, userId);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Team created successfully",
		data: result,
	});
});

const getAllTeams = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const filters = pick(req.query, ["searchTerm", "departmentId", "status"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await TeamService.getAllTeams(userId, filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Teams retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const updateTeam = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const { id } = req.params;
	const result = await TeamService.updateTeam(id as string, req.body, userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Team updated successfully",
		data: result,
	});
});

const deleteTeam = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const { id } = req.params;
	const result = await TeamService.deleteTeam(id as string, userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Team deleted successfully",
		data: result,
	});
});

export const TeamController = {
	createTeam,
	getAllTeams,
	updateTeam,
	deleteTeam,
};
