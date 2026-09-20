import { z } from "zod";
import { ServiceCoverageStatus } from "../../../generated/prisma/enums";

const createZoneSchema = z.object({
	body: z.object({
		name: z.string().trim(),
		municipalityId: z.string().trim(),
	}),
});

const updateZoneSchema = z.object({
	body: z
		.object({
			name: z.string().trim().optional(),
			municipalityId: z.string().trim().optional(),
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

export const ZoneValidation = {
	createZoneSchema,
	updateZoneSchema,
};
