import { Router } from "express";
import { CivicIssueController } from "./civic-issue.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { CivicIssueValidation } from "./civic-issue.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router();

// Triage SR -> Civic Issue
router.post(
	"/triage",
	requirePermission(Action.CREATE, Resource.CIVIC_ISSUE),
	validateRequest(CivicIssueValidation.triageSchema),
	CivicIssueController.triageServiceRequest,
);

// Merge SR -> existing Civic Issue
router.post(
	"/:id/merge",
	requirePermission(Action.MERGE, Resource.CIVIC_ISSUE),
	validateRequest(CivicIssueValidation.mergeSchema),
	CivicIssueController.mergeServiceRequest,
);

// Manually update status
router.patch(
	"/:id/status",
	requirePermission(Action.UPDATE, Resource.CIVIC_ISSUE),
	validateRequest(CivicIssueValidation.updateStatusSchema),
	CivicIssueController.updateStatus,
);

// List Issues (Dashboards)
router.get(
	"/",
	requirePermission(Action.READ, Resource.CIVIC_ISSUE),
	CivicIssueController.getCivicIssues,
);

// View Issue Details
router.get(
	"/:id",
	requirePermission(Action.READ, Resource.CIVIC_ISSUE),
	CivicIssueController.getCivicIssueById,
);

// Reopen a resolved/closed Civic Issue
router.post(
	"/:id/reopen",
	requirePermission(Action.REOPEN, Resource.CIVIC_ISSUE),
	validateRequest(CivicIssueValidation.reopenSchema),
	CivicIssueController.reopenCivicIssue,
);

export const CivicIssueRoutes = router;
