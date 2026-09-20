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

export const TeamValidation = {
	createTeamSchema,
};
