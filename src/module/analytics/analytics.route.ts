import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router();

// Only CITY_ADMIN or SUPER_ADMIN or Dispatchers should view overall analytics
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
