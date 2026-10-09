import { z } from "zod";

const createTeamSchema = z.object({
	body: z.object({
		name: z.string().min(2),
		code: z.string().min(2),
		departmentId: z.string().uuid(),
		leaderId: z.string().uuid().optional(),
		memberIds: z.array(z.string().uuid()).optional(),
	}),
});

const updateTeamSchema = z.object({
	params: z.object({ id: z.string().uuid() }),
	body: z.object({
		name: z.string().min(2).optional(),
		status: z.enum(["ACTIVE", "INACTIVE", "DISBANDED"]).optional(),
		leaderId: z.string().uuid().optional().nullable(),
	}),
});

const deleteTeamSchema = z.object({
	params: z.object({ id: z.string().uuid() }),
});

export const TeamValidation = {
	createTeamSchema,
	updateTeamSchema,
	deleteTeamSchema,
};
