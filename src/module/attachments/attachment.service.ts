import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { uploadToCloudinary } from "../../lib/cloudinary";
import {
	AttachmentPurpose,
	AttachmentFileType,
} from "../../../generated/prisma/enums";
import { checkDepartmentAccess, checkMunicipalityAccess } from "../../utils/abac.utils";
import { deleteFromCloudinary } from "../../lib/cloudinary";

// getFileType removed since all attachments are guaranteed to be images by middleware

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
		// If not the reporting citizen, check if they are municipality staff
		try {
			await checkMunicipalityAccess(userId, sr.municipalityId);
		} catch (error) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Not authorized to upload for this service request",
			);
		}
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
				fileType: AttachmentFileType.IMAGE,
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

	// ABAC check: user must be staff in the department handling the work order
	await checkDepartmentAccess(userId, wu.workOrder.departmentId);

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
				fileType: AttachmentFileType.IMAGE,
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

const deleteAttachment = async (userId: string, id: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { userRoles: { include: { role: true } } },
	});

	if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "User not found");

	const isGlobalAdmin = user.userRoles.some((ur) =>
		["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(ur.role.code),
	);

	const attachment = await prisma.attachment.findUnique({
		where: { id },
	});

	if (!attachment) {
		throw new AppError(httpStatus.NOT_FOUND, "Attachment not found");
	}

	if (attachment.uploadedById !== userId && !isGlobalAdmin) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only the original uploader or a global admin can delete this attachment",
		);
	}

	// Delete from Cloudinary
	if (attachment.publicId) {
		await deleteFromCloudinary(attachment.publicId);
	}

	// Delete from DB
	await prisma.attachment.delete({
		where: { id },
	});
};

export const AttachmentService = {
	uploadForServiceRequest,
	uploadForWorkUpdate,
	getAttachmentById,
	deleteAttachment,
};
