import { z } from "zod";
import { UserStatus } from "../../../generated/prisma/enums";

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
		displayName: z.string().trim().optional(),
		nidNumber: z.string().trim().optional(),
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
		status: z.nativeEnum(UserStatus),
	}),
});

const deleteUserValidationSchema = z.object({
	params: z.object({
		userId: z.string(),
	}),
});

const restoreUserValidationSchema = z.object({
	params: z.object({
		userId: z.string(),
	}),
});


export const UserValidation = {
	getMeValidationSchema,
	updateMeValidationSchema,
	getUsersValidationSchema,
	getUserByIdValidationSchema,
	updateUserStatusValidationSchema,
	deleteUserValidationSchema,
	restoreUserValidationSchema,

};
