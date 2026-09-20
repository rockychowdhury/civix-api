import { Router } from "express";
import { ResolutionController } from "./resolution.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { ResolutionValidation } from "./resolution.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router({ mergeParams: true });

// Nested under /work-orders/:workOrderId/resolutions
router.post(
	"/",
	requirePermission(Action.CREATE, Resource.RESOLUTION),
	validateRequest(ResolutionValidation.submitResolutionSchema),
	ResolutionController.submitResolution,
);

// Direct access /resolutions/:id/verify
router.post(
	"/:id/verify",
	requirePermission(Action.VERIFY, Resource.RESOLUTION),
	validateRequest(ResolutionValidation.verifyResolutionSchema),
	ResolutionController.verifyResolution,
);

export const ResolutionRoutes = router;
