import { z } from "zod";

const createWorkOrderSchema = z.object({
	body: z.object({
		civicIssueId: z.string().uuid(),
		title: z.string().min(5).max(100).optional(),
		description: z.string().optional(),
		scheduledAt: z.string().datetime().optional(),
	}),
});

const updateWorkOrderStatusSchema = z.object({
	body: z.object({
		status: z.enum([
			"ASSIGNED",
			"IN_PROGRESS",
			"PENDING_VERIFICATION",
			"RESOLVED",
			"CLOSED",
			"CANCELLED",
		]),
	}),
});

const quickActionSchema = z.object({
	body: z.object({
		action: z.enum(["START", "PAUSE", "RESUME"]),
		notes: z.string().optional(),
		attachmentIds: z.array(z.string().uuid()).optional(),
	}),
});

export const WorkOrderValidation = {
	createWorkOrderSchema,
	updateWorkOrderStatusSchema,
	quickActionSchema,
};
