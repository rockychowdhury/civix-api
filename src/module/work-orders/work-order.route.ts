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
	requirePermission(Action.READ_ALL, Resource.WORK_ORDER),
	WorkOrderController.getWorkOrders,
);

router.get(
	"/municipality/:municipalityId",
	requirePermission(Action.READ, Resource.WORK_ORDER),
	WorkOrderController.getWorkOrdersByMunicipality,
);

router.get(
	"/department/:departmentId",
	requirePermission(Action.READ, Resource.WORK_ORDER),
	WorkOrderController.getWorkOrdersByDepartment,
);

router.get(
	"/my-work-orders",
	requirePermission(Action.READ, Resource.WORK_ORDER),
	WorkOrderController.getMyWorkOrders,
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

router.patch(
	"/:id/quick-action",
	requirePermission(Action.UPDATE, Resource.WORK_ORDER),
	validateRequest(WorkOrderValidation.quickActionSchema),
	WorkOrderController.quickActionWorkOrder,
);

export const WorkOrderRoutes = router;
