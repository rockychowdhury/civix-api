import type { Request, Response } from "express";
import httpStatus from "http-status";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AttachmentFileType, AttachmentPurpose } from "../../../generated/prisma/enums";

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = (req.headers["x-cld-signature"] || req.headers["signature"]) as string | undefined;
  const timestampHeader = (req.headers["x-cld-timestamp"] || req.body?.timestamp) as string | number | undefined;
  const timestamp = typeof timestampHeader === "string" ? parseInt(timestampHeader, 10) : timestampHeader;

  // Verify signature if provided by Cloudinary
  if (signature && timestamp) {
    const payload = JSON.stringify(req.body);
    const isValid = cloudinary.utils.verifyNotificationSignature(payload, timestamp, signature);

    if (!isValid) {
      console.warn("[Cloudinary Webhook] Invalid webhook signature detected.");
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Invalid webhook signature",
        data: null,
      });
    }
  }

  const {
    notification_type,
    event,
    event_type,
    public_id,
    secure_url,
    url,
    bytes,
    context,
  } = req.body;

  console.log("[Cloudinary Webhook] Event received:", {
    notification_type,
    event,
    event_type,
    public_id,
  });

  // Handle upload events (Cloudinary sends notification_type="upload" or event="resource.uploaded")
  const isUploadEvent =
    notification_type === "upload" ||
    event === "resource.uploaded" ||
    event_type === "resource.uploaded";

  if (isUploadEvent && public_id) {
    const finalUrl =
      secure_url ||
      url ||
      `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/${public_id}`;
    const fileSize = typeof bytes === "number" ? bytes : null;

    // Check if an attachment record exists with this publicId
    const attachment = await prisma.attachment.findFirst({
      where: {
        OR: [{ publicId: public_id }, { fileName: public_id }],
      },
    });

    if (attachment) {
      // Update existing record with final confirmed Cloudinary URL and size
      await prisma.attachment.update({
        where: { id: attachment.id },
        data: {
          url: finalUrl,
          fileSize: fileSize ?? attachment.fileSize,
        },
      });

      console.log(`[Cloudinary Webhook] Attachment ${attachment.id} updated with URL: ${finalUrl}`);
    } else {
      // If client attached context metadata, create the attachment record directly
      const serviceRequestId = context?.custom?.serviceRequestId || context?.serviceRequestId;
      const workUpdateId = context?.custom?.workUpdateId || context?.workUpdateId;
      const resolutionId = context?.custom?.resolutionId || context?.resolutionId;
      const uploadedById = context?.custom?.uploadedById || context?.uploadedById;

      if (serviceRequestId || workUpdateId || resolutionId || uploadedById) {
        const purpose = serviceRequestId
          ? AttachmentPurpose.REPORT_EVIDENCE
          : workUpdateId
            ? AttachmentPurpose.DURING_WORK
            : resolutionId
              ? AttachmentPurpose.VERIFICATION
              : AttachmentPurpose.OTHER;

        const newAttachment = await prisma.attachment.create({
          data: {
            publicId: public_id,
            url: finalUrl,
            fileType: AttachmentFileType.IMAGE,
            purpose,
            fileName: public_id,
            fileSize: fileSize ?? 0,
            serviceRequestId: serviceRequestId || undefined,
            workUpdateId: workUpdateId || undefined,
            resolutionId: resolutionId || undefined,
            uploadedById: uploadedById || "system",
          },
        });

        console.log(`[Cloudinary Webhook] Created new attachment ${newAttachment.id} from webhook.`);
      } else {
        console.warn(`[Cloudinary Webhook] No matching attachment found for public_id: ${public_id}`);
      }
    }
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Webhook processed successfully",
    data: null,
  });
});

export const CloudinaryWebhookController = {
  handleWebhook,
};
