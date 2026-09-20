import { z } from "zod";

const createLocationSchema = z.object({
	body: z.object({
		latitude: z.number().optional(),
		longitude: z.number().optional(),
		address: z.string().trim(),
		landmark: z.string().trim().optional(),
		postalCode: z.string().trim().optional(),
		wardId: z.string().trim().optional(),
		zoneId: z.string().trim().optional(),
		municipalityId: z.string().trim().optional(),
	}),
});

const updateLocationSchema = z.object({
	body: z
		.object({
			latitude: z.number().optional(),
			longitude: z.number().optional(),
			address: z.string().trim().optional(),
			landmark: z.string().trim().optional(),
			postalCode: z.string().trim().optional(),
			wardId: z.string().trim().optional(),
			zoneId: z.string().trim().optional(),
			municipalityId: z.string().trim().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field must be provided",
		}),
});

export const LocationValidation = {
	createLocationSchema,
	updateLocationSchema,
};
