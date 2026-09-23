import { Router } from "express";
import { CivicIssueController } from "./civic-issue.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { CivicIssueValidation } from "./civic-issue.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router();


router.patch(
	"/:id/status",
	requirePermission(Action.UPDATE, Resource.CIVIC_ISSUE),
	validateRequest(CivicIssueValidation.updateStatusSchema),
	CivicIssueController.updateStatus,
);

router.get(
	"/",
	requirePermission(Action.READ_ALL, Resource.CIVIC_ISSUE),
	CivicIssueController.getCivicIssues,
);

router.get(
	"/public/:issueNumber",
	CivicIssueController.getPublicCivicIssueByNumber,
);

router.get(
	"/municipality/:municipalityId",
	requirePermission(Action.READ, Resource.CIVIC_ISSUE),
	CivicIssueController.getIssuesByMunicipality,
);

router.get(
	"/department/:departmentId",
	requirePermission(Action.READ, Resource.CIVIC_ISSUE),
	CivicIssueController.getIssuesByDepartment,
);

router.get(
	"/:id",
	requirePermission(Action.READ, Resource.CIVIC_ISSUE),
	CivicIssueController.getCivicIssueById,
);

router.post(
	"/:id/reopen",
	requirePermission(Action.REOPEN, Resource.CIVIC_ISSUE),
	validateRequest(CivicIssueValidation.reopenSchema),
	CivicIssueController.reopenCivicIssue,
);

export const CivicIssueRoutes = router;
