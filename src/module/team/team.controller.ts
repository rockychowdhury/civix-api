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

export const TeamController = {
	createTeam,
	getAllTeams,
};
