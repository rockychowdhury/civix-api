import { z } from "zod";

const triageSchema = z.object({
	body: z.object({
		serviceRequestId: z.string().uuid(),
		categoryId: z.string().uuid(),
		priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
		departmentId: z.string().uuid(),
		wardId: z.string().uuid(),
	}),
});

const mergeSchema = z.object({
	body: z.object({
		serviceRequestId: z.string().uuid(),
	}),
});

const updateStatusSchema = z.object({
	body: z.object({
		status: z.enum([
			"SUBMITTED",
			"TRIAGED",
			"ASSIGNED",
			"ACCEPTED",
			"IN_PROGRESS",
			"PENDING_VERIFICATION",
			"RESOLVED",
			"CLOSED",
			"REOPENED",
			"REJECTED",
			"DUPLICATE",
			"INSUFFICIENT_INFORMATION",
			"CANCELLED",
		]),
		notes: z.string().optional(),
	}),
});

const reopenSchema = z.object({
	body: z.object({
		reason: z.string().optional(),
	}),
});

export const CivicIssueValidation = {
	triageSchema,
	mergeSchema,
	updateStatusSchema,
	reopenSchema,
};
