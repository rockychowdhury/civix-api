import { z } from "zod";

const createDepartmentSchema = z.object({
	body: z.object({
		municipalityId: z.string().uuid(),
		name: z.string().min(2),
		code: z.string().min(2),
		description: z.string().optional(),
		email: z.string().email().optional().nullable(),
		phone: z.string().optional().nullable(),
	}),
});

const updateDepartmentSchema = z.object({
	params: z.object({ id: z.string().uuid() }),
	body: z.object({
		name: z.string().min(2).optional(),
		description: z.string().optional().nullable(),
		email: z.string().email().optional().nullable(),
		phone: z.string().optional().nullable(),
		status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
	}),
});

const addServiceAreaSchema = z.object({
	params: z.object({ id: z.string().uuid() }),
	body: z.object({
		wardId: z.string().uuid(),
	}),
});

const removeServiceAreaSchema = z.object({
	params: z.object({
		id: z.string().uuid(),
		areaId: z.string().uuid(),
	}),
});

export const DepartmentValidation = {
	createDepartmentSchema,
	updateDepartmentSchema,
	addServiceAreaSchema,
	removeServiceAreaSchema,
};
