import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ZoneController } from "./zone.controller";
import { ZoneValidation } from "./zone.validation";

const router = Router();

router.get("/", ZoneController.getZones);
router.post(
	"/",
	requirePermission(Action.CREATE, Resource.ZONE),
	validateRequest(ZoneValidation.createZoneSchema),
	ZoneController.createZone,
);
router.get("/:zoneId", ZoneController.getZoneById);
router.patch(
	"/:zoneId",
	requirePermission(Action.UPDATE, Resource.ZONE),
	validateRequest(ZoneValidation.updateZoneSchema),
	ZoneController.updateZone,
);
router.delete(
	"/:zoneId",
	requirePermission(Action.DELETE, Resource.ZONE),
	ZoneController.deleteZone,
);

router.get("/:zoneId/wards", ZoneController.getZoneWards);

export const ZoneRoutes = router;
