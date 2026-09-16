import { Router } from "express";
import { ServiceRequestController } from "./service-request.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { ServiceRequestValidation } from "./service-request.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router();

// Citizen Routes
router.post(
	"/",
	requirePermission(Action.CREATE, Resource.SERVICE_REQUEST),
	validateRequest(ServiceRequestValidation.createServiceRequestSchema),
	ServiceRequestController.createServiceRequest,
);

router.get(
	"/my-requests",
	requirePermission(Action.READ, Resource.SERVICE_REQUEST),
	ServiceRequestController.getMyServiceRequests,
);

// Admin/Dispatcher Routes
router.get(
	"/",
	requirePermission(Action.READ, Resource.SERVICE_REQUEST),
	ServiceRequestController.getAllServiceRequests,
);

// Shared (handled inside logic or if permission matches)
router.get(
	"/:id",
	requirePermission(Action.READ, Resource.SERVICE_REQUEST),
	ServiceRequestController.getServiceRequestById,
);

export const ServiceRequestRoutes = router;
