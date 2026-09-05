import { z } from "zod";

const createRoleSchema = z.object({
	body: z.object({
		name: z.string({ message: "Role name is required" }).trim().toUpperCase(),
		description: z.string().trim().optional(),
	}),
});

const updateRoleSchema = z.object({
	body: z.object({
		name: z.string().trim().toUpperCase().optional(),
		description: z.string().trim().optional(),
	}).refine((data) => data.name !== undefined || data.description !== undefined, {
		message: "At least one field (name or description) must be provided",
	}),
});

const replaceRolePermissionsSchema = z.object({
	body: z.object({
		permission_ids: z
			.array(z.string({ message: "Permission ID must be a string" }))
			.min(1, "At least one permission is required"),
	}),
});

export const RoleValidation = {
	createRoleSchema,
	updateRoleSchema,
	replaceRolePermissionsSchema,
};

