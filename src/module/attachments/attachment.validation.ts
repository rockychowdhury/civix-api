import { z } from "zod";

export const AttachmentValidation = {
  createAttachmentFromPublicId: z.object({
    idempotencyKey: z.string(),
    publicId: z.string(),
    bucket: z.enum(["service-requests", "work-updates", "resolutions"]),
    serviceRequestId: z.string().optional(),
    workUpdateId: z.string().optional(),
    resolutionId: z.string().optional(),
    uploadedById: z.string().optional(),
  }),
};