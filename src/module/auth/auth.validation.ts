import { z } from "zod";

const registerCitizenValidationSchema = z.object({
	body: z.object({
		firstName: z
			.string({
				message: "First name is required",
			})
			.trim(),
		lastName: z
			.string({
				message: "Last name is required",
			})
			.trim(),
		email: z
			.string({
				message: "Email is required",
			})
			.email("Invalid email format")
			.trim()
			.toLowerCase(),
		password: z
			.string({
				message: "Password is required",
			})
			.min(6, "Password must be at least 6 characters long"),
		phone: z.string().trim().optional(),
	}),
});

const loginValidationSchema = z.object({
	body: z.object({
		email: z
			.string({
				message: "Email is required",
			})
			.email("Invalid email format")
			.trim()
			.toLowerCase(),
		password: z.string({
			message: "Password is required",
		}),
	}),
});

const verifyEmailValidationSchema = z.object({
	body: z.object({
		email: z
			.string({
				message: "Email is required",
			})
			.email("Invalid email format")
			.trim()
			.toLowerCase(),
		otp: z
			.string({
				message: "OTP is required",
			})
			.min(4, "OTP must be at least 4 characters long")
			.trim(),
	}),
});

const refreshTokenValidationSchema = z.object({
	cookies: z.object({
		refreshToken: z.string({
			message: "Refresh token is required in cookies",
		}),
	}),
});

const googleAuthValidationSchema = z.object({
	body: z.object({
		idToken: z.string({
			message: "Google ID Token is required",
		}),
	}),
});

const forgotPasswordValidationSchema = z.object({
	body: z.object({
		email: z
			.string({
				message: "Email is required",
			})
			.email("Invalid email format")
			.trim()
			.toLowerCase(),
	}),
});

const resetPasswordValidationSchema = z.object({
	body: z.object({
		email: z
			.string({
				message: "Email is required",
			})
			.email("Invalid email format")
			.trim()
			.toLowerCase(),
		otp: z.string({
			message: "OTP is required",
		}),
		newPassword: z
			.string({
				message: "New password is required",
			})
			.min(6, "Password must be at least 6 characters long"),
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
