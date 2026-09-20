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

export const StaffValidation = {
	createPlatformAdminSchema,
	createCityAdminSchema,
	createDepartmentStaffSchema,
};
