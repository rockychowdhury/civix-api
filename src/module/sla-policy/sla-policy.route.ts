import express from "express";
import { SlaPolicyController } from "./sla-policy.controller";
import { SlaPolicyValidation } from "./sla-policy.validation";
import { requireAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

const router = express.Router();

router.get(
	"/",
	requireAuth,
	validateRequest(SlaPolicyValidation.getSlaPolicySchema),
	SlaPolicyController.getSlaPolicies,
);

router.post(
	"/",
	requireAuth,
	validateRequest(SlaPolicyValidation.createSlaPolicySchema),
	SlaPolicyController.createSlaPolicy,
);

router.patch(
	"/:id",
	requireAuth,
	validateRequest(SlaPolicyValidation.updateSlaPolicySchema),
	SlaPolicyController.updateSlaPolicy,
);

router.delete("/:id", requireAuth, SlaPolicyController.deleteSlaPolicy);

export const SlaPolicyRoutes = router;
