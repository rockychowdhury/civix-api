import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { AssignmentService } from "./assignment.service";

const createAssignment = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await AssignmentService.createAssignment(userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Work order assigned successfully",
		data: result,
	});
});

const getMyAssignments = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;

	const filters = pick(req.query, ["status", "workOrderId", "searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await AssignmentService.getMyAssignments(
		userId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My assignments retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const updateAssignmentStatus = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const id = req.params.id as string;
		const result = await AssignmentService.updateAssignmentStatus(
			userId,
			id,
			req.body,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Assignment status updated successfully",
			data: result,
		});
	},
);

const getAllAssignments = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, [
		"status",
		"workOrderId",
		"assignedToId",
		"teamId",
		"searchTerm",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await AssignmentService.getAllAssignments(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignments retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getAssignmentById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await AssignmentService.getAssignmentById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment retrieved successfully",
		data: result,
	});
});

const reassignAssignment = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;
	const result = await AssignmentService.reassignAssignment(
		userId,
		id,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment reassigned successfully",
		data: result,
	});
});

const unassignAssignment = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;
	const result = await AssignmentService.unassignAssignment(userId, id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment unassigned successfully",
		data: result,
	});
});

export const AssignmentController = {
	createAssignment,
	getMyAssignments,
	updateAssignmentStatus,
	getAllAssignments,
	getAssignmentById,
	reassignAssignment,
	unassignAssignment,
};
