import { Router } from "express";
import { WorkOrderController } from "./work-order.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { WorkOrderValidation } from "./work-order.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";
import { WorkUpdateRoutes } from "../work-updates/work-update.route";
import { ResolutionRoutes } from "../resolutions/resolution.route";

const router = Router();

// Nested routes
router.use("/:workOrderId/updates", WorkUpdateRoutes);
router.use("/:workOrderId/resolutions", ResolutionRoutes);

router.post(
	"/",
	requirePermission(Action.CREATE, Resource.WORK_ORDER),
	validateRequest(WorkOrderValidation.createWorkOrderSchema),
	WorkOrderController.createWorkOrder,
);

router.get(
	"/",
	requirePermission(Action.READ, Resource.WORK_ORDER),
	WorkOrderController.getWorkOrders,
);

router.get(
	"/:id",
	requirePermission(Action.READ, Resource.WORK_ORDER),
	WorkOrderController.getWorkOrderById,
);

router.patch(
	"/:id/status",
	requirePermission(Action.UPDATE, Resource.WORK_ORDER),
	validateRequest(WorkOrderValidation.updateWorkOrderStatusSchema),
	WorkOrderController.updateWorkOrderStatus,
);

export const WorkOrderRoutes = router;
