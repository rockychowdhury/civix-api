import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AttachmentService } from "./attachment.service";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { AttachmentPurpose, AttachmentFileType } from "../../../generated/prisma/enums";

const uploadForServiceRequest = catchAsync(async (req: Request, res: Response) => {
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
});

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

// Direct upload endpoint for client-side uploads
const createAttachmentFromPublicId = catchAsync(async (req: Request, res: Response) => {
  const {
    publicId,
    url,
    fileName,
    fileSize,
    fileType,
    purpose: customPurpose,
    bucket,
    serviceRequestId,
    workUpdateId,
    resolutionId,
    uploadedById,
  } = req.body;

  if (!publicId) {
    throw new AppError(httpStatus.BAD_REQUEST, "publicId is required");
  }

  // 1. Resolve uploader User ID
  let resolvedUserId = (req as any).user?.userId || uploadedById;

  if (!resolvedUserId && serviceRequestId) {
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { citizenId: true },
    });
    if (sr?.citizenId) {
      resolvedUserId = sr.citizenId;
    }
  }

  if (!resolvedUserId) {
    // Fallback to active admin/system user to guarantee foreign key constraint safety
    const fallbackUser = await prisma.user.findFirst({
      select: { id: true },
    });
    resolvedUserId = fallbackUser?.id;
  }

  if (!resolvedUserId) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "No user available to associate with attachment");
  }

  // 2. Resolve purpose
  let purpose: AttachmentPurpose = AttachmentPurpose.REPORT_EVIDENCE;
  if (customPurpose && Object.values(AttachmentPurpose).includes(customPurpose)) {
    purpose = customPurpose;
  } else if (bucket === "work-updates" || workUpdateId) {
    purpose = AttachmentPurpose.DURING_WORK;
  } else if (bucket === "resolutions" || resolutionId) {
    purpose = AttachmentPurpose.VERIFICATION;
  }

  const finalUrl =
    url ||
    `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/${publicId}`;

  // 3. Find existing or create
  const existing = await prisma.attachment.findFirst({
    where: { publicId },
  });

  if (existing) {
    const updated = await prisma.attachment.update({
      where: { id: existing.id },
      data: {
        url: finalUrl,
        fileName: fileName || existing.fileName,
        fileSize: fileSize ? Number(fileSize) : existing.fileSize,
        serviceRequestId: serviceRequestId || existing.serviceRequestId,
        workUpdateId: workUpdateId || existing.workUpdateId,
        resolutionId: resolutionId || existing.resolutionId,
      },
    });

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attachment record updated",
      data: updated,
    });
  }

  const attachment = await prisma.attachment.create({
    data: {
      publicId,
      url: finalUrl,
      fileType: fileType || AttachmentFileType.IMAGE,
      purpose,
      fileName: fileName || publicId,
      fileSize: fileSize ? Number(fileSize) : 0,
      uploadedById: resolvedUserId,
      serviceRequestId: serviceRequestId || undefined,
      workUpdateId: workUpdateId || undefined,
      resolutionId: resolutionId || undefined,
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Attachment record created successfully",
    data: attachment,
  });
});

// Webhook handler for Cloudinary notifications
const updateAttachmentUrl = catchAsync(async (req: Request, res: Response) => {
  const { signature } = req.headers;
  const payload = JSON.stringify(req.body);
  const timestamp = req.body.timestamp;

  // Verify signature
  if (!signature || !timestamp || !cloudinary.utils.verifyNotificationSignature(payload, timestamp, signature)) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "Invalid webhook signature",
      data: null,
    });
  }

  const { event, public_id, resource_type, event_type } = req.body;

  // For troubleshooting, log raw body including resourceId
  console.log("Cloudinary webhook payload:", req.body);

  // Handle resource.uploaded event (when upload is complete)
  if (event === "resource.uploaded" || event_type === "resource.uploaded") {
    const attachment = await prisma.attachment.findFirst({
      where: {
        OR: [
          { publicId: public_id },
          { fileName: public_id },
        ],
      },
    });

    if (!attachment) {
      console.warn(`Attachment not found for public_id: ${public_id}`);
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: true,
        message: "Attachment not found",
        data: null,
      });
    }

    // Update URL to finalized Cloudinary URL
    const cloudinaryDomain = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/${public_id}`;
    await prisma.attachment.update({
      where: { id: attachment.id },
      data: { url: cloudinaryDomain },
    });

    console.log(`Attachment ${attachment.id} URL updated from Cloudinary webhook`);
  }

  // Handle async:task events (notification of delayed uploads like auto-optimized/resized versions)
  if (event === "async:task" && event_type === "sync-complete") {
    console.log(`Async task completed: ${event_type} for public_id: ${public_id}`);
  }

  return sendResponse(res, {
    statusCode: httpStatus.NO_CONTENT,
    success: true,
    message: "Webhook received",
    data: null,
  });
});

export const AttachmentController = {
  uploadForServiceRequest,
  uploadForWorkUpdate,
  uploadForResolution,
  getAttachmentById,
  deleteAttachment,
  createAttachmentFromPublicId,
  updateAttachmentUrl,
};