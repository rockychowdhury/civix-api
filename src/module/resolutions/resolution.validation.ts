import { z } from "zod";

const submitResolutionSchema = z.object({
	body: z.object({
		summary: z.string().min(10).max(1000),
		attachmentIds: z.array(z.string().uuid()).optional(),
	}),
});

const verifyResolutionSchema = z.object({
	body: z.object({
		status: z.enum(["VERIFIED", "REJECTED"]),
		notes: z.string().optional(),
	}),
});

export const ResolutionValidation = {
	submitResolutionSchema,
	verifyResolutionSchema,
};
