import { z } from "zod";
import { ServiceCoverageStatus } from "../../../generated/prisma/enums";

const createMunicipalitySchema = z.object({
	body: z.object({
		name: z.string().trim(),
		code: z.string().trim().toUpperCase(),
		countryCode: z.string().trim().optional(),
		timezone: z.string().trim().optional(),
	}),
});

const updateMunicipalitySchema = z.object({
	body: z
		.object({
			name: z.string().trim().optional(),
			code: z.string().trim().toUpperCase().optional(),
			countryCode: z.string().trim().optional(),
			timezone: z.string().trim().optional(),
			coverageStatus: z
				.enum([
					ServiceCoverageStatus.ACTIVE,
					ServiceCoverageStatus.INACTIVE,
					ServiceCoverageStatus.PLANNED,
				])
				.optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field must be provided",
		}),
});

export const MunicipalityValidation = {
	createMunicipalitySchema,
	updateMunicipalitySchema,
};
