import { z } from "zod";

const triageSchema = z.object({
	body: z.object({
		serviceRequestId: z.string().uuid(),
		categoryId: z.string().uuid(),
		priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
		departmentId: z.string().uuid(),
		wardId: z.string().uuid(),
	}),
});

const mergeSchema = z.object({
	body: z.object({
		serviceRequestId: z.string().uuid(),
	}),
});

const updateStatusSchema = z.object({
	body: z.object({
		status: z.enum([
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
		]),
		notes: z.string().optional(),
	}),
});

const reopenSchema = z.object({
	body: z.object({
		reason: z.string().optional(),
	}),
});

const numericFromQuery = z
	.union([z.number(), z.string()])
	.transform((value) => Number(value))
	.refine((value) => Number.isFinite(value), { message: "Must be a number" });

const getCivicIssuesQuerySchema = z.object({
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
		stage: z
			.enum(["queue", "in_progress", "resolved", "escalated"])
			.optional(),
		hasWorkOrder: z
			.union([z.boolean(), z.string()])
			.transform((val) => val === true || val === "true")
			.optional(),
		isEscalated: z
			.union([z.boolean(), z.string()])
			.transform((val) => val === true || val === "true")
			.optional(),
		priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
		departmentId: z.string().uuid().optional(),
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
				"firstReportedAt",
				"lastReportedAt",
				"resolvedAt",
				"closedAt",
				"priority",
				"status",
				"reportedCount",
			])
			.optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	}),
});

export const CivicIssueValidation = {
	triageSchema,
	mergeSchema,
	updateStatusSchema,
	reopenSchema,
	getCivicIssuesQuerySchema,
};
