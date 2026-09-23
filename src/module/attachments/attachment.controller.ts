import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AttachmentService } from "./attachment.service";

const uploadForServiceRequest = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const files = req.files as Express.Multer.File[];
		const serviceRequestId = req.params.id as string;

		if (!files || files.length === 0) {
			return sendResponse(res, {
				statusCode: httpStatus.BAD_REQUEST,
				success: false,
				message: "Files are required",
				data: null,
			});
		}

		const result = await AttachmentService.uploadForServiceRequest(
			userId,
			serviceRequestId,
			files,
		);

		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "Attachments uploaded successfully",
			data: result,
		});
	},
);

const uploadForWorkUpdate = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const files = req.files as Express.Multer.File[];
	const workUpdateId = req.params.id as string;

	if (!files || files.length === 0) {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Files are required",
			data: null,
		});
	}

	const result = await AttachmentService.uploadForWorkUpdate(
		userId,
		workUpdateId,
		files,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Attachments uploaded successfully",
		data: result,
	});
});

const uploadForResolution = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const files = req.files as Express.Multer.File[];
	const resolutionId = req.params.id as string;

	if (!files || files.length === 0) {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Files are required",
			data: null,
		});
	}

	const result = await AttachmentService.uploadForResolution(
		userId,
		resolutionId,
		files,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Attachments uploaded successfully",
		data: result,
	});
});

const getAttachmentById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await AttachmentService.getAttachmentById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attachment retrieved successfully",
		data: result,
	});
});

const deleteAttachment = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const id = req.params.id as string;
	
	await AttachmentService.deleteAttachment(userId, id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attachment deleted successfully",
		data: null,
	});
});

export const AttachmentController = {
	uploadForServiceRequest,
	uploadForWorkUpdate,
	uploadForResolution,
	getAttachmentById,
	deleteAttachment,
};
