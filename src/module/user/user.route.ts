import { Router } from "express";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { UserValidation } from "./user.validation";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";

const router = Router();

// GET /api/v1/users/me - Get own user (requires authentication)
router.get(
	"/me",
	requirePermission(Action.READ, Resource.PROFILE),
	UserController.getMe,
);

// GET /api/v1/users - Admin list users (requires authentication + admin permission)
router.get(
	"/",
	requirePermission(Action.READ, Resource.USER),
	validateRequest(UserValidation.getUsersValidationSchema),
	UserController.getUsers,
);

// GET /api/v1/users/:userId - Get user by ID (requires authentication)
router.get(
	"/:userId",
	requirePermission(Action.READ, Resource.USER),
	validateRequest(UserValidation.getUserByIdValidationSchema),
	UserController.getUserById,
);

// PATCH /api/v1/users/me - Update own basic account data
router.patch(
	"/me",
	requirePermission(Action.UPDATE, Resource.PROFILE),
	validateRequest(UserValidation.updateMeValidationSchema),
	UserController.updateMe,
);

// PATCH /api/v1/users/:userId/status - Change user status (admin only)
router.patch(
	"/:userId/status",
	requirePermission(Action.UPDATE, Resource.USER),
	validateRequest(UserValidation.updateUserStatusValidationSchema),
	UserController.updateUserStatus,
);

// DELETE /api/v1/users/:userId - Admin soft-delete user
router.delete(
	"/:userId",
	requirePermission(Action.DELETE, Resource.USER),
	validateRequest(UserValidation.deleteUserValidationSchema),
	UserController.deleteUser,
);

// User Roles
router.get(
	"/:userId/roles",
	requirePermission(Action.READ, Resource.USER),
	UserController.getUserRoles,
);

router.post(
	"/:userId/roles",
	requirePermission(Action.UPDATE, Resource.USER),
	validateRequest(UserValidation.assignRoleValidationSchema),
	UserController.assignRole,
);

router.delete(
	"/:userId/roles/:roleId",
	requirePermission(Action.UPDATE, Resource.USER),
	UserController.removeRole,
);

export const UserRoutes = router;
