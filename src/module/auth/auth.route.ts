import { Router } from "express";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import { validateRequest } from "../../middleware/validateRequest";
import { requirePermission } from "../../middleware/checkAuth";

const router = Router();

router.post(
	"/register-citizen",
	validateRequest(AuthValidation.registerCitizenValidationSchema),
	AuthController.registerCitizen,
);

router.post(
	"/login",
	validateRequest(AuthValidation.loginValidationSchema),
	AuthController.login,
);

router.post(
	"/verify-email",
	validateRequest(AuthValidation.verifyEmailValidationSchema),
	AuthController.verifyEmail,
);

router.get("/me", requirePermission("read", "profile"), AuthController.getMe);

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
	"/forgot-password",
	validateRequest(AuthValidation.forgotPasswordValidationSchema),
	AuthController.forgotPassword,
);

router.post(
	"/reset-password",
	validateRequest(AuthValidation.resetPasswordValidationSchema),
	AuthController.resetPassword,
);

export const AuthRoutes = router;
