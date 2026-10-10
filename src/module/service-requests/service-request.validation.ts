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

const numericFromQuery = z
	.union([z.number(), z.string()])
	.transform((value) => Number(value))
	.refine((value) => Number.isFinite(value), { message: "Must be a number" });

const getServiceRequestsQuerySchema = z.object({
	query: z.object({
		status: z
			.enum([
				"SUBMITTED",
				"TRIAGED",
				"ASSIGNED",
				"ACCEPTED",
				"IN_PROGRESS",
				"PENDING_VERIFICATION",
				"RESOLVED",
				"CLOSED",
				"REOPENED",
				"REJECTED",
				"DUPLICATE",
				"INSUFFICIENT_INFORMATION",
				"CANCELLED",
			])
			.optional(),
		stage: z.enum(["queue", "in_progress", "resolved"]).optional(),
		categoryId: z.string().uuid().optional(),
		wardId: z.string().uuid().optional(),
		municipalityId: z.string().uuid().optional(),
		searchTerm: z.string().trim().min(1).optional(),
		page: numericFromQuery
			.transform((value) => Math.max(1, Math.trunc(value)))
			.optional(),
		limit: numericFromQuery
			.transform((value) => Math.min(200, Math.max(1, Math.trunc(value))))
			.optional(),
		sortBy: z
			.enum([
				"createdAt",
				"updatedAt",
				"submittedAt",
				"status",
				"trackingNumber",
			])
			.optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	}),
});

export const ServiceRequestValidation = {
	createServiceRequestSchema,
	getServiceRequestsQuerySchema,
};

