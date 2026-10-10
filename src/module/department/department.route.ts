import express from "express";
import { DepartmentController } from "./department.controller";
import { DepartmentValidation } from "./department.validation";
import { requireAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

const router = express.Router();

router.get("/", requireAuth, DepartmentController.getDepartments);

router.get(
	"/:id/overview",
	requireAuth,
	DepartmentController.getDepartmentOverview,
);

router.get("/:id", requireAuth, DepartmentController.getDepartmentById);


router.post(
	"/",
	requireAuth,
	validateRequest(DepartmentValidation.createDepartmentSchema),
	DepartmentController.createDepartment,
);

router.patch(
	"/:id",
	requireAuth,
	validateRequest(DepartmentValidation.updateDepartmentSchema),
	DepartmentController.updateDepartment,
);

router.post(
	"/:id/service-areas",
	requireAuth,
	validateRequest(DepartmentValidation.addServiceAreaSchema),
	DepartmentController.addServiceArea,
);

router.delete(
	"/:id/service-areas/:areaId",
	requireAuth,
	validateRequest(DepartmentValidation.removeServiceAreaSchema),
	DepartmentController.removeServiceArea,
);

export const DepartmentRoutes = router;
