import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { CivicIssueService } from "./civic-issue.service";

const triageServiceRequest = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await CivicIssueService.triageServiceRequest(userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Service request successfully triaged into Civic Issue",
		data: result,
	});
});

const mergeServiceRequest = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;
	const result = await CivicIssueService.mergeServiceRequest(
		userId,
		id,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service request successfully merged into Civic Issue",
		data: result,
	});
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;
	const result = await CivicIssueService.updateStatus(userId, id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Civic Issue status updated successfully",
		data: result,
	});
});

const getCivicIssues = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, [
		"status",
		"priority",
		"departmentId",
		"wardId",
		"municipalityId",
		"searchTerm",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await CivicIssueService.getCivicIssues(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Civic issues retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getIssuesByMunicipality = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const municipalityId = req.params.municipalityId as string;
	const filters = pick(req.query, [
		"status",
		"priority",
		"departmentId",
		"wardId",
		"municipalityId",
		"searchTerm",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await CivicIssueService.getIssuesByMunicipality(
		userId,
		municipalityId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipality civic issues retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getIssuesByDepartment = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const departmentId = req.params.departmentId as string;
	const filters = pick(req.query, [
		"status",
		"priority",
		"departmentId",
		"wardId",
		"municipalityId",
		"searchTerm",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await CivicIssueService.getIssuesByDepartment(
		userId,
		departmentId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department civic issues retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getCivicIssueById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CivicIssueService.getCivicIssueById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Civic issue retrieved successfully",
		data: result,
	});
});

const getPublicCivicIssueByNumber = catchAsync(async (req: Request, res: Response) => {
	const issueNumber = req.params.issueNumber as string;
	const result = await CivicIssueService.getPublicCivicIssueByNumber(issueNumber);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Public civic issue retrieved successfully",
		data: result,
	});
});

const reopenCivicIssue = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;
	const result = await CivicIssueService.reopenCivicIssue(
		userId,
		id,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Civic Issue reopened successfully",
		data: result,
	});
});

export const CivicIssueController = {
	triageServiceRequest,
	mergeServiceRequest,
	updateStatus,
	getCivicIssues,
	getIssuesByMunicipality,
	getIssuesByDepartment,
	getCivicIssueById,
	getPublicCivicIssueByNumber,
	reopenCivicIssue,
};
