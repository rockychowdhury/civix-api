import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { PermissionController } from "./permission.controller";

const router = Router();

router.get("/", requirePermission(Action.READ, Resource.PERMISSION), PermissionController.getPermissions);

router.get(
	"/:permissionId",
	requirePermission(Action.READ, Resource.PERMISSION),
	PermissionController.getPermissionById,
);

export const PermissionRoutes = router;

