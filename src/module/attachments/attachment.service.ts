import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { uploadToCloudinary } from "../../lib/cloudinary";
import {
	AttachmentPurpose,
	AttachmentFileType,
} from "../../../generated/prisma/enums";

const getFileType = (mimetype: string): AttachmentFileType => {
	if (mimetype.startsWith("image/")) return AttachmentFileType.IMAGE;
	if (mimetype.startsWith("video/")) return AttachmentFileType.VIDEO;
	if (mimetype.startsWith("application/")) return AttachmentFileType.DOCUMENT;
	return AttachmentFileType.OTHER;
};

const uploadForServiceRequest = async (
	userId: string,
	serviceRequestId: string,
	files: Express.Multer.File[],
) => {
	const sr = await prisma.serviceRequest.findUnique({
		where: { id: serviceRequestId },
	});
	if (!sr) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	if (sr.citizenId !== userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Not authorized to upload for this service request",
		);
	}

	const uploadedAttachments = [];

	for (const file of files) {
		const cloudResult = await uploadToCloudinary(
			file.buffer,
			"civix/service-requests",
		);
		const attachment = await prisma.attachment.create({
			data: {
				url: cloudResult.url,
				publicId: cloudResult.public_id,
				fileType: getFileType(file.mimetype),
				fileName: file.originalname,
				fileSize: cloudResult.size,
				purpose: AttachmentPurpose.REPORT_EVIDENCE,
				uploadedById: userId,
				serviceRequestId: serviceRequestId,
			},
		});
		uploadedAttachments.push(attachment);
	}

	return uploadedAttachments;
};

const uploadForWorkUpdate = async (
	userId: string,
	workUpdateId: string,
	files: Express.Multer.File[],
) => {
	const wu = await prisma.workUpdate.findUnique({
		where: { id: workUpdateId },
		include: { workOrder: true },
	});

	if (!wu) {
		throw new AppError(httpStatus.NOT_FOUND, "Work update not found");
	}

	// Basic check: Ensure user is the assignee of the work order
	if (wu.workOrder.currentAssigneeId !== userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Not authorized to upload for this work update",
		);
	}

	const uploadedAttachments = [];

	for (const file of files) {
		const cloudResult = await uploadToCloudinary(
			file.buffer,
			"civix/work-updates",
		);
		const attachment = await prisma.attachment.create({
			data: {
				url: cloudResult.url,
				publicId: cloudResult.public_id,
				fileType: getFileType(file.mimetype),
				fileName: file.originalname,
				fileSize: cloudResult.size,
				purpose: AttachmentPurpose.DURING_WORK,
				uploadedById: userId,
				workUpdateId: workUpdateId,
			},
		});
		uploadedAttachments.push(attachment);
	}

	return uploadedAttachments;
};

const getAttachmentById = async (id: string) => {
	const attachment = await prisma.attachment.findUnique({
		where: { id },
	});

	if (!attachment) {
		throw new AppError(httpStatus.NOT_FOUND, "Attachment not found");
	}

	return attachment;
};

export const AttachmentService = {
	uploadForServiceRequest,
	uploadForWorkUpdate,
	getAttachmentById,
};
