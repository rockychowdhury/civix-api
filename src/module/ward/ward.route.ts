import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { WardController } from "./ward.controller";
import { WardValidation } from "./ward.validation";

const router = Router();

router.get("/", WardController.getWards);
router.post(
	"/",
	requirePermission(Action.CREATE, Resource.WARD),
	validateRequest(WardValidation.createWardSchema),
	WardController.createWard,
);
router.get("/:wardId", WardController.getWardById);
router.patch(
	"/:wardId",
	requirePermission(Action.UPDATE, Resource.WARD),
	validateRequest(WardValidation.updateWardSchema),
	WardController.updateWard,
);
router.delete(
	"/:wardId",
	requirePermission(Action.DELETE, Resource.WARD),
	WardController.deleteWard,
);

router.get(
	"/:wardId/departments",
	WardController.getWardDepartments,
);

export const WardRoutes = router;
