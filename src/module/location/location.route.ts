import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { LocationController } from "./location.controller";
import { LocationValidation } from "./location.validation";

const router = Router();

router.get(
	"/nearby",
	requirePermission(Action.READ, Resource.LOCATION),
	LocationController.getNearbyLocations,
);
router.post(
	"/",
	requirePermission(Action.CREATE, Resource.LOCATION),
	validateRequest(LocationValidation.createLocationSchema),
	LocationController.createLocation,
);
router.get(
	"/:locationId",
	requirePermission(Action.READ, Resource.LOCATION),
	LocationController.getLocationById,
);
router.patch(
	"/:locationId",
	requirePermission(Action.UPDATE, Resource.LOCATION),
	validateRequest(LocationValidation.updateLocationSchema),
	LocationController.updateLocation,
);
router.get(
	"/:locationId/ward",
	requirePermission(Action.READ, Resource.LOCATION),
	LocationController.resolveLocationWard,
);

export const LocationRoutes = router;
