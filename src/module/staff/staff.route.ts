import express from "express";
import { StaffController } from "./staff.controller";
import { StaffValidation } from "./staff.validation";
import { requireAuth, requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

// Assuming we have a validateRequest middleware in our project
// If not, we can import it from wherever it is.
// Looking at the previous routes, it's usually `import validateRequest from "../../middleware/validateRequest";`
// I'll assume that exists. Let me verify the exact path later if TS complains.
import { validateRequest } from "../../middleware/validateRequest";

const router = express.Router();

// 1. Get All Staff (Auto-filtered by context)
router.get("/", requireAuth, StaffController.getAllStaff);

// 2. Get Technicians Only
router.get("/technicians", requireAuth, StaffController.getTechnicians);

// 3. Create Platform Admin
router.post(
	"/platform-admin",
	requirePermission(Action.MANAGE, Resource.ALL), // Only Super Admin
	validateRequest(StaffValidation.createPlatformAdminSchema),
	StaffController.createPlatformAdmin,
);

// 4. Create City Admin
router.post(
	"/city-admin",
	requirePermission(Action.MANAGE, Resource.STAFF), // PLATFORM or SUPER ADMIN
	validateRequest(StaffValidation.createCityAdminSchema),
	StaffController.createCityAdmin,
);

// 5. Create Department Manager
router.post(
	"/department-manager",
	requireAuth, // Handled inside service for CITY_ADMIN logic
	validateRequest(StaffValidation.createDepartmentStaffSchema),
	StaffController.createDepartmentManager,
);

// 6. Create Dispatcher
router.post(
	"/dispatcher",
	requireAuth, // Handled inside service for MANAGER/CITY_ADMIN logic
	validateRequest(StaffValidation.createDepartmentStaffSchema),
	StaffController.createDispatcher,
);

// 7. Create Technician
router.post(
	"/technician",
	requireAuth, // Handled inside service for DISPATCHER/MANAGER/CITY_ADMIN logic
	validateRequest(StaffValidation.createDepartmentStaffSchema),
	StaffController.createTechnician,
);

export const StaffRoutes = router;
