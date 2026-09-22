import { Router } from "express";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { UserValidation } from "./user.validation";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission, requireAuth } from "../../middleware/checkAuth";

const router = Router();

router.get(
	"/me",
	requireAuth,
	UserController.getMe,
);

router.get(
	"/",
	requirePermission(Action.READ, Resource.USER),
	validateRequest(UserValidation.getUsersValidationSchema),
	UserController.getUsers,
);

router.get(
	"/:userId",
	requirePermission(Action.READ, Resource.USER),
	validateRequest(UserValidation.getUserByIdValidationSchema),
	UserController.getUserById,
);

router.patch(
	"/me",
	requirePermission(Action.UPDATE, Resource.PROFILE),
	validateRequest(UserValidation.updateMeValidationSchema),
	UserController.updateMe,
);

router.patch(
	"/:userId/status",
	requirePermission(Action.UPDATE, Resource.USER),
	validateRequest(UserValidation.updateUserStatusValidationSchema),
	UserController.updateUserStatus,
);

router.delete(
	"/:userId",
	requirePermission(Action.DELETE, Resource.USER),
	validateRequest(UserValidation.deleteUserValidationSchema),
	UserController.deleteUser,
);

router.patch(
	"/:userId/restore",
	requirePermission(Action.UPDATE, Resource.USER),
	validateRequest(UserValidation.restoreUserValidationSchema),
	UserController.restoreUser,
);

export const UserRoutes = router;
