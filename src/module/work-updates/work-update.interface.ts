import type { WorkUpdateType } from "../../../generated/prisma/enums";

export interface ICreateWorkUpdatePayload {
	updateType: WorkUpdateType;
	notes?: string;
	attachmentIds?: string[];
}
