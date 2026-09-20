import { z } from "zod";

const createFeedbackSchema = z.object({
	body: z.object({
		serviceRequestId: z.string().uuid(),
		rating: z.number().int().min(1).max(5),
		comment: z.string().max(1000).optional(),
	}),
});

export const FeedbackValidation = {
	createFeedbackSchema,
};
