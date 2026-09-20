import { Router } from "express";
import { FeedbackController } from "./feedback.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { FeedbackValidation } from "./feedback.validation";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router();

// Citizen submits feedback
router.post(
	"/",
	requirePermission(Action.CREATE, Resource.FEEDBACK),
	validateRequest(FeedbackValidation.createFeedbackSchema),
	FeedbackController.submitFeedback,
);

// Admins view feedback
router.get(
	"/",
	requirePermission(Action.READ, Resource.FEEDBACK),
	FeedbackController.getFeedback,
);

export const FeedbackRoutes = router;
