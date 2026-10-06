import { z } from "zod";

const baseStaffSchema = {
	email: z.string().email(),
	password: z.string().min(6).optional(), // Can be auto-generated if missing
	firstName: z.string().min(2),
	lastName: z.string().min(2),
	phone: z.string().optional(),
	designation: z.string().optional(),
};

const createPlatformAdminSchema = z.object({
	body: z.object({
		...baseStaffSchema,
	}),
});

const createCityAdminSchema = z.object({
	body: z.object({
		...baseStaffSchema,
		municipalityId: z.string().uuid("Invalid municipality ID"),
	}),
});

const createDepartmentStaffSchema = z.object({
	body: z.object({
		...baseStaffSchema,
		departmentId: z.string().uuid("Invalid department ID"),
	}),
});

const updateStaffStatusSchema = z.object({
	params: z.object({ id: z.string().uuid("Invalid staff ID") }),
	body: z.object({
		status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"]),
	}),
});

const updateStaffSchema = z.object({
	params: z.object({ id: z.string().uuid("Invalid staff ID") }),
	body: z.object({
		firstName: z.string().min(2).optional(),
		lastName: z.string().min(2).optional(),
		phone: z.string().optional(),
		designation: z.string().optional(),
	}),
});

const getStaffByIdSchema = z.object({
	params: z.object({ id: z.string().uuid("Invalid staff ID") }),
});

export const StaffValidation = {
	createPlatformAdminSchema,
	createCityAdminSchema,
	createDepartmentStaffSchema,
	updateStaffStatusSchema,
	updateStaffSchema,
	getStaffByIdSchema,
};
