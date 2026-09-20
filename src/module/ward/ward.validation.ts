import { z } from "zod";
import { ServiceCoverageStatus } from "../../../generated/prisma/enums";

const createWardSchema = z.object({
	body: z.object({
		name: z.string().trim(),
		number: z.string().trim(),
		zoneId: z.string().trim(),
	}),
});

const updateWardSchema = z.object({
	body: z
		.object({
			name: z.string().trim().optional(),
			number: z.string().trim().optional(),
			zoneId: z.string().trim().optional(),
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

export const WardValidation = {
	createWardSchema,
	updateWardSchema,
};
