import { z } from "zod";

const registerCitizenValidationSchema = z.object({
	body: z.object({
		firstName: z.string({
			required_error: "First name is required",
		}).trim(),
		lastName: z.string({
			required_error: "Last name is required",
		}).trim(),
		email: z.string({
			required_error: "Email is required",
		}).email("Invalid email format").trim().toLowerCase(),
		password: z.string({
			required_error: "Password is required",
		}).min(6, "Password must be at least 6 characters long"),
		phone: z.string().trim().optional(),
	}),
});

const loginValidationSchema = z.object({
	body: z.object({
		email: z.string({
			required_error: "Email is required",
		}).email("Invalid email format").trim().toLowerCase(),
		password: z.string({
			required_error: "Password is required",
		}),
	}),
});

const verifyEmailValidationSchema = z.object({
	body: z.object({
		email: z.string({
			required_error: "Email is required",
		}).email("Invalid email format").trim().toLowerCase(),
		otp: z.string({
			required_error: "OTP is required",
		}).min(4, "OTP must be at least 4 characters long").trim(),
	}),
});

const refreshTokenValidationSchema = z.object({
	cookies: z.object({
		refreshToken: z.string({
			required_error: "Refresh token is required in cookies",
		}),
	}),
});

const googleAuthValidationSchema = z.object({
	body: z.object({
		idToken: z.string({
			required_error: "Google ID Token is required",
		}),
	}),
});

const forgotPasswordValidationSchema = z.object({
	body: z.object({
		email: z.string({
			required_error: "Email is required",
		}).email("Invalid email format").trim().toLowerCase(),
	}),
});

const resetPasswordValidationSchema = z.object({
	body: z.object({
		token: z.string({
			required_error: "Reset token is required",
		}),
		newPassword: z.string({
			required_error: "New password is required",
		}).min(6, "Password must be at least 6 characters long"),
	}),
});

export const AuthValidation = {
	registerCitizenValidationSchema,
	loginValidationSchema,
	verifyEmailValidationSchema,
	refreshTokenValidationSchema,
	googleAuthValidationSchema,
	forgotPasswordValidationSchema,
	resetPasswordValidationSchema,
};

