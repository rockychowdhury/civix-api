import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { RoleController } from "./role.controller";
import { RoleValidation } from "./role.validation";

const router = Router();

router.get("/", requirePermission(Action.READ, Resource.ROLE), RoleController.getRoles);

router.post(
	"/",
	requirePermission(Action.CREATE, Resource.ROLE),
	validateRequest(RoleValidation.createRoleSchema),
	RoleController.createRole,
);

router.get("/:roleId", requirePermission(Action.READ, Resource.ROLE), RoleController.getRoleById);

router.patch(
	"/:roleId",
	requirePermission(Action.UPDATE, Resource.ROLE),
	validateRequest(RoleValidation.updateRoleSchema),
	RoleController.updateRole,
);

router.delete("/:roleId", requirePermission(Action.DELETE, Resource.ROLE), RoleController.deleteRole);

router.get(
	"/:roleId/permissions",
	requirePermission(Action.READ, Resource.ROLE),
	RoleController.getRolePermissions,
);

router.put(
	"/:roleId/permissions",
	requirePermission(Action.UPDATE, Resource.ROLE),
	validateRequest(RoleValidation.replaceRolePermissionsSchema),
	RoleController.replaceRolePermissions,
);

export const RoleRoutes = router;

