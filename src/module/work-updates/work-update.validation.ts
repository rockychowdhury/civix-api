import { z } from "zod";

const createWorkUpdateSchema = z.object({
	body: z.object({
		updateType: z.enum([
			"ACCEPTED",
			"ON_SITE",
			"PROGRESS",
			"BLOCKED",
			"DELAYED",
			"PAUSED",
			"RESUMED",
			"COMPLETED",
		]),
		notes: z.string().optional(),
		attachmentIds: z.array(z.string().uuid()).optional(),
	}),
});

export const WorkUpdateValidation = {
	createWorkUpdateSchema,
};
