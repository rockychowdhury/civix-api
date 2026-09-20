import { Router } from "express";
import { WorkUpdateController } from "./work-update.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { WorkUpdateValidation } from "./work-update.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router({ mergeParams: true }); // Allows access to parent route params like :workOrderId

router.post(
	"/",
	requirePermission(Action.UPDATE, Resource.WORK_ORDER), // Technician updating their work order
	validateRequest(WorkUpdateValidation.createWorkUpdateSchema),
	WorkUpdateController.createWorkUpdate,
);

export const WorkUpdateRoutes = router;
