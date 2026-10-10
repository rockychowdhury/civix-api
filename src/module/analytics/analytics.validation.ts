import { z } from "zod";

const systemOverviewQuerySchema = z.object({
	query: z.object({
		timeRange: z
			.enum(["today", "this_week", "this_month", "this_year", "all_time"])
			.optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		municipalityId: z.string().uuid().optional(),
	}),
});

export const AnalyticsValidation = {
	systemOverviewQuerySchema,
};
