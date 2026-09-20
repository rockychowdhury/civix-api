import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { NotificationService } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;

	const filters: Record<string, any> = pick(req.query, [
		"type",
		"resourceType",
		"resourceId",
		"searchTerm",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	// Handle boolean isRead explicitly if provided
	if (req.query.unreadOnly === "true") {
		filters.isRead = false;
	} else if (req.query.isRead !== undefined) {
		filters.isRead = req.query.isRead === "true";
	}

	const result = await NotificationService.getMyNotifications(
		userId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notifications retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;

	const result = await NotificationService.markAsRead(userId, id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notification marked as read",
		data: result,
	});
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;

	await NotificationService.markAllAsRead(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All notifications marked as read",
		data: null,
	});
});

export const NotificationController = {
	getMyNotifications,
	markAsRead,
	markAllAsRead,
};
