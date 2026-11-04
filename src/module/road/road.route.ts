import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { RoadController } from "./road.controller";
import { RoadValidation } from "./road.validation";

const router = Router();

// Public / Citizen endpoint to fetch roads by ward for dropdown
router.get("/ward/:wardId", RoadController.getRoadsByWard);

// Administrative endpoints
router.get(
	"/",
	requirePermission(Action.READ, Resource.LOCATION),
	RoadController.getAllRoads,
);

router.get(
	"/:id",
	requirePermission(Action.READ, Resource.LOCATION),
	RoadController.getRoadById,
);

router.post(
	"/",
	requirePermission(Action.CREATE, Resource.LOCATION),
	validateRequest(RoadValidation.createRoadSchema),
	RoadController.createRoad,
);

router.post(
	"/bulk",
	requirePermission(Action.CREATE, Resource.LOCATION),
	validateRequest(RoadValidation.bulkCreateRoadSchema),
	RoadController.bulkCreateRoads,
);

router.patch(
	"/:id",
	requirePermission(Action.UPDATE, Resource.LOCATION),
	validateRequest(RoadValidation.updateRoadSchema),
	RoadController.updateRoad,
);

router.delete(
	"/:id",
	requirePermission(Action.DELETE, Resource.LOCATION),
	RoadController.deleteRoad,
);

export const RoadRoutes = router;

