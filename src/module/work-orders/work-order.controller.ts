import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { WorkOrderService } from "./work-order.service";

const createWorkOrder = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await WorkOrderService.createWorkOrder(userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Work order created successfully",
		data: result,
	});
});

const getWorkOrders = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, [
		"status",
		"civicIssueId",
		"currentAssigneeId",
		"priority",
		"searchTerm",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await WorkOrderService.getWorkOrders(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Work orders retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getWorkOrderById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await WorkOrderService.getWorkOrderById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Work order retrieved successfully",
		data: result,
	});
});

const updateWorkOrderStatus = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const id = req.params.id as string;
		const result = await WorkOrderService.updateWorkOrderStatus(
			userId,
			id,
			req.body,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Work order status updated successfully",
			data: result,
		});
	},
);

export const WorkOrderController = {
	createWorkOrder,
	getWorkOrders,
	getWorkOrderById,
	updateWorkOrderStatus,
};
