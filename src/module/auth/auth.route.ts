import { Router } from "express";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import { validateRequest } from "../../middleware/validateRequest";
import { requirePermission } from "../../middleware/checkAuth";
import { authRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post(
	"/register-citizen",
	authRateLimiter,
	validateRequest(AuthValidation.registerCitizenValidationSchema),
	AuthController.registerCitizen,
);

router.post(
	"/login",
	authRateLimiter,
	validateRequest(AuthValidation.loginValidationSchema),
	AuthController.login,
);

router.post(
	"/verify-email",
	authRateLimiter,
	validateRequest(AuthValidation.verifyEmailValidationSchema),
	AuthController.verifyEmail,
);

import { Action, Resource } from "../../../generated/prisma/enums";

router.get(
	"/me",
	requirePermission(Action.READ, Resource.PROFILE),
	AuthController.getMe,
);

router.post(
	"/refresh-token",
	validateRequest(AuthValidation.refreshTokenValidationSchema),
	AuthController.refreshToken,
);

router.post(
	"/google",
	validateRequest(AuthValidation.googleAuthValidationSchema),
	AuthController.googleLogin,
);

router.post(
	"/logout",
	AuthController.logout,
);

router.post(
	"/forgot-password",
	authRateLimiter,
	validateRequest(AuthValidation.forgotPasswordValidationSchema),
	AuthController.forgotPassword,
);

router.post(
	"/reset-password",
	authRateLimiter,
	validateRequest(AuthValidation.resetPasswordValidationSchema),
	AuthController.resetPassword,
);

export const AuthRoutes = router;
