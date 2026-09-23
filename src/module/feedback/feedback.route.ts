import { Router } from "express";
import { FeedbackController } from "./feedback.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { FeedbackValidation } from "./feedback.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router();

router.post(
	"/",
	requirePermission(Action.CREATE, Resource.FEEDBACK),
	validateRequest(FeedbackValidation.createFeedbackSchema),
	FeedbackController.submitFeedback,
);

router.get(
	"/",
	requirePermission(Action.READ_ALL, Resource.FEEDBACK),
	FeedbackController.getFeedback,
);

router.get(
	"/municipality/:municipalityId",
	requirePermission(Action.READ, Resource.FEEDBACK),
	FeedbackController.getMunicipalityFeedback,
);

router.get(
	"/department/:departmentId",
	requirePermission(Action.READ, Resource.FEEDBACK),
	FeedbackController.getDepartmentFeedback,
);

router.get(
	"/:id",
	requirePermission(Action.READ, Resource.FEEDBACK),
	FeedbackController.getFeedbackById,
);

export const FeedbackRoutes = router;
