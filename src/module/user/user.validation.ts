import { z } from "zod";

const getMeValidationSchema = z.object({
	params: z.object({
		userId: z.string().optional(),
	}),
});

const updateMeValidationSchema = z.object({
	body: z.object({
		firstName: z.string().trim().optional(),
		lastName: z.string().trim().optional(),
		phone: z.string().trim().optional(),
	}),
});

const getUsersValidationSchema = z.object({
	query: z.object({
		page: z.string().optional(),
		limit: z.string().optional(),
	}),
});

const getUserByIdValidationSchema = z.object({
	params: z.object({
		userId: z.string(),
	}),
});

const updateUserStatusValidationSchema = z.object({
	body: z.object({
		status: z.enum(["ACTIVE", "SUSPENDED", "BANNED", "INACTIVE"]),
	}),
});

const deleteUserValidationSchema = z.object({
	params: z.object({
		userId: z.string(),
	}),
});

const assignRoleValidationSchema = z.object({
	body: z.object({
		role_id: z.string({ message: "Role ID must be a string" }),
	}),
});

export const UserValidation = {
	getMeValidationSchema,
	updateMeValidationSchema,
	getUsersValidationSchema,
	getUserByIdValidationSchema,
	updateUserStatusValidationSchema,
	deleteUserValidationSchema,
	assignRoleValidationSchema,
};
