import { Router } from "express";
import { AssignmentController } from "./assignment.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { AssignmentValidation } from "./assignment.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router();

// Dispatcher assigns work order to technician
router.post(
	"/",
	requirePermission(Action.ASSIGN, Resource.ASSIGNMENT),
	validateRequest(AssignmentValidation.createAssignmentSchema),
	AssignmentController.createAssignment,
);

// Technician views their assignments
router.get(
	"/my-assignments",
	requirePermission(Action.READ, Resource.ASSIGNMENT), // Tech role has this
	AssignmentController.getMyAssignments,
);

// Dispatcher/Admin views all assignments
router.get(
	"/",
	requirePermission(Action.READ, Resource.ASSIGNMENT),
	AssignmentController.getAllAssignments,
);

// Dispatcher views assignments by department
router.get(
	"/department/:departmentId",
	requirePermission(Action.READ, Resource.ASSIGNMENT),
	AssignmentController.getDepartmentAssignments,
);

// View specific assignment
router.get(
	"/:id",
	requirePermission(Action.READ, Resource.ASSIGNMENT),
	AssignmentController.getAssignmentById,
);

// Technician accepts/rejects assignment
router.patch(
	"/:id/status",
	requirePermission(Action.UPDATE, Resource.ASSIGNMENT),
	validateRequest(AssignmentValidation.updateAssignmentStatusSchema),
	AssignmentController.updateAssignmentStatus,
);

// Dispatcher/Lead reassigns assignment
router.patch(
	"/:id/reassign",
	requirePermission(Action.REASSIGN, Resource.ASSIGNMENT),
	validateRequest(AssignmentValidation.reassignAssignmentSchema),
	AssignmentController.reassignAssignment,
);

// Dispatcher revokes assignment
router.patch(
	"/:id/unassign",
	requirePermission(Action.ASSIGN, Resource.ASSIGNMENT),
	AssignmentController.unassignAssignment,
);

export const AssignmentRoutes = router;
