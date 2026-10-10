import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsValidation } from "./analytics.validation";

const router = Router();

// Full system stats overview for Super Admin Dashboard Overview page
router.get(
	"/overview",
	requirePermission(Action.READ, Resource.ALL),
	validateRequest(AnalyticsValidation.systemOverviewQuerySchema),
	AnalyticsController.getSystemOverview,
);

router.get(
	"/super-admin/overview",
	requirePermission(Action.READ, Resource.ALL),
	validateRequest(AnalyticsValidation.systemOverviewQuerySchema),
	AnalyticsController.getSystemOverview,
);

// Department & Ward analytics
router.get(
	"/dashboard",
	requirePermission(Action.READ, Resource.ALL),
	AnalyticsController.getDashboardStats,
);

router.get(
	"/issues-by-department",
	requirePermission(Action.READ, Resource.ALL),
	AnalyticsController.getIssuesByDepartment,
);

router.get(
	"/issues-by-ward",
	requirePermission(Action.READ, Resource.ALL),
	AnalyticsController.getIssuesByWard,
);

export const AnalyticsRoutes = router;
