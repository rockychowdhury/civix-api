import type { AttachmentPurpose } from "../../../generated/prisma/enums";

export interface IUploadAttachmentPayload {
	purpose: AttachmentPurpose;
}
