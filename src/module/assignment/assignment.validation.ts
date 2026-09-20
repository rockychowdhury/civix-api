import { z } from "zod";

const createAssignmentSchema = z.object({
	body: z
		.object({
			workOrderId: z.string().uuid(),
			assignedToId: z.string().uuid().optional(),
			teamId: z.string().uuid().optional(),
		})
		.refine((data) => data.assignedToId || data.teamId, {
			message: "Either assignedToId or teamId must be provided",
			path: ["assignedToId"],
		}),
});

const updateAssignmentStatusSchema = z.object({
	body: z.object({
		status: z.enum(["ACCEPTED", "REJECTED"]),
		notes: z.string().optional(),
	}),
});

const reassignAssignmentSchema = z.object({
	body: z
		.object({
			assignedToId: z.string().uuid().optional(),
			teamId: z.string().uuid().optional(),
			reason: z.string().optional(),
		})
		.refine((data) => data.assignedToId || data.teamId, {
			message:
				"Either assignedToId or teamId must be provided for reassignment",
			path: ["assignedToId"],
		}),
});

export const AssignmentValidation = {
	createAssignmentSchema,
	updateAssignmentStatusSchema,
	reassignAssignmentSchema,
};
