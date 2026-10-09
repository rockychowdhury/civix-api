import { z } from "zod";

const booleanFromQuery = z
	.union([z.boolean(), z.string()])
	.transform((value) =>
		typeof value === "boolean" ? value : value === "true",
	);

const numericFromQuery = z
	.union([z.number(), z.string()])
	.transform((value) => Number(value))
	.refine((value) => Number.isFinite(value), { message: "Must be a number" });

const getCategoriesQuerySchema = z.object({
	query: z.object({
		searchTerm: z.string().trim().min(1).optional(),
		departmentId: z.string().trim().min(1).optional(),
		parentId: z.string().trim().min(1).optional(),
		isActive: booleanFromQuery.optional(),
		hasChildren: booleanFromQuery.optional(),
		page: numericFromQuery
			.transform((value) => Math.max(1, Math.trunc(value)))
			.optional(),
		limit: numericFromQuery
			.transform((value) => Math.min(200, Math.max(1, Math.trunc(value))))
			.optional(),
		sortBy: z
			.enum([
				"name",
				"slug",
				"sortOrder",
				"baseSeverity",
				"createdAt",
				"updatedAt",
			])
			.optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	}),
});

const getCategoryByIdParamsSchema = z.object({
	params: z.object({
		categoryId: z.string().trim().min(1, "Category id is required"),
	}),
});

const createCategorySchema = z.object({
	body: z.object({
		name: z.string().min(2),
		slug: z.string().min(2),
		departmentId: z.string().uuid().optional(),
		parentId: z.string().uuid().optional(),
		description: z.string().optional(),
		workInstructions: z.string().optional(),
		baseSeverity: z.number().int().min(1).max(10).optional(),
		sortOrder: z.number().int().optional(),
		isActive: z.boolean().optional(),
	}),
});

const updateCategorySchema = z.object({
	params: z.object({ categoryId: z.string().uuid() }),
	body: z.object({
		name: z.string().min(2).optional(),
		slug: z.string().min(2).optional(),
		departmentId: z.string().uuid().optional().nullable(),
		parentId: z.string().uuid().optional().nullable(),
		description: z.string().optional().nullable(),
		workInstructions: z.string().optional().nullable(),
		baseSeverity: z.number().int().min(1).max(10).optional(),
		sortOrder: z.number().int().optional(),
		isActive: z.boolean().optional(),
	}),
});

const deleteCategorySchema = z.object({
	params: z.object({ categoryId: z.string().uuid() }),
});

export const CategoryValidation = {
	getCategoriesQuerySchema,
	getCategoryByIdParamsSchema,
	createCategorySchema,
	updateCategorySchema,
	deleteCategorySchema,
};
