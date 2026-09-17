import { z } from "zod";

const createServiceRequestSchema = z.object({
	body: z.object({
		request: z.object({
			description: z.string().min(10).max(1000),
			categoryId: z.string().uuid(),
		}),
		location: z.object({
			latitude: z.number().optional(),
			longitude: z.number().optional(),
			address: z.string(),
			landmark: z.string().optional(),
			postalCode: z.string().optional(),
			wardId: z.string().uuid().optional(),
			zoneId: z.string().uuid().optional(),
			municipalityId: z.string().uuid(),
		}),
	}),
});

export const ServiceRequestValidation = {
	createServiceRequestSchema,
};
