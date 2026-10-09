import { z } from "zod";

const createSlaPolicySchema = z.object({
	body: z.object({
		municipalityId: z.string().uuid(),
		categoryId: z.string().uuid(),
		priorityId: z.string().uuid(),
		responseMinutes: z.number().int().min(1),
		resolutionMinutes: z.number().int().min(1),
		assignmentType: z.enum(["INDIVIDUAL", "TEAM"]).optional(),
	}),
});

const updateSlaPolicySchema = z.object({
	params: z.object({
		id: z.string().uuid(),
	}),
	body: z.object({
		responseMinutes: z.number().int().min(1).optional(),
		resolutionMinutes: z.number().int().min(1).optional(),
		assignmentType: z.enum(["INDIVIDUAL", "TEAM"]).optional(),
		effectiveTo: z.string().datetime().optional(),
	}),
});

const getSlaPolicySchema = z.object({
	query: z.object({
		municipalityId: z.string().uuid().optional(),
		categoryId: z.string().uuid().optional(),
	}),
});

export const SlaPolicyValidation = {
	createSlaPolicySchema,
	updateSlaPolicySchema,
	getSlaPolicySchema,
};
