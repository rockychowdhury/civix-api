import { z } from "zod";

const createRoadSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1, "Road name is required"),
		roadNumber: z.string().trim().optional(),
		wardId: z.string().uuid("Invalid ward ID"),
		isActive: z.boolean().optional().default(true),
	}),
});

const bulkCreateRoadSchema = z.object({
	body: z.object({
		wardId: z.string().uuid("Invalid ward ID"),
		roads: z.array(
			z.object({
				name: z.string().trim().min(1, "Road name is required"),
				roadNumber: z.string().trim().optional(),
			}),
		).min(1, "At least one road must be provided"),
	}),
});

const updateRoadSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1).optional(),
		roadNumber: z.string().trim().optional(),
		wardId: z.string().uuid().optional(),
		isActive: z.boolean().optional(),
	}),
});

export const RoadValidation = {
	createRoadSchema,
	bulkCreateRoadSchema,
	updateRoadSchema,
};

