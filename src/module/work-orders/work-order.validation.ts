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

export const WorkOrderValidation = {
	createWorkOrderSchema,
	updateWorkOrderStatusSchema,
};
